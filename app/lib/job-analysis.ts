export type JobAnalysisInput = {
  role: string;
  department: string;
  jdText: string;
  supplementalRequirements?: string;
  gates: string[];
  interviewDimensions: string[];
};

export type CandidateProfile = {
  summary: string;
  mission: string;
  experience: string;
  education: string;
  seniority: string;
  backgrounds: string[];
  capabilities: string[];
  capabilityDetails: Array<{
    name: string;
    priority: "核心" | "重要" | "辅助";
    why: string;
    evidence: string;
  }>;
  mustHaves: string[];
  bonusSignals: string[];
  verificationPoints: string[];
  targetTitles: string[];
  searchKeywords: string[];
  redFlags: string[];
  openQuestions: string[];
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function extractResponsibility(jd: string, role: string, department: string) {
  const line = jd
    .split(/\n|。|；|;/)
    .map((item) => item.replace(/^[-*•\d.\s]+/, "").trim())
    .find((item) => /负责|主导|搭建|推动|制定|规划/.test(item) && item.length >= 8);
  return line
    ? line.replace(/^岗位职责[:：]?/, "")
    : `在${department}承担${role}的核心工作，并对关键业务结果负责`;
}

function roleTitles(role: string) {
  if (/产品/.test(role)) return unique([role, "产品经理", "高级产品经理", "产品负责人"]);
  if (/增长/.test(role)) return unique([role, "增长经理", "增长策略专家", "用户增长负责人"]);
  if (/招聘|人才/.test(role)) return unique([role, "招聘运营", "招聘经理", "人才运营负责人"]);
  if (/运营/.test(role)) return unique([role, "运营经理", "高级运营", "运营负责人"]);
  if (/销售|商务/.test(role)) return unique([role, "销售经理", "大客户经理", "商务负责人"]);
  if (/研发|工程|开发/.test(role)) return unique([role, "高级工程师", "技术负责人", "研发经理"]);
  return unique([role, `高级${role}`, `${role}负责人`]);
}

export function deriveCandidateProfile(job: JobAnalysisInput): CandidateProfile {
  const jd = `${job.jdText}\n${job.supplementalRequirements ?? ""}`.trim();
  const normalized = jd.toLowerCase();
  const years = jd.match(/(\d+)\s*年(?:以上)?(?:相关)?(?:工作|从业|产品|增长|招聘)?经验/)?.[1];
  const education = /硕士|研究生/.test(jd)
    ? "硕士及以上优先"
    : /本科|学士/.test(jd)
      ? "本科及以上"
      : "学历不限，以实际能力为主";

  const backgrounds = unique([
    /b\s*端|企业服务|saas/i.test(normalized) ? "B 端 / 企业服务背景" : "",
    /互联网|平台|电商|内容/.test(jd) ? "互联网平台经验" : "",
    /增长|投放|转化|留存/.test(jd) ? "增长与商业化经验" : "",
    /招聘|人力|人才/.test(jd) ? "招聘与人才运营经验" : "",
    /管理|负责人|带领|团队/.test(jd) ? "团队管理或项目负责人经历" : "",
  ]);

  const capabilities = unique([
    ...job.interviewDimensions.filter((item) => item !== "求职动机"),
    /数据|指标|sql|分析/i.test(normalized) ? "数据分析与决策" : "",
    /沟通|协作|跨部门|推动/.test(jd) ? "跨团队协作与推动" : "",
    /方案|规划|策略|设计/.test(jd) ? "策略规划与方案设计" : "",
  ]).slice(0, 6);

  const mission = extractResponsibility(job.jdText, job.role, job.department);
  const seniority = /负责人|总监|管理|带领|团队/.test(jd)
    ? "能够独立负责复杂业务，并具备团队或关键项目领导能力"
    : years && Number(years) >= 5
      ? "资深个人贡献者，可独立负责完整模块"
      : "成熟执行者，能在明确目标下独立交付";

  const bonusSignals = unique([
    /从\s*0\s*到\s*1|0\s*[-→到]\s*1/.test(jd) ? "有 0→1 项目经验" : "",
    /管理|负责人|带领|团队/.test(jd) ? "有带团队或复杂项目经验" : "",
    /英语|英文|海外/.test(jd) ? "具备英语或海外业务能力" : "",
    /ai|人工智能|大模型/i.test(normalized) ? "有 AI 产品或应用经验" : "",
  ]);

  const capabilityDetails = capabilities.map((name, index) => ({
    name,
    priority: index < 2 ? "核心" as const : index < 4 ? "重要" as const : "辅助" as const,
    why: index < 2
      ? `直接决定候选人能否承担「${mission.slice(0, 28)}」`
      : `支持候选人在${job.department}稳定推进工作并形成结果`,
    evidence: /数据/.test(name)
      ? "能说明指标口径、分析过程、关键判断和量化结果"
      : /协作|推进|领导/.test(name)
        ? "能还原复杂协作中的个人动作、阻力处理和最终结果"
        : "有完整案例，能讲清目标、方法、个人贡献与复盘",
  }));

  const targetTitles = roleTitles(job.role);
  const mustHaves = unique(job.gates).slice(0, 6);
  const searchKeywords = unique([
    ...targetTitles,
    ...backgrounds,
    ...capabilities.slice(0, 4),
    /saas/i.test(normalized) ? "SaaS" : "",
    /ai|人工智能|大模型/i.test(normalized) ? "AI / 大模型" : "",
  ]).slice(0, 12);
  const openQuestions = unique([
    !/汇报|直属上级|report/i.test(jd) ? "该岗位向谁汇报，核心协作对象有哪些？" : "",
    !/目标|指标|okr|kpi|结果/.test(normalized) ? "入职 3-6 个月最重要的业务结果是什么？" : "",
    !/团队规模|团队人数|带领\d+人/.test(jd) ? "团队规模、人员配置和管理职责是否明确？" : "",
    !/薪资|预算|薪酬/.test(jd) ? "岗位预算与职级范围是什么？" : "",
    !/地点|城市|办公|远程/.test(jd) ? "工作地点、出勤与远程政策是什么？" : "",
  ]).slice(0, 5);
  const redFlags = unique([
    years ? `履历年限满足，但无法举证与${job.role}直接相关的完整项目` : "经历描述宽泛，缺少可验证的个人贡献",
    "只描述团队成绩，无法说明本人承担的职责与关键判断",
    /数据|指标/.test(jd) ? "项目成果缺少数据口径或量化结果" : "项目成果缺少明确业务结果",
    /管理|负责人|带领|团队/.test(jd) ? "管理范围与岗位要求不匹配，或没有真实带队案例" : "",
  ]);

  return {
    summary: `寻找一位${years ? `具备 ${years} 年以上相关经验、` : ""}能够在${job.department}独立承担核心工作的${job.role}。`,
    mission,
    experience: years ? `${years} 年以上相关经验` : "以相关项目深度和岗位胜任力为主",
    education,
    seniority,
    backgrounds: backgrounds.length ? backgrounds : ["与岗位业务场景相近的工作背景"],
    capabilities: capabilities.length ? capabilities : ["岗位专业能力", "问题分析", "项目推进", "协作沟通"],
    capabilityDetails: capabilityDetails.length
      ? capabilityDetails
      : ["岗位专业能力", "问题分析", "项目推进", "协作沟通"].map((name, index) => ({
          name,
          priority: index < 2 ? "核心" as const : "重要" as const,
          why: `支持候选人独立承担${job.role}的关键工作`,
          evidence: "有完整案例，能讲清目标、方法、个人贡献与结果",
        })),
    mustHaves: mustHaves.length ? mustHaves : ["具备岗位所需的核心专业经验"],
    bonusSignals: bonusSignals.length ? bonusSignals : ["有可量化的业务成果", "能够清晰复盘关键项目"],
    verificationPoints: mustHaves.length ? mustHaves : ["核心经验与项目证据"],
    targetTitles,
    searchKeywords,
    redFlags,
    openQuestions,
  };
}

export function deriveInterviewQuestions(job: JobAnalysisInput) {
  const dimensions = job.interviewDimensions.length
    ? job.interviewDimensions
    : ["专业能力", "项目推进", "协作影响力", "求职动机"];
  const primary = dimensions[0] ?? "专业能力";
  const secondary = dimensions[1] ?? "项目推进";
  const gate = job.gates[0] ?? "核心岗位要求";
  return [
    {
      category: "经历验证",
      question: `请挑选一段最能证明你胜任「${job.role}」的经历，说明当时的目标、你的职责和最终结果。`,
      focus: "经历真实性、职责边界、结果量化",
      followUp: "如果重新做一次，你会改变哪个关键决策？",
    },
    {
      category: primary,
      question: `结合你过去的项目，讲一个最能体现你「${primary}」能力的案例。`,
      focus: `判断候选人在${primary}上的方法、深度和可迁移性`,
      followUp: "当时有哪些备选方案？为什么最终选择这一种？",
    },
    {
      category: secondary,
      question: "讲一次目标不清晰或资源不足的项目。你如何拆解问题并推动关键人达成结果？",
      focus: `${secondary}、优先级判断、推进韧性`,
      followUp: "遇到阻力最大的节点是什么？你具体做了什么？",
    },
    {
      category: "业务场景",
      question: `如果入职后负责${job.department}的一项新任务，你会如何在前 30 天完成现状判断并形成行动方案？`,
      focus: "业务理解、信息收集、结构化思考",
      followUp: "你会优先看哪三个指标或信息源？",
    },
    {
      category: "硬门槛核验",
      question: `岗位要求「${gate}」。请用一个具体案例证明你的实际经验，并说明你本人承担的部分。`,
      focus: "硬门槛证据、个人贡献、经验相关性",
      followUp: "这段经验中最复杂的判断是什么？",
    },
    {
      category: "求职动机",
      question: `你为什么考虑这个「${job.role}」岗位？下一份工作最希望获得什么，又不愿意妥协什么？`,
      focus: "动机真实性、岗位预期、稳定性",
      followUp: "什么情况下你会认为这次选择不合适？",
    },
  ];
}
