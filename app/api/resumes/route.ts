import { getChatGPTUser } from "../../chatgpt-auth";
import { createResumeRecords, listResumeRecords } from "../../../db/repository";
import { getResumeBucket } from "../../../db/storage";

export const runtime = "edge";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_BATCH_FILES = 100;
const allowedExtensions = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"]);

function serializeResume(
  record: Awaited<ReturnType<typeof listResumeRecords>>[number],
) {
  return {
    id: record.id,
    batchId: record.batchId,
    name: record.originalName,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    role: record.targetRole ?? "待识别岗位",
    status: record.status,
    score: record.score,
    result: record.result ?? "等待解析",
    createdAt: record.createdAt.toISOString(),
  };
}

function safeFileName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120) || "resume";
}

export async function GET() {
  const records = await listResumeRecords();
  return Response.json({ files: records.map(serializeResume) });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);

  if (!files.length || files.length > MAX_BATCH_FILES) {
    return Response.json(
      { error: `每批需上传 1-${MAX_BATCH_FILES} 份简历` },
      { status: 400 },
    );
  }

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.has(extension)) {
      return Response.json(
        { error: `${file.name} 的格式不受支持` },
        { status: 400 },
      );
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: `${file.name} 必须小于 15MB 且不能为空` },
        { status: 400 },
      );
    }
  }

  const user = await getChatGPTUser();
  const bucket = getResumeBucket();
  const batchId = crypto.randomUUID();
  const datePrefix = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const storedKeys: string[] = [];

  try {
    const records = [];
    for (const file of files) {
      const id = crypto.randomUUID();
      const storageKey = `${datePrefix}/${batchId}/${id}-${safeFileName(file.name)}`;
      await bucket.put(storageKey, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
        customMetadata: {
          originalName: encodeURIComponent(file.name),
          uploadedBy: user?.email ?? "private-site-user",
        },
      });
      storedKeys.push(storageKey);
      records.push({
        id,
        batchId,
        originalName: file.name,
        storageKey,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        status: "已入库",
        result: "等待解析",
        uploadedBy: user?.email ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const created = await createResumeRecords(records);
    return Response.json(
      { batchId, files: created.map(serializeResume) },
      { status: 201 },
    );
  } catch (error) {
    await Promise.allSettled(storedKeys.map((key) => bucket.delete(key)));
    console.error("Resume upload failed", error);
    return Response.json({ error: "简历入库失败，请稍后重试" }, { status: 500 });
  }
}
