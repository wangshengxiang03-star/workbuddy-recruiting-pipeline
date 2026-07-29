import {
  deriveCandidateProfile,
  type CandidateProfile,
  type JobAnalysisInput,
} from "./job-analysis.ts";

const DEFAULT_OPENAI_MODEL = "gpt-5.6-sol";
const DEFAULT_ARK_MODEL = "doubao-seed-2-0-lite-260215";

type ModelProvider = {
  id: "openai" | "volcengine";
  apiKey: string;
  endpoint: string;
  model: string;
  displayName: string;
};

function configuredProvider(): ModelProvider | null {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  const arkKey = process.env.ARK_API_KEY?.trim();
  const openAIKey = process.env.OPENAI_API_KEY?.trim();

  if (requested === "volcengine") {
    return arkKey
      ? {
          id: "volcengine",
          apiKey: arkKey,
          endpoint: "https://ark.cn-beijing.volces.com/api/v3/responses",
          model: process.env.ARK_MODEL?.trim() || DEFAULT_ARK_MODEL,
          displayName: "火山方舟",
        }
      : null;
  }
  if (requested === "openai") {
    return openAIKey
      ? {
          id: "openai",
          apiKey: openAIKey,
          endpoint: "https://api.openai.com/v1/responses",
          model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
          displayName: "OpenAI",
        }
      : null;
  }
  if (arkKey) {
    return {
      id: "volcengine",
      apiKey: arkKey,
      endpoint: "https://ark.cn-beijing.volces.com/api/v3/responses",
      model: process.env.ARK_MODEL?.trim() || DEFAULT_ARK_MODEL,
      displayName: "火山方舟",
    };
  }
  if (openAIKey) {
    return {
      id: "openai",
      apiKey: openAIKey,
      endpoint: "https://api.openai.com/v1/responses",
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
      displayName: "OpenAI",
    };
  }
  return null;
}

const stringArray = {
  type: "array",
  items: { type: "string" },
} as const;

const profileSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "hiringRationale",
    "mission",
    "experience",
    "education",
    "seniority",
    "backgrounds",
    "capabilities",
    "capabilityDetails",
    "mustHaves",
    "bonusSignals",
    "verificationPoints",
    "targetTitles",
    "searchKeywords",
    "redFlags",
    "openQuestions",
    "successOutcomes",
    "companyArchetypes",
    "tradeoffs",
    "jdEvidence",
  ],
  properties: {
    summary: { type: "string" },
    hiringRationale: { type: "string" },
    mission: { type: "string" },
    experience: { type: "string" },
    education: { type: "string" },
    seniority: { type: "string" },
    backgrounds: stringArray,
    capabilities: stringArray,
    capabilityDetails: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "priority", "why", "evidence"],
        properties: {
          name: { type: "string" },
          priority: { type: "string", enum: ["核心", "重要", "辅助"] },
          why: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    mustHaves: stringArray,
    bonusSignals: stringArray,
    verificationPoints: stringArray,
    targetTitles: stringArray,
    searchKeywords: stringArray,
    redFlags: stringArray,
    openQuestions: stringArray,
    successOutcomes: stringArray,
    companyArchetypes: stringArray,
    tradeoffs: stringArray,
    jdEvidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["conclusion", "evidence", "confidence"],
        properties: {
          conclusion: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "string", enum: ["高", "中", "低"] },
        },
      },
    },
  },
} as const;

type ResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function outputText(payload: ResponsePayload) {
  if (payload.output_text) return payload.output_text;
  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text" && item.text)?.text ?? ""
  );
}

function cleanArray(value: unknown, fallback: string[], limit = 12) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return cleaned.length ? [...new Set(cleaned)].slice(0, limit) : fallback;
}

export function normalizeModelProfile(
  value: unknown,
  fallback: CandidateProfile,
  model = DEFAULT_OPENAI_MODEL,
): CandidateProfile {
  const data = value && typeof value === "object" ? value as Partial<CandidateProfile> : {};
  const capabilityDetails = Array.isArray(data.capabilityDetails)
    ? data.capabilityDetails
        .filter((item) => item && typeof item.name === "string")
        .map((item) => ({
          name: item.name.trim(),
          priority: ["核心", "重要", "辅助"].includes(item.priority)
            ? item.priority
            : "重要" as const,
          why: typeof item.why === "string" ? item.why.trim() : "",
          evidence: typeof item.evidence === "string" ? item.evidence.trim() : "",
        }))
        .filter((item) => item.name && item.why && item.evidence)
        .slice(0, 8)
    : [];
  const jdEvidence = Array.isArray(data.jdEvidence)
    ? data.jdEvidence
        .filter((item) => item && typeof item.conclusion === "string")
        .map((item) => ({
          conclusion: item.conclusion.trim(),
          evidence: typeof item.evidence === "string" ? item.evidence.trim() : "",
          confidence: ["高", "中", "低"].includes(item.confidence)
            ? item.confidence
            : "中" as const,
        }))
        .filter((item) => item.conclusion && item.evidence)
        .slice(0, 10)
    : [];
  const text = (key: keyof CandidateProfile) => {
    const candidate = data[key];
    return typeof candidate === "string" && candidate.trim()
      ? candidate.trim()
      : String(fallback[key]);
  };
  return {
    ...fallback,
    analysisMeta: {
      source: "model",
      model,
      generatedAt: new Date().toISOString(),
      warning: "",
    },
    summary: text("summary"),
    hiringRationale: text("hiringRationale"),
    mission: text("mission"),
    experience: text("experience"),
    education: text("education"),
    seniority: text("seniority"),
    backgrounds: cleanArray(data.backgrounds, fallback.backgrounds, 8),
    capabilities: cleanArray(data.capabilities, fallback.capabilities, 8),
    capabilityDetails: capabilityDetails.length
      ? capabilityDetails
      : fallback.capabilityDetails,
    mustHaves: cleanArray(data.mustHaves, fallback.mustHaves, 8),
    bonusSignals: cleanArray(data.bonusSignals, fallback.bonusSignals, 8),
    verificationPoints: cleanArray(
      data.verificationPoints,
      fallback.verificationPoints,
      8,
    ),
    targetTitles: cleanArray(data.targetTitles, fallback.targetTitles, 10),
    searchKeywords: cleanArray(data.searchKeywords, fallback.searchKeywords, 16),
    redFlags: cleanArray(data.redFlags, fallback.redFlags, 8),
    openQuestions: cleanArray(data.openQuestions, fallback.openQuestions, 8),
    successOutcomes: cleanArray(
      data.successOutcomes,
      fallback.successOutcomes,
      6,
    ),
    companyArchetypes: cleanArray(
      data.companyArchetypes,
      fallback.companyArchetypes,
      8,
    ),
    tradeoffs: cleanArray(data.tradeoffs, fallback.tradeoffs, 6),
    jdEvidence: jdEvidence.length ? jdEvidence : fallback.jdEvidence,
  };
}

function fallbackWithWarning(job: JobAnalysisInput, warning: string) {
  const profile = deriveCandidateProfile(job);
  return {
    ...profile,
    analysisMeta: {
      ...profile.analysisMeta,
      warning,
    },
  };
}

export async function analyzeCandidateProfile(
  job: JobAnalysisInput,
  options?: { modelAllowed?: boolean; limitWarning?: string },
): Promise<CandidateProfile> {
  const provider = configuredProvider();
  if (!provider) {
    return fallbackWithWarning(
      job,
      "生产环境尚未配置所选模型服务的密钥，本次使用规则降级。",
    );
  }
  if (options?.modelAllowed === false) {
    return fallbackWithWarning(
      job,
      options.limitWarning || "今日模型体验次数已用完，本次使用规则降级。",
    );
  }

  const fallback = deriveCandidateProfile(job);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);
  try {
    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model,
        store: false,
        ...(provider.id === "openai"
          ? { reasoning: { effort: "medium" } }
          : { thinking: { type: "disabled" } }),
        text: {
          ...(provider.id === "openai" ? { verbosity: "high" } : {}),
          format: {
            type: "json_schema",
            name: "candidate_profile",
            strict: true,
            schema: profileSchema,
          },
        },
        instructions: `你是一名资深招聘负责人和人才画像顾问。把岗位 JD 转化为可直接用于人才寻访、简历筛选和用人经理校准的候选人画像。

要求：
1. 只依据输入材料推断，不得虚构公司内部事实；不确定的信息放入 openQuestions。
2. 区分 mustHaves 与 bonusSignals，避免把所有偏好都写成硬门槛。
3. capabilityDetails 必须写清为什么重要，以及简历或面试中可观察到的证据。
4. successOutcomes 描述入职 30/90/180 天应形成的结果。
5. companyArchetypes 描述目标公司类型、业务阶段和场景，不虚构具体公司。
6. tradeoffs 说明人才市场中哪些条件可互相替代或放宽。
7. jdEvidence 的 evidence 必须引用或紧贴 JD 原文，不得编造；confidence 反映推断强度。
8. 使用专业、具体、可执行的中文，避免空泛词语和重复。`,
        input: `岗位名称：${job.role}
所属部门：${job.department}

岗位 JD：
${job.jdText}

补充招聘要求：
${job.supplementalRequirements || "无"}

规则预提取硬门槛：
${job.gates.map((item) => `- ${item}`).join("\n")}

规则预提取考察维度：
${job.interviewDimensions.map((item) => `- ${item}`).join("\n")}`,
      }),
    });
    const payload = await response.json() as ResponsePayload;
    if (!response.ok) {
      throw new Error(payload.error?.message || `模型请求失败（${response.status}）`);
    }
    const text = outputText(payload);
    if (!text) throw new Error("模型没有返回结构化画像");
    return normalizeModelProfile(
      JSON.parse(text),
      fallback,
      `${provider.displayName} · ${provider.model}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知模型错误";
    return fallbackWithWarning(job, `模型分析暂不可用，已自动降级：${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export function modelAnalysisConfigured() {
  return configuredProvider() !== null;
}
