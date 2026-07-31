import { getChatGPTUser } from "../../chatgpt-auth";
import {
  claimModelAnalysisQuota,
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
import { modelAnalysisConfigured } from "../../lib/ai-job-analysis";
import { analyzeResumeWithModel } from "../../lib/ai-resume-analysis";
import {
  buildResumeTags,
  type ParsedResume,
} from "../../lib/resume-processing";

export const runtime = "edge";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_BATCH_FILES = 100;
const allowedExtensions = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"]);

function serializeResume(
  record: Awaited<ReturnType<typeof listResumeRecords>>[number],
) {
  const parsed = (record.parsedData ?? {}) as Partial<ParsedResume> & {
    tags?: string[];
    matchedDimensions?: string[];
    strengths?: string[];
    risks?: string[];
    recommendation?: string;
    analysisMeta?: {
      source?: "model" | "rules";
      model?: string;
      generatedAt?: string;
      warning?: string;
    };
  };
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
    tags:
      parsed.tags ??
      buildResumeTags(parsed, parsed.matchedDimensions ?? []),
    strengths: parsed.strengths ?? parsed.highlights ?? [],
    risks: parsed.risks ?? [],
    recommendation: parsed.recommendation ?? "",
    analysisMeta: parsed.analysisMeta ?? {
      source: "rules",
      model: "本地规则引擎",
      generatedAt: record.updatedAt.toISOString(),
      warning: "该记录尚未经过模型初筛。",
    },
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

async function visitorKey(request: Request) {
  const raw = [
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown",
    request.headers.get("user-agent") || "unknown",
  ].join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  const modelAllowed = modelAnalysisConfigured()
    ? await claimModelAnalysisQuota(await visitorKey(request))
    : true;
  const analyzed = await analyzeResumeWithModel(parsed, scoringText, job, {
    modelAllowed,
    limitWarning: "该访客今日的模型体验次数已用完，本次校正使用规则降级。",
  });
  const enriched = analyzed.parsed;
  const candidateValues = {
    name: enriched.name,
    initials: initials(enriched.name),
    role: job.role,
    score: analyzed.score,
    status: analyzed.status,
    tone: analyzed.tone,
    school: `${enriched.school} · ${enriched.education}`,
    company: `${enriched.currentCompany} · ${enriched.currentTitle}`,
    experience: enriched.years ? `${enriched.years} 年` : "待确认",
    phone: enriched.phone,
    email: enriched.email,
    city: enriched.city,
    currentTitle: enriched.currentTitle,
    highlights: analyzed.strengths,
    risk: analyzed.risks.join("；") || reviewRisk(enriched),
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
      ...enriched,
      analysisMeta: analyzed.analysisMeta,
      failedGates: analyzed.failedGates,
      gateEvidence: analyzed.gateEvidence,
      matchedDimensions: analyzed.matchedDimensions,
      tags: analyzed.tags,
      strengths: analyzed.strengths,
      risks: analyzed.risks,
      recommendation: analyzed.recommendation,
    },
    candidateId: candidate.id,
    duplicateOf: null,
    status: analyzed.failedGates.length ? "硬门槛淘汰" : "已完成",
    score: analyzed.score,
    result: analyzed.result,
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
  const targetRole = String(formData.get("targetRole") ?? "").trim();

  if (!files.length || files.length > MAX_BATCH_FILES) {
    return Response.json(
      { error: `每批需上传 1-${MAX_BATCH_FILES} 份简历` },
      { status: 400 },
    );
  }

  const jobs = await listJobs();
  if (!targetRole) {
    return Response.json(
      { error: "请先选择岗位后再上传简历；如果刚更新过页面，请刷新后重试" },
      { status: 400 },
    );
  }
  const selectedJob = jobs.find((job) => job.role === targetRole);
  if (!selectedJob) {
    return Response.json({ error: "目标岗位不存在，请刷新页面后重试" }, { status: 400 });
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
        targetRole: selectedJob.role,
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
