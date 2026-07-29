import {
  modelAnalysisConfigured,
  requestStructuredModel,
  type ModelRequestOptions,
} from "./ai-job-analysis.ts";
import {
  deriveInterviewQuestions,
  type CandidateProfile,
  type JobAnalysisInput,
} from "./job-analysis.ts";

export type InterviewQuestion = {
  category: string;
  question: string;
  focus: string;
  followUp: string;
  scoreGuide: string[];
};

export type InterviewQuestionSet = {
  analysisMeta: {
    source: "model" | "rules" | "demo";
    model: string;
    generatedAt: string;
    warning: string;
  };
  questions: InterviewQuestion[];
};

const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "question", "focus", "followUp", "scoreGuide"],
        properties: {
          category: { type: "string" },
          question: { type: "string" },
          focus: { type: "string" },
          followUp: { type: "string" },
          scoreGuide: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

function ruleQuestionSet(job: JobAnalysisInput, warning: string): InterviewQuestionSet {
  return {
    analysisMeta: {
      source: "rules",
      model: "本地规则引擎",
      generatedAt: new Date().toISOString(),
      warning,
    },
    questions: deriveInterviewQuestions(job).map((item) => ({
      ...item,
      scoreGuide: [
        "优秀：回答具体，能说明个人判断、行动与量化结果",
        "合格：经历相关，但方法或个人贡献说明不够充分",
        "待验证：回答泛化，缺少事实、数据或可追问证据",
      ],
    })),
  };
}

function normalizeQuestions(
  value: unknown,
  job: JobAnalysisInput,
  model: string,
): InterviewQuestionSet {
  const questions =
    value && typeof value === "object" && Array.isArray((value as { questions?: unknown }).questions)
      ? (value as { questions: Array<Record<string, unknown>> }).questions
          .map((item) => ({
            category: typeof item.category === "string" ? item.category.trim() : "",
            question: typeof item.question === "string" ? item.question.trim() : "",
            focus: typeof item.focus === "string" ? item.focus.trim() : "",
            followUp: typeof item.followUp === "string" ? item.followUp.trim() : "",
            scoreGuide: Array.isArray(item.scoreGuide)
              ? item.scoreGuide
                  .filter((guide): guide is string => typeof guide === "string")
                  .map((guide) => guide.trim())
                  .filter(Boolean)
                  .slice(0, 3)
              : [],
          }))
          .filter(
            (item) =>
              item.category &&
              item.question &&
              item.focus &&
              item.followUp &&
              item.scoreGuide.length === 3,
          )
          .slice(0, 8)
      : [];
  if (questions.length < 6) {
    return ruleQuestionSet(job, "模型返回的题目不完整，本次使用规则降级。");
  }
  return {
    analysisMeta: {
      source: "model",
      model,
      generatedAt: new Date().toISOString(),
      warning: "",
    },
    questions,
  };
}

export async function analyzeInterviewQuestions(
  job: JobAnalysisInput,
  profile: CandidateProfile,
  options?: ModelRequestOptions,
): Promise<InterviewQuestionSet> {
  if (!modelAnalysisConfigured()) {
    return ruleQuestionSet(job, "生产环境尚未配置模型密钥，本次使用规则降级。");
  }
  if (options?.modelAllowed === false) {
    return ruleQuestionSet(
      job,
      options.limitWarning || "今日模型体验次数已用完，本次使用规则降级。",
    );
  }
  try {
    const result = await requestStructuredModel<unknown>({
      schema: questionSchema,
      schemaName: "interview_question_set",
      instructions: `你是一名资深面试官。根据岗位 JD 和候选人画像，生成 8 道可直接用于正式面试的结构化问题。

要求：
1. 必须覆盖：求职动机、专业能力、简历/经历深挖、业务场景、软素质、硬门槛核验。
2. 问题必须结合本岗位的具体职责、指标、工具或业务场景，禁止通用套话。
3. 每题包含一个能够继续验证真实性和思考深度的 followUp。
4. focus 写清考察点；scoreGuide 固定提供优秀、合格、待验证三个层级的可观察标准。
5. 不预设候选人拥有 JD 未提供的经历，不虚构公司内部信息。
6. 使用专业、自然、可直接口头提问的中文。`,
      input: `岗位名称：${job.role}
所属部门：${job.department}

岗位 JD：
${job.jdText}

补充要求：
${job.supplementalRequirements || "无"}

硬门槛：
${job.gates.map((item) => `- ${item}`).join("\n")}

核心考察维度：
${job.interviewDimensions.map((item) => `- ${item}`).join("\n")}

候选人画像摘要：
${profile.summary}

核心能力：
${profile.capabilityDetails
  .map((item) => `- ${item.name}（${item.priority}）：${item.why}`)
  .join("\n")}

主要风险信号：
${profile.redFlags.map((item) => `- ${item}`).join("\n")}`,
    });
    return normalizeQuestions(result.value, job, result.model);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知模型错误";
    return ruleQuestionSet(job, `模型出题暂不可用，已自动降级：${message}`);
  }
}
