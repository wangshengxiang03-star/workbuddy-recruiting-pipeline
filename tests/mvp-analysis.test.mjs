import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveCandidateProfile,
  deriveInterviewQuestions,
} from "../app/lib/job-analysis.ts";
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
