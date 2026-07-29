import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  claimModelAnalysisQuota,
  createCandidateFromResume,
  findCandidateDuplicate,
  getResumeRecords,
  listJobs,
  updateResumeRecord,
} from "../../../../db/repository";
import { getResumeBucket } from "../../../../db/storage";
import { modelAnalysisConfigured } from "../../../lib/ai-job-analysis";
import { analyzeResumeWithModel } from "../../../lib/ai-resume-analysis";
import {
  extractResumeText,
  parseResumeText,
} from "../../../lib/resume-processing";

export const runtime = "nodejs";
export const maxDuration = 300;

function selectJob(
  jobs: Awaited<ReturnType<typeof listJobs>>,
  targetRole: string | null,
  fileName: string,
  text: string,
) {
  if (targetRole) {
    const exact = jobs.find((job) => job.role === targetRole);
    if (exact) return exact;
  }
  const haystack = `${fileName}\n${text.slice(0, 4000)}`.toLowerCase();
  const exactRole = jobs.find((job) => haystack.includes(job.role.toLowerCase()));
  if (exactRole) return exactRole;
  const roleHints: Array<[RegExp, string[]]> = [
    [/产品|需求|saas|b\s*端/i, ["产品"]],
    [/增长|投放|转化|运营/i, ["增长"]],
    [/招聘|人力|人才/i, ["招聘", "人力"]],
  ];
  for (const [pattern, roleWords] of roleHints) {
    if (!pattern.test(haystack)) continue;
    const found = jobs.find((job) => roleWords.some((word) => job.role.includes(word)));
    if (found) return found;
  }
  return jobs[0];
}

function initials(name: string) {
  const value = name.replace(/[^\p{L}\p{N}]/gu, "");
  return value.slice(0, 3).toUpperCase() || "NA";
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
  const records = await getResumeRecords(body.ids);
  const pending = records.filter((record) =>
    ["已入库", "解析失败", "需人工处理", "待 OCR"].includes(record.status),
  );
  if (!pending.length) {
    return Response.json({ processed: [], message: "没有待处理的简历" });
  }

  const [jobs, user] = await Promise.all([listJobs(), getChatGPTUser()]);
  if (!jobs.length) {
    return Response.json({ error: "请先创建岗位标准" }, { status: 409 });
  }
  const bucket = getResumeBucket();
  const processed = [];
  const requestVisitorKey = await visitorKey(request);

  for (const record of pending) {
    try {
      await updateResumeRecord(record.id, {
        status: "文本解析",
        result: "处理中",
        errorMessage: null,
      });
      const object = await bucket.get(record.storageKey);
      if (!object) throw new Error("未找到已入库的简历文件");
      const bytes = new Uint8Array(await object.arrayBuffer());
      const text = await extractResumeText(bytes, record.originalName, record.contentType);
      if (text.replace(/\s/g, "").length < 30) {
        throw new Error("可提取文本过少，可能是扫描件，请转入 OCR 或人工处理");
      }

      const parsed = parseResumeText(text, record.originalName);
      const duplicate = await findCandidateDuplicate(parsed.name, parsed.phone);
      if (duplicate) {
        const updated = await updateResumeRecord(record.id, {
          status: "重复投递",
          result: "已跳过",
          extractedText: text.slice(0, 50000),
          parsedData: parsed,
          duplicateOf: duplicate.id,
          targetRole: duplicate.role,
        });
        processed.push(updated);
        continue;
      }

      const job = selectJob(jobs, record.targetRole, record.originalName, text);
      const modelAllowed = modelAnalysisConfigured()
        ? await claimModelAnalysisQuota(requestVisitorKey)
        : true;
      const analyzed = await analyzeResumeWithModel(parsed, text, job, {
        modelAllowed,
        limitWarning: "该访客今日的模型体验次数已用完，本份简历使用规则降级。",
      });
      const enriched = analyzed.parsed;
      const now = new Date();
      const candidateId = crypto.randomUUID();
      const candidate = await createCandidateFromResume({
        id: candidateId,
        name: enriched.name,
        initials: initials(enriched.name),
        role: job.role,
        score: analyzed.score,
        status: analyzed.status,
        tone: analyzed.tone,
        school: `${enriched.school} · ${enriched.education}`,
        company: `${enriched.currentCompany} · ${enriched.currentTitle}`,
        experience: enriched.years ? `${enriched.years} 年` : "待确认",
        channel: "批量上传",
        phone: enriched.phone,
        email: enriched.email,
        city: enriched.city,
        currentTitle: enriched.currentTitle,
        highlights: analyzed.strengths,
        risk: analyzed.risks.join("；"),
        ownerEmail: user?.email ?? null,
        createdAt: now,
        updatedAt: now,
      });
      const updated = await updateResumeRecord(record.id, {
        status: analyzed.failedGates.length ? "硬门槛淘汰" : "已完成",
        score: analyzed.score,
        result: analyzed.result,
        extractedText: text.slice(0, 50000),
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
        targetRole: job.role,
      });
      processed.push(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "简历解析失败";
      const isOcr = message.includes("OCR") || message.includes("扫描件");
      const updated = await updateResumeRecord(record.id, {
        status: isOcr ? "待 OCR" : "需人工处理",
        result: isOcr ? "等待识别" : "解析失败",
        errorMessage: message,
      });
      processed.push(updated);
    }
  }

  return Response.json({
    processed: processed.filter(Boolean),
    summary: {
      total: processed.length,
      completed: processed.filter((item) => item?.status === "已完成").length,
      duplicates: processed.filter((item) => item?.status === "重复投递").length,
      manual: processed.filter((item) =>
        ["待 OCR", "需人工处理"].includes(item?.status ?? ""),
      ).length,
    },
  });
}
