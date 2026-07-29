import { getChatGPTUser } from "../../chatgpt-auth";
import {
  createCandidateFromResume,
  createResumeRecords,
  findCandidateDuplicate,
  getResumeRecords,
  listJobs,
  listResumeRecords,
  updateCandidateFromReview,
  updateResumeRecord,
} from "../../../db/repository";
import { getResumeBucket } from "../../../db/storage";
import {
  type ParsedResume,
  scoreResume,
} from "../../lib/resume-processing";

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
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
  };
}

function serializeResumeDetail(
  record: Awaited<ReturnType<typeof getResumeRecords>>[number],
) {
  return {
    ...serializeResume(record),
    parsedData: record.parsedData,
    candidateId: record.candidateId,
    duplicateOf: record.duplicateOf,
    extractedText: record.extractedText?.slice(0, 12000) ?? "",
  };
}

function safeFileName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120) || "resume";
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const records = await getResumeRecords([id]);
    if (!records[0]) {
      return Response.json({ error: "简历记录不存在" }, { status: 404 });
    }
    const jobs = await listJobs();
    return Response.json({
      file: serializeResumeDetail(records[0]),
      jobs: jobs.map((job) => job.role),
    });
  }
  const records = await listResumeRecords();
  return Response.json({ files: records.map(serializeResume) });
}

function initials(name: string) {
  return name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase() || "NA";
}

function reviewRisk(parsed: ParsedResume) {
  const notes = [];
  if (!parsed.phone) notes.push("手机号仍待补充");
  if (!parsed.email) notes.push("邮箱仍待补充");
  if (!parsed.years) notes.push("工作年限仍待确认");
  return notes.length ? notes.join("；") : "核心字段已经人工校正，建议面试时核验关键项目经历。";
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    role?: string;
    parsedData?: Partial<ParsedResume>;
  };
  if (!body.id || !body.role || !body.parsedData?.name?.trim()) {
    return Response.json(
      { error: "简历、目标岗位和候选人姓名不能为空" },
      { status: 400 },
    );
  }
  const [records, jobs, user] = await Promise.all([
    getResumeRecords([body.id]),
    listJobs(),
    getChatGPTUser(),
  ]);
  const record = records[0];
  const job = jobs.find((item) => item.role === body.role);
  if (!record || !job) {
    return Response.json({ error: "简历记录或岗位标准不存在" }, { status: 404 });
  }
  const original = (record.parsedData ?? {}) as Partial<ParsedResume>;
  const parsed: ParsedResume = {
    name: body.parsedData.name.trim(),
    phone: body.parsedData.phone?.trim() ?? original.phone ?? "",
    email: body.parsedData.email?.trim() ?? original.email ?? "",
    city: body.parsedData.city?.trim() ?? original.city ?? "",
    education: body.parsedData.education?.trim() ?? original.education ?? "学历待确认",
    school: body.parsedData.school?.trim() ?? original.school ?? "院校待确认",
    years: Math.max(0, Math.min(50, Number(body.parsedData.years ?? original.years ?? 0))),
    currentCompany:
      body.parsedData.currentCompany?.trim() ??
      original.currentCompany ??
      "当前公司待确认",
    currentTitle:
      body.parsedData.currentTitle?.trim() ??
      original.currentTitle ??
      "当前职位待确认",
    skills: body.parsedData.skills ?? original.skills ?? [],
    highlights: body.parsedData.highlights ?? original.highlights ?? [],
  };
  const duplicate = await findCandidateDuplicate(parsed.name, parsed.phone);
  if (duplicate && duplicate.id !== record.candidateId) {
    const updated = await updateResumeRecord(record.id, {
      targetRole: job.role,
      parsedData: parsed,
      status: "重复投递",
      result: "已跳过",
      duplicateOf: duplicate.id,
    });
    return Response.json({
      file: updated ? serializeResumeDetail(updated) : null,
      duplicate: { id: duplicate.id, name: duplicate.name },
    });
  }

  const scoringText = [
    record.extractedText ?? "",
    parsed.skills.join(" "),
    parsed.highlights.join(" "),
    parsed.currentCompany,
    parsed.currentTitle,
    parsed.education,
    `${parsed.years} 年经验`,
  ].join("\n");
  const scored = scoreResume(parsed, scoringText, job);
  const candidateValues = {
    name: parsed.name,
    initials: initials(parsed.name),
    role: job.role,
    score: scored.score,
    status: scored.status,
    tone: scored.tone,
    school: `${parsed.school} · ${parsed.education}`,
    company: `${parsed.currentCompany} · ${parsed.currentTitle}`,
    experience: parsed.years ? `${parsed.years} 年` : "待确认",
    phone: parsed.phone,
    email: parsed.email,
    city: parsed.city,
    currentTitle: parsed.currentTitle,
    highlights: parsed.highlights.length
      ? parsed.highlights
      : scored.matchedDimensions.map((item) => `${item}相关经历已确认`).slice(0, 3),
    risk: reviewRisk(parsed),
  };
  const now = new Date();
  const candidate = record.candidateId
    ? await updateCandidateFromReview(
        record.candidateId,
        candidateValues,
        user?.email ?? null,
      )
    : await createCandidateFromResume({
        id: crypto.randomUUID(),
        ...candidateValues,
        channel: "人工校正",
        ownerEmail: user?.email ?? null,
        createdAt: now,
        updatedAt: now,
      });
  if (!candidate) {
    return Response.json({ error: "候选人台账更新失败" }, { status: 500 });
  }
  const updated = await updateResumeRecord(record.id, {
    targetRole: job.role,
    parsedData: {
      ...parsed,
      failedGates: scored.failedGates,
      matchedDimensions: scored.matchedDimensions,
    },
    candidateId: candidate.id,
    duplicateOf: null,
    status: scored.failedGates.length ? "硬门槛淘汰" : "已完成",
    score: scored.score,
    result: scored.result,
    errorMessage: null,
  });
  return Response.json({
    file: updated ? serializeResumeDetail(updated) : null,
    candidate,
  });
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
