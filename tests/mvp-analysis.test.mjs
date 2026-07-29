import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveCandidateProfile,
  deriveInterviewQuestions,
} from "../app/lib/job-analysis.ts";
import {
  analyzeCandidateProfile,
  normalizeModelProfile,
} from "../app/lib/ai-job-analysis.ts";
import {
  buildResumeTags,
  parseResumeText,
  scoreResume,
} from "../app/lib/resume-processing.ts";

const job = {
  role: "高级产品经理",
  department: "产品与增长部",
  jdText:
    "负责 B 端 SaaS 产品规划与跨部门推进，要求本科及以上、5 年产品经验，能够使用数据分析进行决策，有 0→1 项目经验优先。",
  gates: ["本科及以上学历", "5 年以上相关经验", "具备 B 端或企业服务经验"],
  interviewDimensions: ["产品判断", "业务洞察", "数据分析", "协作影响力", "求职动机"],
};

test("derives a focused candidate profile from the JD", () => {
  const profile = deriveCandidateProfile(job);
  assert.match(profile.summary, /高级产品经理/);
  assert.equal(profile.experience, "5 年以上相关经验");
  assert.equal(profile.education, "本科及以上");
  assert.ok(profile.backgrounds.includes("B 端 / 企业服务背景"));
  assert.ok(profile.capabilities.includes("产品判断"));
  assert.ok(profile.bonusSignals.includes("有 0→1 项目经验"));
  assert.deepEqual(profile.verificationPoints, job.gates);
  assert.match(profile.mission, /B 端 SaaS 产品规划/);
  assert.deepEqual(profile.mustHaves, job.gates);
  assert.ok(profile.targetTitles.includes("产品经理"));
  assert.ok(profile.searchKeywords.includes("B 端 / 企业服务背景"));
  assert.ok(profile.capabilityDetails.every((item) => item.why && item.evidence));
  assert.ok(profile.redFlags.length >= 2);
  assert.ok(profile.openQuestions.some((item) => item.includes("汇报")));
  assert.equal(profile.analysisMeta.source, "rules");
  assert.equal(profile.successOutcomes.length, 3);
  assert.ok(profile.jdEvidence.length >= 2);
});

test("normalizes a structured model profile and records model provenance", () => {
  const fallback = deriveCandidateProfile(job);
  const profile = normalizeModelProfile(
    {
      summary: "寻找能把企业服务产品从需求洞察推进到规模化交付的高级产品经理。",
      hiringRationale: "团队需要补足复杂 B 端产品的端到端负责人。",
      mission: "主导企业服务产品规划并推动核心客户价值落地。",
      experience: "5-8 年产品经验，其中至少 3 年 B 端 SaaS 经验",
      education: "本科及以上，可由强项目证据替代",
      seniority: "资深个人贡献者或小型项目负责人",
      backgrounds: ["企业服务 SaaS", "复杂多角色产品"],
      capabilities: ["产品判断", "业务洞察"],
      capabilityDetails: [
        {
          name: "产品判断",
          priority: "核心",
          why: "需要在多方诉求中识别高价值问题。",
          evidence: "能还原取舍过程及上线后的业务结果。",
        },
      ],
      mustHaves: ["5 年以上产品经验"],
      bonusSignals: ["有 0→1 经验"],
      verificationPoints: ["个人职责边界"],
      targetTitles: ["高级产品经理"],
      searchKeywords: ["B2B", "SaaS"],
      redFlags: ["只讲功能交付"],
      openQuestions: ["首个半年目标是什么？"],
      successOutcomes: ["90 天形成产品路线图"],
      companyArchetypes: ["服务中大型客户的 SaaS 公司"],
      tradeoffs: ["强业务成果可替代部分行业年限"],
      jdEvidence: [
        {
          conclusion: "需要 B 端经验",
          evidence: "负责 B 端 SaaS 产品规划",
          confidence: "高",
        },
      ],
    },
    fallback,
    "gpt-5.6-sol",
  );

  assert.equal(profile.analysisMeta.source, "model");
  assert.equal(profile.analysisMeta.model, "gpt-5.6-sol");
  assert.match(profile.hiringRationale, /端到端负责人/);
  assert.equal(profile.capabilityDetails[0].priority, "核心");
  assert.equal(profile.jdEvidence[0].confidence, "高");
});

test("calls the Responses API with structured output when a key is configured", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousProvider = process.env.AI_PROVIDER;
  const previousFetch = globalThis.fetch;
  let requestBody;
  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  ...deriveCandidateProfile(job),
                  analysisMeta: undefined,
                  summary: "模型生成的高级产品经理画像",
                }),
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const profile = await analyzeCandidateProfile(job);
    assert.equal(profile.analysisMeta.source, "model");
    assert.equal(profile.summary, "模型生成的高级产品经理画像");
    assert.equal(profile.analysisMeta.model, "OpenAI · gpt-5.6-sol");
    assert.equal(requestBody.model, "gpt-5.6-sol");
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.text.format.type, "json_schema");
    assert.equal(requestBody.text.format.strict, true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
  }
});

test("uses Volcengine Ark when it is selected", async () => {
  const previousKey = process.env.ARK_API_KEY;
  const previousModel = process.env.ARK_MODEL;
  const previousProvider = process.env.AI_PROVIDER;
  const previousFetch = globalThis.fetch;
  let requestBody;
  process.env.AI_PROVIDER = "volcengine";
  process.env.ARK_API_KEY = "ark-test-key";
  process.env.ARK_MODEL = "doubao-seed-2-0-lite-260215";
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://ark.cn-beijing.volces.com/api/v3/responses");
    assert.equal(init?.headers.authorization, "Bearer ark-test-key");
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  ...deriveCandidateProfile(job),
                  analysisMeta: undefined,
                  summary: "豆包生成的高级产品经理画像",
                }),
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const profile = await analyzeCandidateProfile(job);
    assert.equal(profile.analysisMeta.source, "model");
    assert.equal(profile.summary, "豆包生成的高级产品经理画像");
    assert.equal(
      profile.analysisMeta.model,
      "火山方舟 · doubao-seed-2-0-lite-260215",
    );
    assert.equal(requestBody.model, "doubao-seed-2-0-lite-260215");
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.text.format.type, "json_schema");
    assert.equal(requestBody.reasoning, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.ARK_API_KEY;
    else process.env.ARK_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.ARK_MODEL;
    else process.env.ARK_MODEL = previousModel;
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
  }
});

test("creates six structured interview questions tied to the role", () => {
  const questions = deriveInterviewQuestions(job);
  assert.equal(questions.length, 6);
  assert.ok(questions.every((item) => item.question && item.focus && item.followUp));
  assert.match(questions[0].question, /高级产品经理/);
  assert.match(questions[4].question, /本科及以上学历/);
});

test("extracts resume fields and produces useful screening tags", () => {
  const text = `姓名：林栩
手机：13800138000
邮箱：linxu@example.com
所在城市：上海
浙江大学 本科
工作年限：7
当前公司：某某科技公司
当前职位：高级产品经理
负责 B 端 SaaS 产品规划、需求分析和数据分析，主导项目核心指标提升 42%。`;
  const parsed = parseResumeText(text, "林栩-高级产品经理.pdf");
  const scored = scoreResume(parsed, text, {
    role: job.role,
    gates: job.gates,
    weights: [["产品判断", 30], ["业务洞察", 25], ["数据分析", 25], ["协作影响力", 20]],
  });
  const tags = buildResumeTags(parsed, scored.matchedDimensions);

  assert.equal(parsed.name, "林栩");
  assert.equal(parsed.school, "浙江大学");
  assert.ok(tags.includes("浙江大学"));
  assert.ok(tags.includes("本科"));
  assert.ok(tags.includes("7 年经验"));
  assert.ok(tags.includes("数据分析"));
  assert.ok(scored.score >= 60);
});
