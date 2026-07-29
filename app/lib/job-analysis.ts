export type JobAnalysisInput = {
  role: string;
  department: string;
  jdText: string;
  gates: string[];
  interviewDimensions: string[];
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function deriveCandidateProfile(job: JobAnalysisInput) {
  const jd = job.jdText;
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

  const bonusSignals = unique([
    /从\s*0\s*到\s*1|0\s*[-→到]\s*1/.test(jd) ? "有 0→1 项目经验" : "",
    /管理|负责人|带领|团队/.test(jd) ? "有带团队或复杂项目经验" : "",
    /英语|英文|海外/.test(jd) ? "具备英语或海外业务能力" : "",
    /ai|人工智能|大模型/i.test(normalized) ? "有 AI 产品或应用经验" : "",
  ]);

  return {
    summary: `寻找一位${years ? `具备 ${years} 年以上相关经验、` : ""}能够在${job.department}独立承担核心工作的${job.role}。`,
    experience: years ? `${years} 年以上相关经验` : "以相关项目深度和岗位胜任力为主",
    education,
    backgrounds: backgrounds.length ? backgrounds : ["与岗位业务场景相近的工作背景"],
    capabilities: capabilities.length ? capabilities : ["岗位专业能力", "问题分析", "项目推进", "协作沟通"],
    bonusSignals: bonusSignals.length ? bonusSignals : ["有可量化的业务成果", "能够清晰复盘关键项目"],
    verificationPoints: job.gates.slice(0, 5),
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
