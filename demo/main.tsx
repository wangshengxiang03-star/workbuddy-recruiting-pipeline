import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import "./demo.css";

type DemoCandidate = {
  id: string;
  name: string;
  initials: string;
  role: string;
  score: number;
  status: string;
  tone: string;
  school: string;
  company: string;
  experience: string;
  channel: string;
  updated: string;
  highlights: string[];
  risk: string;
};

const demoCandidates: DemoCandidate[] = [
  {
    id: "candidate-linxu",
    name: "林栩",
    initials: "LX",
    role: "高级产品经理",
    score: 92,
    status: "强推荐",
    tone: "green",
    school: "浙江大学 · 本科",
    company: "某互联网公司 · 产品经理",
    experience: "7 年",
    channel: "Boss 直聘",
    updated: new Date(Date.now() - 12 * 60_000).toISOString(),
    highlights: ["0→1 搭建 B 端增长产品", "带领 8 人跨职能项目组", "核心指标提升 42%"],
    risk: "近两年有 2 次工作变动，需确认职业稳定性。",
  },
  {
    id: "candidate-zhouyue",
    name: "周玥",
    initials: "ZY",
    role: "用户增长专家",
    score: 86,
    status: "强推荐",
    tone: "green",
    school: "复旦大学 · 硕士",
    company: "某内容平台 · 增长策略",
    experience: "6 年",
    channel: "内推",
    updated: new Date(Date.now() - 28 * 60_000).toISOString(),
    highlights: ["负责千万级用户增长", "擅长实验平台与策略分析", "消费互联网经验完整"],
    risk: "期望薪资接近岗位预算上限。",
  },
  {
    id: "candidate-chenmo",
    name: "陈默",
    initials: "CM",
    role: "高级产品经理",
    score: 78,
    status: "待复筛",
    tone: "blue",
    school: "同济大学 · 本科",
    company: "某生活服务平台 · 产品经理",
    experience: "5 年",
    channel: "猎聘",
    updated: new Date(Date.now() - 60 * 60_000).toISOString(),
    highlights: ["平台型产品经验", "有商业化项目经历", "数据分析能力扎实"],
    risk: "管理经验弱于岗位偏好，需要重点验证影响力。",
  },
  {
    id: "candidate-fangqing",
    name: "方清",
    initials: "FQ",
    role: "招聘运营经理",
    score: 71,
    status: "可面试",
    tone: "blue",
    school: "华东师范大学 · 本科",
    company: "某电商平台 · 招聘运营",
    experience: "5 年",
    channel: "Boss 直聘",
    updated: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    highlights: ["招聘流程数字化经验", "搭建过人才库体系", "熟悉业务招聘"],
    risk: "缺少千人以上组织的项目经验。",
  },
  {
    id: "candidate-xuzhiyuan",
    name: "许知远",
    initials: "XZY",
    role: "用户增长专家",
    score: 56,
    status: "人才储备",
    tone: "amber",
    school: "中山大学 · 本科",
    company: "某旅行平台 · 增长运营",
    experience: "4 年",
    channel: "拉勾",
    updated: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    highlights: ["渠道投放经验丰富", "执行推进能力强"],
    risk: "策略深度与实验设计经验未达到当前职级要求。",
  },
];

const demoJobs = [
  {
    id: "job-senior-pm",
    role: "高级产品经理",
    department: "产品与增长部",
    jdText: "负责 B 端产品规划、需求分析和跨团队项目推进，要求 5 年以上产品经验。",
    version: "v3",
    versionNumber: 3,
    updatedAt: "今天 10:24",
    owner: "王嘉琪",
    headcount: 3,
    filledHeadcount: 2,
    gates: ["本科及以上", "5 年以上产品经验", "B 端产品经验"],
    weights: [["业务洞察", 30], ["产品能力", 30], ["数据分析", 20], ["协作影响力", 20]],
    interviewDimensions: ["业务拆解", "复杂项目推进", "数据决策", "领导力", "求职动机"],
    status: "active",
  },
  {
    id: "job-growth",
    role: "用户增长专家",
    department: "市场增长部",
    jdText: "负责增长策略、实验设计与数据分析。",
    version: "v2",
    versionNumber: 2,
    updatedAt: "昨天",
    owner: "王嘉琪",
    headcount: 2,
    filledHeadcount: 1,
    gates: ["本科及以上", "3 年以上增长经验"],
    weights: [["增长策略", 35], ["数据分析", 30], ["实验设计", 20], ["协作影响力", 15]],
    interviewDimensions: ["增长策略", "数据分析", "实验设计", "项目推动", "求职动机"],
    status: "active",
  },
];

let uploadedFiles: Array<{
  id: string;
  name: string;
  role: string;
  status: string;
  score: number | null;
  result: string;
}> = [];

const originalFetch = window.fetch.bind(window);

function json(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    }),
  );
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(rawUrl, window.location.href);
  if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);

  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (url.pathname === "/api/candidates") {
    if (method === "PATCH") return json({ candidate: {} });
    return json({
      candidates: demoCandidates,
      activity: [
        "系统完成 18 份简历初筛",
        "林栩的面试资料包已生成",
        "6 位候选人状态已同步",
        "本周招聘看板已更新",
      ],
    });
  }

  if (url.pathname === "/api/jobs") {
    if (method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const created = {
        id: `demo-job-${Date.now()}`,
        role: body.role,
        department: body.department,
        jdText: body.jdText,
        version: "v1",
        versionNumber: 1,
        updatedAt: "刚刚",
        owner: body.owner || "当前用户",
        headcount: body.headcount || 1,
        filledHeadcount: 0,
        gates: ["本科及以上", "相关岗位经验符合要求"],
        weights: [["专业能力", 35], ["项目经验", 30], ["数据分析", 20], ["协作影响力", 15]],
        interviewDimensions: ["专业能力", "项目深挖", "数据决策", "协作影响力", "求职动机"],
        status: "active",
      };
      demoJobs.unshift(created);
      return json({ job: created }, 201);
    }
    if (method === "PATCH") {
      const body = JSON.parse(String(init?.body ?? "{}"));
      const current = demoJobs.find((job) => job.id === body.id) ?? demoJobs[0];
      const updated = {
        ...current,
        ...body,
        versionNumber: current.versionNumber + 1,
        version: `v${current.versionNumber + 1}`,
        updatedAt: "刚刚",
      };
      return json({ job: updated });
    }
    return json({ jobs: demoJobs });
  }

  if (url.pathname === "/api/resumes/process") {
    return json({ summary: { total: uploadedFiles.length || 18, completed: 14, duplicates: 2, manual: 2 } });
  }

  if (url.pathname === "/api/resumes") {
    if (method === "POST") {
      const files = init?.body instanceof FormData
        ? init.body.getAll("files").filter((file): file is File => file instanceof File)
        : [];
      const created = files.map((file, index) => ({
        id: `demo-resume-${Date.now()}-${index}`,
        name: file.name,
        role: "高级产品经理",
        status: "已完成",
        score: 82 - index,
        result: "可面试",
      }));
      uploadedFiles = [...created, ...uploadedFiles];
      return json({ files: created }, 201);
    }
    if (method === "PATCH") return json({ file: {} });
    const id = url.searchParams.get("id");
    if (id) {
      const file = uploadedFiles.find((item) => item.id === id);
      if (!file) return json({ error: "演示记录不存在" }, 404);
      return json({
        file: {
          ...file,
          candidateId: null,
          duplicateOf: null,
          errorMessage: null,
          extractedText: "公开演示版不会读取或保存文件正文。",
          parsedData: {
            name: file.name.replace(/\.[^.]+$/, ""),
            city: "上海",
            education: "本科",
            school: "演示院校",
            years: 5,
            currentCompany: "演示公司",
            currentTitle: "产品经理",
            skills: ["需求分析", "数据分析", "项目管理"],
            highlights: ["拥有完整项目经验"],
          },
        },
        jobs: demoJobs.map((job) => job.role),
      });
    }
    return json({ files: uploadedFiles });
  }

  return json({ error: "公开演示版不提供此接口" }, 404);
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>,
);
