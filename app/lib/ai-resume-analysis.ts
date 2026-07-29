import {
  modelAnalysisConfigured,
  requestStructuredModel,
  type ModelRequestOptions,
} from "./ai-job-analysis.ts";
import {
  buildResumeTags,
  type ParsedResume,
  scoreResume,
} from "./resume-processing.ts";

type ResumeJob = {
  role: string;
  department: string;
  jdText: string;
  supplementalRequirements: string;
  gates: string[];
  weights: Array<[string, number]>;
  interviewDimensions: string[];
};

export type ResumeAnalysisResult = {
  analysisMeta: {
    source: "model" | "rules";
    model: string;
    generatedAt: string;
    warning: string;
  };
  parsed: ParsedResume;
  score: number;
  status: string;
  tone: string;
  result: string;
  tags: string[];
  strengths: string[];
  risks: string[];
  failedGates: string[];
  gateEvidence: Array<{ gate: string; evidence: string }>;
  matchedDimensions: string[];
  recommendation: string;
};

const resumeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "school",
    "education",
    "years",
    "currentCompany",
    "currentTitle",
    "city",
    "skills",
    "highlights",
    "tags",
    "strengths",
    "risks",
    "failedGates",
    "matchedDimensions",
    "score",
    "recommendation",
  ],
  properties: {
    school: { type: "string" },
    education: { type: "string" },
    years: { type: "number" },
    currentCompany: { type: "string" },
    currentTitle: { type: "string" },
    city: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    failedGates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["gate", "evidence"],
        properties: {
          gate: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    matchedDimensions: { type: "array", items: { type: "string" } },
    score: { type: "number", minimum: 0, maximum: 100 },
    recommendation: { type: "string" },
  },
} as const;

function stringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  )].slice(0, limit);
}

function statusForScore(score: number, failedGates: string[]) {
  if (failedGates.length) {
    return { score: Math.min(score, 39), status: "淘汰", tone: "muted", result: "硬门槛淘汰" };
  }
  if (score >= 80) return { score, status: "强推荐", tone: "green", result: "强推荐" };
  if (score >= 60) return { score, status: "可面试", tone: "blue", result: "可面试" };
  if (score >= 40) return { score, status: "人才储备", tone: "amber", result: "人才储备" };
  return { score, status: "淘汰", tone: "muted", result: "淘汰" };
}

function fallbackResumeAnalysis(
  parsed: ParsedResume,
  text: string,
  job: ResumeJob,
  warning: string,
): ResumeAnalysisResult {
  const scored = scoreResume(parsed, text, job);
  const risks = [
    !parsed.phone ? "未识别到手机号" : "",
    !parsed.email ? "未识别到邮箱" : "",
    !parsed.years ? "工作年限待确认" : "",
  ].filter(Boolean);
  return {
    analysisMeta: {
      source: "rules",
      model: "本地规则引擎",
      generatedAt: new Date().toISOString(),
      warning,
    },
    parsed,
    score: scored.score,
    status: scored.status,
    tone: scored.tone,
    result: scored.result,
    tags: buildResumeTags(parsed, scored.matchedDimensions),
    strengths: parsed.highlights.length
      ? parsed.highlights
      : scored.matchedDimensions.map((item) => `${item}相关经历已识别`).slice(0, 3),
    risks: risks.length ? risks : ["建议面试时核验关键项目的个人贡献与量化结果"],
    failedGates: scored.failedGates,
    gateEvidence: scored.failedGates.map((gate) => ({
      gate,
      evidence: "规则解析未识别到满足该硬门槛的明确证据",
    })),
    matchedDimensions: scored.matchedDimensions,
    recommendation: scored.failedGates.length
      ? `不建议进入面试：${scored.failedGates.join("、")}未通过。`
      : `建议结合${scored.matchedDimensions.join("、") || "岗位核心能力"}进一步人工复筛。`,
  };
}

export async function analyzeResumeWithModel(
  parsed: ParsedResume,
  text: string,
  job: ResumeJob,
  options?: ModelRequestOptions,
): Promise<ResumeAnalysisResult> {
  if (!modelAnalysisConfigured()) {
    return fallbackResumeAnalysis(
      parsed,
      text,
      job,
      "生产环境尚未配置模型密钥，本次使用规则降级。",
    );
  }
  if (options?.modelAllowed === false) {
    return fallbackResumeAnalysis(
      parsed,
      text,
      job,
      options.limitWarning || "今日模型体验次数已用完，本次使用规则降级。",
    );
  }

  const ruleResult = fallbackResumeAnalysis(parsed, text, job, "");
  try {
    const result = await requestStructuredModel<Record<string, unknown>>({
      schema: resumeSchema,
      schemaName: "resume_screening",
      instructions: `你是一名严谨的招聘初筛专家。根据岗位 JD、硬门槛和简历原文，输出可审计的结构化初筛结果。

要求：
1. 只能依据简历明确证据，不得臆测候选人的学校、公司、年限、能力或成果；无法确认时写“待确认”。
2. 对每一项硬门槛逐项核验。明确不满足或没有足够证据时，写入 failedGates，并给出对应简历证据或“未找到明确证据”。
3. score 为 0-100 的岗位匹配分；存在 failedGates 时不得超过 39 分。
4. tags 应包含学校、学历、经验、业务背景、工具技能、核心能力等短标签，最多 10 个。
5. strengths 必须具体描述候选人的项目、职责或量化成果；risks 必须是需要复筛核验的事实缺口或风险。
6. recommendation 用 1-2 句话说明是否建议进入面试以及最需要核验的内容。
7. 不因年龄、性别、婚育、民族等与工作无关的信息加减分。`,
      input: `目标岗位：${job.role}
所属部门：${job.department}

岗位 JD：
${job.jdText}

补充要求：
${job.supplementalRequirements || "无"}

硬门槛：
${job.gates.map((gate) => `- ${gate}`).join("\n")}

评分维度与权重：
${job.weights.map(([name, weight]) => `- ${name}：${weight}%`).join("\n")}

规则预解析字段（仅供校验，冲突时以简历原文为准）：
${JSON.stringify(parsed)}

简历原文：
${text.slice(0, 24000)}`,
    });
    const data = result.value;
    const gateEvidence = Array.isArray(data.failedGates)
      ? data.failedGates
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            gate: typeof (item as { gate?: unknown }).gate === "string"
              ? (item as { gate: string }).gate.trim()
              : "",
            evidence: typeof (item as { evidence?: unknown }).evidence === "string"
              ? (item as { evidence: string }).evidence.trim()
              : "",
          }))
          .filter((item) => item.gate)
          .slice(0, job.gates.length)
      : [];
    const failedGates = [...new Set([
      ...ruleResult.failedGates,
      ...gateEvidence.map((item) => item.gate),
    ])];
    const parsedFromModel: ParsedResume = {
      ...parsed,
      city:
        typeof data.city === "string" && data.city.trim() && data.city !== "待确认"
          ? data.city.trim()
          : parsed.city,
      school:
        typeof data.school === "string" && data.school.trim() && data.school !== "待确认"
          ? data.school.trim()
          : parsed.school,
      education:
        typeof data.education === "string" &&
        data.education.trim() &&
        data.education !== "待确认"
          ? data.education.trim()
          : parsed.education,
      years: Math.max(
        parsed.years,
        Math.min(50, Number.isFinite(Number(data.years)) ? Number(data.years) : 0),
      ),
      currentCompany:
        typeof data.currentCompany === "string" &&
        data.currentCompany.trim() &&
        data.currentCompany !== "待确认"
          ? data.currentCompany.trim()
          : parsed.currentCompany,
      currentTitle:
        typeof data.currentTitle === "string" &&
        data.currentTitle.trim() &&
        data.currentTitle !== "待确认"
          ? data.currentTitle.trim()
          : parsed.currentTitle,
      skills: stringArray(data.skills, 12).length
        ? stringArray(data.skills, 12)
        : parsed.skills,
      highlights: stringArray(data.highlights, 5).length
        ? stringArray(data.highlights, 5)
        : parsed.highlights,
    };
    const rawScore = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)));
    const disposition = statusForScore(rawScore, failedGates);
    const matchedDimensions = stringArray(data.matchedDimensions, 8);
    const modelTags = stringArray(data.tags, 10);
    return {
      analysisMeta: {
        source: "model",
        model: result.model,
        generatedAt: new Date().toISOString(),
        warning: "",
      },
      parsed: parsedFromModel,
      ...disposition,
      tags: [...new Set([
        ...buildResumeTags(parsedFromModel, matchedDimensions),
        ...modelTags,
      ])].slice(0, 10),
      strengths: stringArray(data.strengths, 5).length
        ? stringArray(data.strengths, 5)
        : parsedFromModel.highlights,
      risks: stringArray(data.risks, 6).length
        ? stringArray(data.risks, 6)
        : ruleResult.risks,
      failedGates,
      gateEvidence,
      matchedDimensions,
      recommendation:
        typeof data.recommendation === "string" && data.recommendation.trim()
          ? data.recommendation.trim()
          : ruleResult.recommendation,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知模型错误";
    return fallbackResumeAnalysis(
      parsed,
      text,
      job,
      `模型初筛暂不可用，已自动降级：${message}`,
    );
  }
}
