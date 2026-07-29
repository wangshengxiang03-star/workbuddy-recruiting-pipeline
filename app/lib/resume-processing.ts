import { strFromU8, unzipSync } from "fflate";
import { extractText, getDocumentProxy } from "unpdf";

export type ParsedResume = {
  name: string;
  phone: string;
  email: string;
  city: string;
  education: string;
  school: string;
  years: number;
  currentCompany: string;
  currentTitle: string;
  skills: string[];
  highlights: string[];
};

export type ScoredResume = {
  score: number;
  status: string;
  tone: string;
  result: string;
  failedGates: string[];
  matchedDimensions: string[];
};

export function buildResumeTags(
  parsed: Partial<ParsedResume>,
  matchedDimensions: string[] = [],
) {
  const tags = [
    parsed.school && !parsed.school.includes("待确认") ? parsed.school : "",
    parsed.education && !parsed.education.includes("待确认") ? parsed.education : "",
    parsed.years ? `${parsed.years} 年经验` : "",
    parsed.city ? `现居 ${parsed.city}` : "",
    parsed.currentTitle && !parsed.currentTitle.includes("待确认")
      ? parsed.currentTitle
      : "",
    ...(parsed.skills ?? []).slice(0, 5),
    ...matchedDimensions.slice(0, 3),
  ];
  return [...new Set(tags.filter(Boolean))].slice(0, 10);
}

type JobForScoring = {
  role: string;
  gates: string[];
  weights: Array<[string, number]>;
};

function decodeXml(value: string) {
  return value
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeText(
  bytes: Uint8Array,
  fileName: string,
  contentType: string,
) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || contentType === "application/pdf") {
    const pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: true });
    return String(extracted.text ?? "").trim();
  }
  if (
    extension === "docx" ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const archive = unzipSync(bytes);
    const documentXml = archive["word/document.xml"];
    if (!documentXml) throw new Error("Word 文档结构无效");
    return decodeXml(strFromU8(documentXml));
  }
  if (extension === "doc") {
    throw new Error("旧版 DOC 暂不支持自动解析，请另存为 DOCX 后上传");
  }
  if (["png", "jpg", "jpeg", "webp"].includes(extension ?? "")) {
    throw new Error("图片简历已安全入库，等待 OCR 模块处理");
  }
  throw new Error("暂不支持该文件格式的文本解析");
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function cleanNameFromFile(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const candidate = stem.split(/[-_—\s]/)[0].replace(/简历|个人|应聘/g, "");
  return /^[\u4e00-\u9fa5·]{2,6}$/.test(candidate) ? candidate : "";
}

export function parseResumeText(text: string, fileName: string): ParsedResume {
  const compact = text.replace(/\u00a0/g, " ");
  const phone = firstMatch(compact, [
    /(?:手机|电话|联系方式)\s*[:：]?\s*(1[3-9]\d{9})/,
    /\b(1[3-9]\d{9})\b/,
  ]);
  const email = firstMatch(compact, [
    /(?:邮箱|电子邮件|email)\s*[:：]?\s*([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i,
    /\b([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})\b/i,
  ]);
  const name =
    firstMatch(compact, [
      /(?:姓名|候选人)\s*[:：]\s*([\u4e00-\u9fa5·]{2,6})/,
      /^\s*([\u4e00-\u9fa5·]{2,6})(?:\s|\n)/,
    ]) || cleanNameFromFile(fileName) || "待确认姓名";
  const city = firstMatch(compact, [
    /(?:所在城市|现居地|居住地|城市)\s*[:：]\s*([^\s,，|]{2,12})/,
    /(?:地点|Location)\s*[:：]\s*([^\n|]{2,20})/i,
  ]);
  const school = firstMatch(compact, [
    /([\u4e00-\u9fa5A-Za-z·]{2,30}(?:大学|学院))\s*(?:·|-|｜|\|)?\s*(?:博士|硕士|本科|大专)?/,
  ]);
  const education =
    ["博士", "硕士", "本科", "大专"].find((level) => compact.includes(level)) ??
    "学历待确认";
  const yearsText = firstMatch(compact, [
    /(\d{1,2})\s*年(?:以上)?(?:工作|从业|相关)?经验/,
    /工作年限\s*[:：]\s*(\d{1,2})/,
  ]);
  const years = Math.min(50, Number(yearsText || 0));
  const currentCompany = firstMatch(compact, [
    /(?:当前公司|现公司|所在公司)\s*[:：]\s*([^\n|]{2,40})/,
    /(\S{2,30}(?:科技|集团|公司|网络|信息))\s+(?:至今|现在)/,
  ]);
  const currentTitle = firstMatch(compact, [
    /(?:当前职位|现职位|职位)\s*[:：]\s*([^\n|]{2,30})/,
    /(?:至今|现在)\s*[·|｜\-\s]+([^\n]{2,30})/,
  ]);

  const skillDictionary = [
    "产品规划",
    "需求分析",
    "B 端",
    "SaaS",
    "用户增长",
    "实验设计",
    "数据分析",
    "SQL",
    "Python",
    "项目管理",
    "招聘运营",
    "人才库",
    "团队管理",
    "跨部门协作",
  ];
  const skills = skillDictionary.filter((skill) =>
    compact.toLowerCase().includes(skill.toLowerCase()),
  );
  const highlights = compact
    .split(/\n|。|；/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length >= 10 &&
        line.length <= 80 &&
        /提升|增长|负责|搭建|主导|带领|完成|优化|降低|\d+%/.test(line),
    )
    .slice(0, 3);

  return {
    name,
    phone,
    email,
    city,
    education,
    school: school || "院校待确认",
    years,
    currentCompany: currentCompany || "当前公司待确认",
    currentTitle: currentTitle || "当前职位待确认",
    skills,
    highlights: highlights.length ? highlights : skills.slice(0, 3),
  };
}

function gateSatisfied(gate: string, resume: ParsedResume, text: string) {
  if (/硕士|研究生/.test(gate)) return ["硕士", "博士"].includes(resume.education);
  if (/本科/.test(gate)) return ["本科", "硕士", "博士"].includes(resume.education);
  const years = gate.match(/(\d+)\s*年/);
  if (years && resume.years < Number(years[1])) return false;
  if (/B\s*端|企业服务|SaaS/i.test(gate)) return /B\s*端|企业服务|SaaS/i.test(text);
  if (/实验平台|实验设计/.test(gate)) return /实验平台|A\/B|实验设计/.test(text);
  if (/招聘运营/.test(gate)) return /招聘运营|招聘流程|人才库/.test(text);
  return true;
}

const dimensionKeywords: Record<string, string[]> = {
  业务洞察: ["业务", "市场", "商业", "策略"],
  产品能力: ["产品", "需求", "用户", "原型", "迭代"],
  产品判断: ["产品", "需求", "取舍", "优先级"],
  数据分析: ["数据", "指标", "SQL", "分析", "实验"],
  数据能力: ["数据", "指标", "SQL", "分析"],
  协作影响力: ["跨部门", "协作", "推动", "沟通", "团队"],
  增长策略: ["增长", "转化", "留存", "获客", "投放"],
  实验设计: ["实验", "A/B", "假设", "对照"],
  项目推进: ["项目", "推进", "落地", "交付"],
  流程设计: ["流程", "机制", "规范", "体系"],
  项目管理: ["项目", "管理", "排期", "风险"],
  业务理解: ["业务", "招聘", "组织", "人才"],
};

export function scoreResume(
  resume: ParsedResume,
  text: string,
  job: JobForScoring,
): ScoredResume {
  const failedGates = job.gates.filter((gate) => !gateSatisfied(gate, resume, text));
  if (failedGates.length) {
    return {
      score: 0,
      status: "淘汰",
      tone: "muted",
      result: `硬门槛不通过：${failedGates.join("、")}`,
      failedGates,
      matchedDimensions: [],
    };
  }

  const matchedDimensions: string[] = [];
  let weightedScore = 0;
  for (const [dimension, weight] of job.weights) {
    const keywords = dimensionKeywords[dimension] ?? [dimension];
    const matched = keywords.filter((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase()),
    ).length;
    const dimensionScore = Math.min(100, 48 + matched * 13);
    if (matched) matchedDimensions.push(dimension);
    weightedScore += dimensionScore * (weight / 100);
  }
  const completeness =
    [resume.phone, resume.email, resume.school, resume.currentCompany].filter(
      (value) => value && !value.includes("待确认"),
    ).length * 2;
  const score = Math.max(40, Math.min(96, Math.round(weightedScore + completeness)));
  const status =
    score >= 80 ? "强推荐" : score >= 60 ? "可面试" : score >= 40 ? "人才储备" : "淘汰";
  const tone = score >= 80 ? "green" : score >= 60 ? "blue" : "amber";
  return {
    score,
    status,
    tone,
    result: status,
    failedGates: [],
    matchedDimensions,
  };
}
