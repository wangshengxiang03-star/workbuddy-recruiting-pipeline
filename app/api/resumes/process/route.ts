import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  createCandidateFromResume,
  findCandidateDuplicate,
  getResumeRecords,
  listJobs,
  updateResumeRecord,
} from "../../../../db/repository";
import { getResumeBucket } from "../../../../db/storage";
import {
  buildResumeTags,
  extractResumeText,
  parseResumeText,
  scoreResume,
} from "../../../lib/resume-processing";

export const runtime = "edge";

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

function buildRisk(parsed: ReturnType<typeof parseResumeText>) {
  const risks = [];
  if (!parsed.phone) risks.push("未识别到手机号，需人工补充后才能执行双重去重");
  if (!parsed.email) risks.push("未识别到邮箱");
  if (!parsed.years) risks.push("工作年限待确认");
  if (!parsed.currentCompany || parsed.currentCompany.includes("待确认")) {
    risks.push("当前公司与职位需人工确认");
  }
  return risks.length ? risks.join("；") : "暂未发现明显信息缺口，建议面试时核验关键经历。";
}

function initials(name: string) {
  const value = name.replace(/[^\p{L}\p{N}]/gu, "");
  return value.slice(0, 3).toUpperCase() || "NA";
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
      const scored = scoreResume(parsed, text, job);
      const now = new Date();
      const candidateId = crypto.randomUUID();
      const candidate = await createCandidateFromResume({
        id: candidateId,
        name: parsed.name,
        initials: initials(parsed.name),
        role: job.role,
        score: scored.score,
        status: scored.status,
        tone: scored.tone,
        school: `${parsed.school} · ${parsed.education}`,
        company: `${parsed.currentCompany} · ${parsed.currentTitle}`,
        experience: parsed.years ? `${parsed.years} 年` : "待确认",
        channel: "批量上传",
        phone: parsed.phone,
        email: parsed.email,
        city: parsed.city,
        currentTitle: parsed.currentTitle,
        highlights:
          parsed.highlights.length > 0
            ? parsed.highlights
            : scored.matchedDimensions.map((item) => `${item}相关经历已识别`).slice(0, 3),
        risk: buildRisk(parsed),
        ownerEmail: user?.email ?? null,
        createdAt: now,
        updatedAt: now,
      });
      const updated = await updateResumeRecord(record.id, {
        status: scored.failedGates.length ? "硬门槛淘汰" : "已完成",
        score: scored.score,
        result: scored.result,
        extractedText: text.slice(0, 50000),
        parsedData: {
          ...parsed,
          failedGates: scored.failedGates,
          matchedDimensions: scored.matchedDimensions,
          tags: buildResumeTags(parsed, scored.matchedDimensions),
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
