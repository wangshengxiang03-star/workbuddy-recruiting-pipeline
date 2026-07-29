"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Candidate = {
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

type WorkflowModal = {
  type: "invite" | "schedule" | "package";
  candidate: Candidate;
} | null;

type JobStandard = {
  id: string;
  role: string;
  department: string;
  jdText: string;
  version: string;
  versionNumber: number;
  updatedAt: string;
  owner: string;
  headcount: number;
  filledHeadcount: number;
  gates: string[];
  weights: Array<[string, number]>;
  interviewDimensions: string[];
  status: string;
};

type ResumeDetail = {
  id: string;
  name: string;
  role: string;
  status: string;
  score: number | null;
  result: string;
  errorMessage: string | null;
  candidateId: string | null;
  duplicateOf: string | null;
  extractedText: string;
  parsedData: {
    name?: string;
    phone?: string;
    email?: string;
    city?: string;
    education?: string;
    school?: string;
    years?: number;
    currentCompany?: string;
    currentTitle?: string;
    skills?: string[];
    highlights?: string[];
    failedGates?: string[];
    matchedDimensions?: string[];
  } | null;
};

const candidates: Candidate[] = [
  {
    id: "candidate-linxu",
    name: "林栩",
    initials: "LX",
    role: "高级产品经理",
    score: 92,
    status: "强推荐",
    tone: "green",
    school: "浙江大学 · 本科",
    company: "字节跳动 · 产品经理",
    experience: "7 年",
    channel: "Boss 直聘",
    updated: "12 分钟前",
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
    company: "小红书 · 增长策略",
    experience: "6 年",
    channel: "内推",
    updated: "28 分钟前",
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
    company: "美团 · 产品经理",
    experience: "5 年",
    channel: "猎聘",
    updated: "1 小时前",
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
    company: "得物 · 招聘运营",
    experience: "5 年",
    channel: "Boss 直聘",
    updated: "2 小时前",
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
    company: "携程 · 增长运营",
    experience: "4 年",
    channel: "拉勾",
    updated: "昨天",
    highlights: ["渠道投放经验丰富", "执行推进能力强"],
    risk: "策略深度与实验设计经验未达到当前职级要求。",
  },
];

function relativeUpdateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 2) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} 小时前`;
  return `${Math.round(minutes / 1440)} 天前`;
}

const navItems = [
  ["overview", "工作台", "⌂"],
  ["jobs", "岗位标准", "◇"],
  ["resumes", "简历筛选", "▤"],
  ["candidates", "候选人", "◎"],
  ["interviews", "面试管理", "▣"],
  ["talent", "人才池", "♧"],
  ["reports", "数据报表", "⌁"],
];

function ScoreRing({ score, small = false }: { score: number; small?: boolean }) {
  const color = score >= 80 ? "#16a36a" : score >= 60 ? "#4f63e9" : "#d79529";
  return (
    <div
      className={`score-ring ${small ? "small" : ""}`}
      style={{
        background: `conic-gradient(${color} ${score * 3.6}deg, #edf0f3 0deg)`,
      }}
      aria-label={`匹配度 ${score} 分`}
    >
      <div><strong>{score}</strong><span>匹配度</span></div>
    </div>
  );
}

type ModuleProps = {
  active: string;
  notify: (message: string) => void;
  runBatch: () => Promise<void>;
  refreshLedger: () => Promise<void>;
  batchRunning: boolean;
  setSelected: (candidate: Candidate | null) => void;
  candidateData: Candidate[];
};

const standards: JobStandard[] = [
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
    jdText: "负责增长策略、实验设计与转化分析，要求 4 年以上增长经验。",
    version: "v2",
    versionNumber: 2,
    updatedAt: "昨天 16:40",
    owner: "孟玮",
    headcount: 2,
    filledHeadcount: 1,
    gates: ["本科及以上", "4 年以上增长经验", "有实验平台经验"],
    weights: [["增长策略", 35], ["实验设计", 25], ["数据能力", 25], ["项目推进", 15]],
    interviewDimensions: ["增长策略", "实验设计", "数据分析", "项目推进", "求职动机"],
    status: "active",
  },
  {
    id: "job-recruiting-ops",
    role: "招聘运营经理",
    department: "人力资源部",
    jdText: "负责招聘流程设计、人才库运营和招聘数据分析。",
    version: "v1",
    versionNumber: 1,
    updatedAt: "7 月 25 日",
    owner: "王嘉琪",
    headcount: 1,
    filledHeadcount: 0,
    gates: ["本科及以上", "3 年招聘运营经验"],
    weights: [["流程设计", 35], ["项目管理", 25], ["数据分析", 20], ["业务理解", 20]],
    interviewDimensions: ["流程设计", "项目管理", "数据分析", "业务理解", "求职动机"],
    status: "active",
  },
];

function ModuleHeader({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="module-header">
      <div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      <button className="primary" onClick={onAction}><b>+</b>{action}</button>
    </div>
  );
}

function JobsPanel({ notify }: Pick<ModuleProps, "notify">) {
  const [jobStandards, setJobStandards] = useState<JobStandard[]>(standards);
  const [selectedStandard, setSelectedStandard] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draftGates, setDraftGates] = useState<string[]>(standards[0].gates);
  const [draftWeights, setDraftWeights] = useState<Array<[string, number]>>(standards[0].weights);
  const standard = jobStandards[selectedStandard] ?? jobStandards[0];

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/jobs", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { jobs: JobStandard[] }) => {
        if (payload.jobs.length) {
          setJobStandards(payload.jobs);
          setDraftGates(payload.jobs[0].gates);
          setDraftWeights(payload.jobs[0].weights);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!standard) return;
    setDraftGates(standard.gates);
    setDraftWeights(standard.weights);
  }, [standard?.id, standard?.version]);

  const createStandard = async (formData: FormData) => {
    setSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role: formData.get("role"),
          department: formData.get("department"),
          owner: formData.get("owner"),
          headcount: Number(formData.get("headcount")),
          jdText: formData.get("jdText"),
          supplementalRequirements: formData.get("supplementalRequirements"),
        }),
      });
      const payload = (await response.json()) as { job?: JobStandard; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error ?? "岗位标准创建失败");
      setJobStandards((current) => [payload.job!, ...current]);
      setSelectedStandard(0);
      setShowCreate(false);
      notify(`${payload.job.role}标准已生成并保存为 v1`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "岗位标准创建失败");
    } finally {
      setSaving(false);
    }
  };

  const saveStandard = async () => {
    const total = draftWeights.reduce((sum, [, value]) => sum + Number(value), 0);
    if (total !== 100) {
      notify("评分权重合计必须为 100%");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: standard.id,
          gates: draftGates,
          weights: draftWeights,
          interviewDimensions: standard.interviewDimensions,
        }),
      });
      const payload = (await response.json()) as { job?: JobStandard; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error ?? "保存失败");
      setJobStandards((current) => current.map((item) => item.id === payload.job!.id ? payload.job! : item));
      notify(`${payload.job.role}已保存为 ${payload.job.version}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "岗位标准保存失败");
    } finally {
      setSaving(false);
    }
  };

  const addGate = () => {
    const value = window.prompt("请输入新的硬性筛选门槛");
    if (value?.trim()) setDraftGates((current) => [...current, value.trim()]);
  };

  const exportStandard = () => {
    const content = `# ${standard.role} - 招聘标准\n\n## 硬性门槛\n${draftGates.map((item) => `- ${item}`).join("\n")}\n\n## 评分权重\n${draftWeights.map(([label, value]) => `- ${label}: ${value}%`).join("\n")}\n\n## 面试考察维度\n${standard.interviewDimensions.map((item) => `- ${item}`).join("\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    link.download = `${standard.role}-招聘标准.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify("岗位标准 Markdown 已导出");
  };

  return (
    <div className="module-page">
      <ModuleHeader eyebrow="JOB STANDARD" title="岗位标准管理" description="统一硬门槛、评分权重与面试考察维度，为智能筛选提供唯一判断基准。" action="从 JD 生成标准" onAction={() => setShowCreate(true)} />
      <div className="standard-layout">
        <div className="standard-list">
          <div className="panel-title"><div><span>岗位库</span><strong>{jobStandards.length} 个在招岗位</strong></div><button onClick={() => window.location.reload()}>↻</button></div>
          {jobStandards.map((item, index) => (
            <button className={`standard-item ${selectedStandard === index ? "active" : ""}`} key={item.id} onClick={() => setSelectedStandard(index)}>
              <i>{item.role.slice(0, 1)}</i>
              <span><strong>{item.role}</strong><small>{item.department} · {item.owner}</small></span>
              <em>{item.version}</em>
            </button>
          ))}
          <div className="draft-standard"><i>{loading ? "…" : "✓"}</i><span><strong>{loading ? "正在同步岗位库" : "岗位标准已持久化"}</strong><small>新建与修改都会生成可追溯版本</small></span></div>
        </div>
        {standard && <article className="standard-editor">
          <div className="editor-head">
            <div><span>当前标准 · {standard.version}</span><h3>{standard.role}</h3><p>{standard.department}　负责人 {standard.owner}　HC {standard.filledHeadcount}/{standard.headcount}</p></div>
            <div><button onClick={() => navigator.clipboard?.writeText(JSON.stringify(standard, null, 2)).then(() => notify("已复制当前岗位标准"))}>复制</button><button className="dark" disabled={saving} onClick={() => void saveStandard()}>{saving ? "正在保存…" : "保存新版本"}</button></div>
          </div>
          <div className="standard-section">
            <div className="section-index">01</div>
            <div className="standard-content"><h4>硬性筛选门槛 <span>一票否决</span></h4>
              <div className="gate-list">{draftGates.map((gate) => <label key={gate}><i>✓</i>{gate}<button aria-label={`删除${gate}`} onClick={() => draftGates.length > 1 ? setDraftGates((current) => current.filter((item) => item !== gate)) : notify("岗位标准至少保留一项硬门槛")}>×</button></label>)}<button className="add-rule" onClick={addGate}>＋ 添加门槛</button></div>
            </div>
          </div>
          <div className="standard-section">
            <div className="section-index">02</div>
            <div className="standard-content"><h4>评分维度与权重 <span>合计 {draftWeights.reduce((sum, [, value]) => sum + Number(value), 0)}%</span></h4>
              <div className="weight-list">{draftWeights.map(([label, value], index) => (
                <div key={label}><span>{label}</span><i><em style={{ width: `${Number(value) * 2.15}%` }} /></i><label><input aria-label={`${label}权重`} type="number" min="0" max="100" value={value} onChange={(event) => setDraftWeights((current) => current.map((item, itemIndex) => itemIndex === index ? [item[0], Number(event.target.value)] : item))} />%</label></div>
              ))}</div>
            </div>
          </div>
          <div className="standard-section">
            <div className="section-index">03</div>
            <div className="standard-content"><h4>核心考察维度 <span>同步到面试题库</span></h4>
              <div className="tag-cloud">{standard.interviewDimensions.map((item) => <span key={item}>{item}</span>)}</div>
            </div>
          </div>
          <div className="standard-foot"><span><i>✓</i> 简历筛选与面试模板将同步使用此版本</span><button onClick={exportStandard}>导出标准文档 ↓</button></div>
        </article>}
      </div>
      {showCreate && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowCreate(false);
        }}>
          <section className="workflow-modal" role="dialog" aria-modal="true" aria-label="从 JD 创建岗位标准">
            <div className="modal-head">
              <div><span>JOB STANDARD BUILDER</span><h2>从 JD 生成岗位标准</h2><p>填写基础信息和招聘要求，系统将结构化生成完整岗位标准。</p></div>
              <button aria-label="关闭" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form action={(formData) => void createStandard(formData)} className="standard-create-form">
              <div className="form-grid">
                <label>岗位名称<input name="role" required placeholder="例如：高级产品经理" /></label>
                <label>所属部门<input name="department" required placeholder="例如：产品与增长部" /></label>
                <label>招聘负责人<input name="owner" placeholder="默认使用当前账号" /></label>
                <label>招聘人数<input name="headcount" required type="number" min="1" max="999" defaultValue="1" /></label>
              </div>
              <label>岗位 JD<textarea name="jdText" required rows={8} placeholder="粘贴岗位职责、任职要求、技能要求等完整 JD 内容…" /></label>
              <label>补充招聘要求<textarea name="supplementalRequirements" rows={4} placeholder={"每行一项，例如：\n必须有 B 端产品经验\n最近两年跳槽不超过 2 次"} /></label>
              <div className="message-check"><i>✓</i><span><strong>生成后仍可人工调整</strong><small>保存时自动形成 v1，后续每次修改都会保留新的版本号。</small></span></div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreate(false)}>取消</button>
                <button className="primary" type="submit" disabled={saving}>{saving ? "正在生成…" : "生成并保存标准"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function ResumesPanel({ notify, runBatch, batchRunning, refreshLedger }: Pick<ModuleProps, "notify" | "runBatch" | "batchRunning" | "refreshLedger">) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState<ResumeDetail | null>(null);
  const [detailJobs, setDetailJobs] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    score: number | null;
    result: string;
  }>>([]);
  const loadUploadedFiles = async (signal?: AbortSignal) => {
    const response = await fetch("/api/resumes", { cache: "no-store", signal });
    if (!response.ok) throw new Error("简历队列读取失败");
    const payload = (await response.json()) as { files: typeof uploadedFiles };
    setUploadedFiles(payload.files);
  };
  useEffect(() => {
    const controller = new AbortController();
    void loadUploadedFiles(controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/resumes?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        file?: ResumeDetail;
        jobs?: string[];
        error?: string;
      };
      if (!response.ok || !payload.file) throw new Error(payload.error ?? "解析结果读取失败");
      setDetail(payload.file);
      setDetailJobs(payload.jobs ?? []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "解析结果读取失败");
    } finally {
      setDetailLoading(false);
    }
  };
  const updateDetailField = (
    field: keyof NonNullable<ResumeDetail["parsedData"]>,
    value: string | number,
  ) => {
    setDetail((current) => current ? {
      ...current,
      parsedData: { ...(current.parsedData ?? {}), [field]: value },
    } : current);
  };
  const saveDetail = async () => {
    if (!detail) return;
    setDetailSaving(true);
    try {
      const response = await fetch("/api/resumes", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: detail.id,
          role: detail.role,
          parsedData: detail.parsedData,
        }),
      });
      const payload = (await response.json()) as {
        file?: ResumeDetail;
        duplicate?: { name: string };
        error?: string;
      };
      if (!response.ok || !payload.file) throw new Error(payload.error ?? "校正结果保存失败");
      setDetail(payload.file);
      await Promise.all([loadUploadedFiles(), refreshLedger()]);
      notify(payload.duplicate ? `已识别为${payload.duplicate.name}的重复投递` : "字段已校正，评分和候选人台账已同步");
    } catch (error) {
      notify(error instanceof Error ? error.message : "校正结果保存失败");
    } finally {
      setDetailSaving(false);
    }
  };
  const queue: string[][] = [
    ["林栩-高级产品经理.pdf", "高级产品经理", "已完成", "92", "强推荐"],
    ["周玥_增长专家.docx", "用户增长专家", "已完成", "86", "强推荐"],
    ["陈默简历.pdf", "高级产品经理", "待复筛", "78", "可面试"],
    ["方清.png", "招聘运营经理", "OCR 识别", "—", "处理中"],
    ["李文浩.pdf", "高级产品经理", "重复投递", "—", "已跳过"],
    ["赵岚-增长.pdf", "用户增长专家", "硬门槛淘汰", "32", "经验不足"],
    ...uploadedFiles.map((file) => [
      file.name,
      file.role,
      batchRunning ? "文本解析" : file.status,
      file.score === null ? "—" : String(file.score),
      batchRunning ? "处理中" : file.result,
      file.id,
    ]),
  ];
  const handleLocalFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    setUploading(true);
    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        files?: typeof uploadedFiles;
        error?: string;
      };
      if (!response.ok || !payload.files) {
        throw new Error(payload.error ?? "简历入库失败");
      }
      setUploadedFiles((current) => [...payload.files!, ...current]);
      notify(`${payload.files.length} 份简历已安全入库，开始执行私有解析`);
      await runBatch();
      await loadUploadedFiles();
    } catch (error) {
      notify(error instanceof Error ? error.message : "简历入库失败，请稍后重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  return (
    <div className="module-page">
      <ModuleHeader
        eyebrow="RESUME SCREENING"
        title="简历智能筛选"
        description="统一处理 PDF、Word 与图片简历，自动完成解析、去重、硬门槛校验和匹配度评分。"
        action={uploading ? "正在入库…" : batchRunning ? "正在处理…" : "上传简历文件"}
        onAction={() => fileInputRef.current?.click()}
      />
      <div className="screening-stats">
        {[["今日新增", "18", "份"], ["已完成", "14", "份"], ["重复投递", "2", "份"], ["平均耗时", "7.8", "秒/份"]].map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>)}
        <div className="automation-toggle"><span className="pulse" /><div><strong>自动扫描已开启</strong><small>每天 10:00 / 14:00 / 18:00</small></div><button aria-label="关闭自动扫描"><i /></button></div>
      </div>
      <div className="resume-workspace">
        <aside className="flow-panel">
          <div className="panel-title"><div><span>处理流水线</span><strong>批次 #20260728-03</strong></div></div>
          {[
            ["01", "文件解析", "PDF / Word / OCR", "done"],
            ["02", "字段提取", "姓名、背景、技能等 14 项", "done"],
            ["03", "重复校验", "姓名 + 手机号双重匹配", "done"],
            ["04", "硬门槛筛选", "按岗位标准逐项判断", batchRunning ? "running" : "done"],
            ["05", "匹配度评分", "权重、加减分项综合计算", batchRunning ? "waiting" : "done"],
            ["06", "分层归档", "重命名并更新招聘台账", batchRunning ? "waiting" : "done"],
          ].map(([index, title, desc, state]) => <div className={`flow-step ${state}`} key={index}><i>{state === "done" ? "✓" : index}</i><span><strong>{title}</strong><small>{desc}</small></span>{state === "running" && <em>运行中</em>}</div>)}
          <div className="local-note"><i>⌂</i><span><strong>文件已进入私有安全存储</strong><small>按日期与批次隔离归档</small></span></div>
        </aside>
        <div className="queue-panel">
          <div className="panel-title"><div><span>当前批次</span><strong>文件处理队列</strong></div><div className="queue-actions"><button onClick={() => notify("筛选结果 CSV 已导出")}>导出结果</button><button onClick={() => void runBatch().then(() => loadUploadedFiles())}>重新运行</button></div></div>
          {batchRunning && <div className="batch-progress"><span><i /></span><b>正在执行硬门槛筛选 · 12 / 18</b><em>预计 38 秒</em></div>}
          <div className="resume-table">
            <div className="resume-row resume-head"><span>文件名</span><span>目标岗位</span><span>处理状态</span><span>得分</span><span>结论</span></div>
            {queue.map(([file, role, state, score, result, id]) => <button className="resume-row" key={`${file}-${id ?? "demo"}`} onClick={() => id ? void openDetail(id) : notify(`${file}：演示记录暂无原始解析详情`)}>
              <span><i>{file.endsWith(".png") ? "IMG" : file.endsWith(".docx") ? "DOC" : "PDF"}</i><b>{file}</b></span><span>{role}</span><span><em className={state === "已完成" ? "success" : state.includes("淘汰") || state.includes("重复") ? "muted" : "working"}>{state}</em></span><span><strong>{score}</strong></span><span>{result}<b>→</b></span>
            </button>)}
          </div>
          <label className={`drop-zone ${uploading ? "uploading" : ""}`}><input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" disabled={uploading} onChange={(event) => void handleLocalFiles(event.target.files)} /><i>{uploading ? "◌" : "↥"}</i><span><strong>{uploading ? "正在加密入库…" : "继续添加简历"}</strong><small>支持 PDF、Word 和图片；单份不超过 15MB，单批最多 100 份</small></span><b>{uploading ? "请稍候" : "浏览文件"}</b></label>
        </div>
      </div>
      {(detail || detailLoading) && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !detailSaving) setDetail(null);
        }}>
          <section className="workflow-modal resume-detail-modal" role="dialog" aria-modal="true" aria-label="简历解析结果审核">
            <div className="modal-head">
              <div><span>RESUME REVIEW</span><h2>{detailLoading && !detail ? "正在读取解析结果…" : "审核简历解析结果"}</h2><p>{detail?.name ?? "请稍候"} · {detail?.status ?? "加载中"}</p></div>
              <button aria-label="关闭" onClick={() => setDetail(null)}>×</button>
            </div>
            {detail && <div className="resume-review">
              <div className="review-summary">
                <div><span>当前结论</span><strong>{detail.result}</strong></div>
                <div><span>匹配得分</span><strong>{detail.score ?? "—"}</strong></div>
                <div><span>处理状态</span><strong>{detail.status}</strong></div>
              </div>
              {detail.errorMessage && <div className="review-alert"><i>!</i><span><strong>需要人工处理</strong><small>{detail.errorMessage}</small></span></div>}
              <div className="review-grid">
                <label>候选人姓名<input value={detail.parsedData?.name ?? ""} onChange={(event) => updateDetailField("name", event.target.value)} /></label>
                <label>目标岗位<select value={detail.role} onChange={(event) => setDetail({ ...detail, role: event.target.value })}>{detailJobs.map((role) => <option key={role}>{role}</option>)}</select></label>
                <label>手机号<input value={detail.parsedData?.phone ?? ""} onChange={(event) => updateDetailField("phone", event.target.value)} /></label>
                <label>邮箱<input value={detail.parsedData?.email ?? ""} onChange={(event) => updateDetailField("email", event.target.value)} /></label>
                <label>所在城市<input value={detail.parsedData?.city ?? ""} onChange={(event) => updateDetailField("city", event.target.value)} /></label>
                <label>工作年限<input type="number" min="0" max="50" value={detail.parsedData?.years ?? 0} onChange={(event) => updateDetailField("years", Number(event.target.value))} /></label>
                <label>最高学历<input value={detail.parsedData?.education ?? ""} onChange={(event) => updateDetailField("education", event.target.value)} /></label>
                <label>毕业院校<input value={detail.parsedData?.school ?? ""} onChange={(event) => updateDetailField("school", event.target.value)} /></label>
                <label>当前公司<input value={detail.parsedData?.currentCompany ?? ""} onChange={(event) => updateDetailField("currentCompany", event.target.value)} /></label>
                <label>当前职位<input value={detail.parsedData?.currentTitle ?? ""} onChange={(event) => updateDetailField("currentTitle", event.target.value)} /></label>
              </div>
              <div className="review-evidence">
                <div><span>匹配维度</span><p>{detail.parsedData?.matchedDimensions?.join("、") || "等待人工确认后重新评分"}</p></div>
                <div><span>未通过门槛</span><p>{detail.parsedData?.failedGates?.join("、") || "无"}</p></div>
              </div>
              <details className="source-preview"><summary>查看提取原文</summary><pre>{detail.extractedText || "当前文件尚无可用文本，图片简历需等待 OCR 或人工录入字段。"}</pre></details>
            </div>}
            <div className="modal-actions">
              <button onClick={() => setDetail(null)}>取消</button>
              <button className="primary" disabled={!detail || detailSaving} onClick={() => void saveDetail()}>{detailSaving ? "正在重新评分…" : "保存校正并重新评分"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CandidatesPanel({ setSelected, notify, candidateData }: Pick<ModuleProps, "setSelected" | "notify" | "candidateData">) {
  const [candidateFilter, setCandidateFilter] = useState("全部");
  const list = candidateFilter === "全部" ? candidateData : candidateData.filter((item) => item.status === candidateFilter);
  return (
    <div className="module-page">
      <ModuleHeader eyebrow="CANDIDATE LEDGER" title="候选人总台账" description="集中追踪候选人从入库、筛选、面试到归档的完整状态和每次处理记录。" action="导入候选人" onAction={() => notify("已打开候选人导入向导")} />
      <div className="ledger-toolbar">
        <label><span>⌕</span><input placeholder="搜索姓名、公司、技能…" aria-label="搜索候选人" /></label>
        <div>{["全部", "强推荐", "待复筛", "可面试", "复筛通过", "已邀约", "已确认面试", "资料已就绪"].map((item) => <button className={candidateFilter === item ? "active" : ""} key={item} onClick={() => setCandidateFilter(item)}>{item}</button>)}</div>
        <button onClick={() => notify("已打开高级筛选")}>筛选 ▾</button>
      </div>
      <div className="candidate-table full-ledger">
        <div className="table-row table-header"><span>候选人</span><span>应聘岗位</span><span>AI 匹配度</span><span>当前状态</span><span>负责人 / 更新时间</span><span /></div>
        {list.map((candidate) => <button className="table-row candidate-row" key={candidate.name} onClick={() => setSelected(candidate)}>
          <span className="candidate-name"><i className={candidate.tone}>{candidate.initials}</i><b>{candidate.name}<small>{candidate.school}</small></b></span>
          <span>{candidate.role}<small>{candidate.company}</small></span>
          <span className={`score score-${candidate.tone}`}><b>{candidate.score}</b><i><em style={{ width: `${candidate.score}%` }} /></i></span>
          <span><b className={`status ${candidate.tone}`}><i />{candidate.status}</b></span>
          <span>王嘉琪<small>{candidate.updated}</small></span><span className="row-arrow">→</span>
        </button>)}
      </div>
      <div className="ledger-footer"><span>共 186 位候选人 · 当前显示 {list.length} 位演示数据</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></div>
    </div>
  );
}

function InterviewsPanel({ notify, setSelected, candidateData }: Pick<ModuleProps, "notify" | "setSelected" | "candidateData">) {
  const [view, setView] = useState("日程");
  const events = [
    { time: "10:00", name: "林栩", role: "高级产品经理", interviewer: "刘明 · 业务一面", form: "腾讯会议", ready: true },
    { time: "14:30", name: "周玥", role: "用户增长专家", interviewer: "孟玮 · 业务一面", form: "上海 7F-03", ready: true },
    { time: "16:00", name: "方清", role: "招聘运营经理", interviewer: "王嘉琪 · HR 面", form: "飞书会议", ready: false },
  ];
  return (
    <div className="module-page">
      <ModuleHeader eyebrow="INTERVIEW OPERATIONS" title="面试管理" description="确认面试后自动生成画像、题库和评价表，并在面试前向 HR 与面试官提醒。" action="安排面试" onAction={() => notify("已打开面试安排表")} />
      <div className="interview-toolbar"><div><button className={view === "日程" ? "active" : ""} onClick={() => setView("日程")}>日程视图</button><button className={view === "资料" ? "active" : ""} onClick={() => setView("资料")}>资料包</button></div><span>2026 年 7 月 28 日 · 星期二</span><button onClick={() => notify("已同步面试官日历")}>同步日历 ↻</button></div>
      {view === "日程" ? (
        <div className="interview-layout">
          <div className="schedule">
            <div className="date-column"><strong>28</strong><span>JUL</span><i /></div>
            <div className="event-list">{events.map((event, index) => <article className="event-card" key={event.time}>
              <time>{event.time}<small>60 min</small></time><div className="event-main"><span>{event.role}</span><h3>{event.name}</h3><p>{event.interviewer}　·　{event.form}</p></div>
              <div className="event-status"><b className={event.ready ? "ready" : "pending"}>{event.ready ? "资料已就绪" : "资料待确认"}</b><button onClick={() => { const found = candidateData.find((candidate) => candidate.name === event.name); if (found) setSelected(found); else notify(`${event.name}的资料包正在生成`); }}>查看详情 →</button></div>
              {index === 1 && <div className="now-line"><i />当前 13:42</div>}
            </article>)}</div>
          </div>
          <aside className="prep-summary">
            <div className="panel-title"><div><span>今日筹备</span><strong>资料包完成度</strong></div><ScoreRing score={83} small /></div>
            <div className="prep-list"><div><i className="done">✓</i><span><strong>候选人一页纸画像</strong><small>3 / 3 已生成</small></span></div><div><i className="done">✓</i><span><strong>定制化面试题库</strong><small>3 / 3 已生成</small></span></div><div><i className="pending">!</i><span><strong>面试评价表</strong><small>1 份等待确认</small></span></div><div><i className="done">✓</i><span><strong>面试提醒</strong><small>将在面试前 2 小时推送</small></span></div></div>
            <button className="primary" onClick={() => { setView("资料"); notify("已切换到面试资料包"); }}>检查待确认资料</button>
          </aside>
        </div>
      ) : (
        <div className="package-grid">{events.map((event, index) => <article key={event.name}><div className="package-cover"><span>WORKBUDDY · INTERVIEW PACK</span><strong>{event.name}</strong><p>{event.role}</p><i>{index === 2 ? "生成中" : "READY"}</i></div><div className="package-info"><span>{index === 2 ? "2 / 3 文档完成" : "3 份文档 · 12 道定制题"}</span><button onClick={() => notify(`${event.name}面试资料包已打开`)}>打开资料包 →</button></div></article>)}</div>
      )}
    </div>
  );
}

function TalentPanel({ setSelected, notify, candidateData }: Pick<ModuleProps, "setSelected" | "notify" | "candidateData">) {
  return (
    <div className="module-page">
      <ModuleHeader eyebrow="TALENT COMMUNITY" title="优质人才池" description="沉淀暂未录用但具备长期价值的人才，按岗位族、技能标签和联系状态持续运营。" action="新建人才分组" onAction={() => notify("已创建空白人才分组")} />
      <div className="talent-groups">{[["产品与策略人才", "38", "12 人近 90 天有互动", "violet"], ["增长与市场人才", "27", "8 人匹配当前岗位", "green"], ["HR 专业人才", "16", "5 人可优先联系", "orange"]].map(([title, count, note, tone]) => <button key={title} onClick={() => notify(`已打开${title}`)}><i className={tone}>♧</i><span><strong>{title}</strong><small>{note}</small></span><b>{count}</b><em>→</em></button>)}</div>
      <div className="talent-content">
        <div className="panel-title"><div><span>最近入池</span><strong>值得持续关注的候选人</strong></div><button onClick={() => notify("已按最近联系时间排序")}>最近联系 ▾</button></div>
        <div className="talent-card-grid">{candidateData.filter((candidate) => candidate.score >= 56).map((candidate) => <button key={candidate.name} onClick={() => setSelected(candidate)}><div className={`large-avatar ${candidate.tone}`}>{candidate.initials}</div><span><strong>{candidate.name}</strong><small>{candidate.company}</small></span><em>{candidate.role.replace("高级", "")}</em><p>{candidate.highlights[0]}</p><div><b>上次联系 {candidate.updated}</b><i>查看画像 →</i></div></button>)}</div>
      </div>
    </div>
  );
}

function ReportsPanel({ notify }: Pick<ModuleProps, "notify">) {
  const channels = [["Boss 直聘", 68, 24], ["内推", 48, 31], ["猎聘", 32, 19], ["拉勾", 21, 10], ["其他", 17, 7]];
  return (
    <div className="module-page">
      <ModuleHeader eyebrow="RECRUITING ANALYTICS" title="招聘数据报表" description="按岗位、渠道和阶段持续监控招聘效率，并为 AI 筛选准确率提供人工反馈依据。" action="生成本周报告" onAction={() => notify("本周招聘报告已生成并归档")} />
      <div className="report-kpis">{[["本月简历量", "742", "↑ 12.4%", "positive"], ["初筛通过率", "50.5%", "↑ 3.1%", "positive"], ["邀约到场率", "84.2%", "↓ 1.8%", "negative"], ["平均招聘周期", "23.6 天", "缩短 4.2 天", "positive"], ["AI 判断一致性", "86.7%", "↑ 5.4%", "positive"]].map(([label, value, change, tone]) => <div key={label}><span>{label}</span><strong>{value}</strong><em className={tone}>{change}</em></div>)}</div>
      <div className="report-grid">
        <article className="trend-card"><div className="panel-title"><div><span>近 8 周趋势</span><strong>简历量与转化效率</strong></div><select><option>全部岗位</option></select></div><div className="chart-area"><div className="y-labels"><span>240</span><span>180</span><span>120</span><span>60</span><span>0</span></div><div className="bar-chart">{[112, 138, 126, 169, 151, 194, 176, 218].map((height, index) => <div key={index}><i style={{ height: `${height * .55}px` }}><em style={{ height: `${height * .26}px` }} /></i><span>W{index + 1}</span></div>)}</div></div><div className="chart-legend"><span><i className="purple" />新增简历</span><span><i className="green" />复筛通过</span></div></article>
        <article className="channel-card"><div className="panel-title"><div><span>渠道质量</span><strong>简历量 / 复筛通过</strong></div><button>本月 ▾</button></div><div className="channel-list">{channels.map(([name, total, pass]) => <div key={name}><span>{name}</span><i><em style={{ width: `${Number(total)}%` }} /><b style={{ width: `${Number(pass)}%` }} /></i><strong>{total}</strong><small>{pass} 人通过</small></div>)}</div></article>
        <article className="accuracy-card"><div><span>AI 筛选准确率参考</span><strong>86.7<small>%</small></strong><em>基于 124 次人工复筛反馈</em></div><div className="accuracy-ring"><i /><span>目标<br /><b>≥80%</b></span></div><p><i>✓</i>高于验收标准 6.7 个百分点</p></article>
        <article className="bottleneck-card"><div className="panel-title"><div><span>流程洞察</span><strong>本周需要关注</strong></div></div><ul><li><i className="amber">!</i><span><strong>高级产品经理复筛积压</strong><small>8 人等待超过 24 小时</small></span><button onClick={() => notify("已生成催办提醒")}>催办</button></li><li><i className="green">↑</i><span><strong>内推渠道质量最佳</strong><small>复筛通过率达到 64.6%</small></span></li><li><i className="purple">✦</i><span><strong>AI 一致性持续提升</strong><small>较上月提高 5.4%</small></span></li></ul></article>
      </div>
    </div>
  );
}

function ModuleView(props: ModuleProps) {
  if (props.active === "jobs") return <JobsPanel notify={props.notify} />;
  if (props.active === "resumes") return <ResumesPanel notify={props.notify} runBatch={props.runBatch} batchRunning={props.batchRunning} refreshLedger={props.refreshLedger} />;
  if (props.active === "candidates") return <CandidatesPanel setSelected={props.setSelected} notify={props.notify} candidateData={props.candidateData} />;
  if (props.active === "interviews") return <InterviewsPanel notify={props.notify} setSelected={props.setSelected} candidateData={props.candidateData} />;
  if (props.active === "talent") return <TalentPanel setSelected={props.setSelected} notify={props.notify} candidateData={props.candidateData} />;
  return <ReportsPanel notify={props.notify} />;
}

export default function Home() {
  const [active, setActive] = useState("overview");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [candidateData, setCandidateData] = useState<Candidate[]>(candidates);
  const [workflowModal, setWorkflowModal] = useState<WorkflowModal>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("全部");
  const [viewerRole, setViewerRole] = useState("HR 负责人");
  const [hydrated, setHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<"syncing" | "cloud" | "demo">("syncing");
  const [activityLog, setActivityLog] = useState<string[]>([
    "系统完成 18 份简历初筛",
    "林栩的面试资料包已生成",
    "6 位候选人状态已同步",
    "本周招聘看板已更新",
  ]);

  const refreshLedger = async (signal?: AbortSignal) => {
    const response = await fetch("/api/candidates", {
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new Error("台账读取失败");
    const payload = (await response.json()) as {
      candidates: Candidate[];
      activity: string[];
    };
    setCandidateData(payload.candidates.map((candidate) => ({
      ...candidate,
      updated: relativeUpdateLabel(candidate.updated),
    })));
    if (payload.activity.length) setActivityLog(payload.activity);
    setDataSource("cloud");
  };

  useEffect(() => {
    try {
      const storedRole = window.localStorage.getItem("workbuddy-demo-role");
      if (storedRole) setViewerRole(storedRole);
    } catch {
      // Keep the default role when local preferences cannot be read.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("workbuddy-demo-role", viewerRole);
  }, [viewerRole, hydrated]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshLedger(controller.signal).catch((error) => {
      if ((error as Error).name !== "AbortError") setDataSource("demo");
    });
    return () => controller.abort();
  }, []);

  const visibleCandidates = useMemo(() => {
    if (filter === "全部") return candidateData;
    return candidateData.filter((candidate) => candidate.status === filter);
  }, [candidateData, filter]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const runBatch = async () => {
    setBatchRunning(true);
    setBatchDone(false);
    try {
      const response = await fetch("/api/resumes/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        summary?: { total: number; completed: number; duplicates: number; manual: number };
      };
      if (!response.ok) throw new Error(payload.error ?? "简历处理失败");
      await refreshLedger();
      setBatchRunning(false);
      setBatchDone(true);
      if (payload.summary) {
        notify(`已处理 ${payload.summary.total} 份：完成 ${payload.summary.completed}、重复 ${payload.summary.duplicates}、待人工 ${payload.summary.manual}`);
      } else {
        notify(payload.message ?? "没有待处理的简历");
      }
    } catch (error) {
      setBatchRunning(false);
      notify(error instanceof Error ? error.message : "简历处理失败，请稍后重试");
    }
  };

  const addActivity = (message: string) => {
    setActivityLog((current) => [message, ...current].slice(0, 8));
  };

  const updateCandidateStatus = async (candidate: Candidate, status: string, message: string) => {
    const updated = { ...candidate, status, updated: "刚刚" };
    setCandidateData((current) => current.map((item) => item.name === candidate.name ? updated : item));
    setSelected(updated);
    addActivity(message);
    notify(message);
    if (dataSource !== "cloud") return;

    try {
      const response = await fetch("/api/candidates", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: candidate.id, status }),
      });
      if (!response.ok) throw new Error("状态保存失败");
    } catch {
      setCandidateData((current) => current.map((item) => item.id === candidate.id ? candidate : item));
      setSelected(candidate);
      notify("状态未能保存，请稍后重试");
    }
  };

  const startCandidateWorkflow = (candidate: Candidate) => {
    if (["强推荐", "待复筛", "可面试", "人才储备"].includes(candidate.status)) {
      setWorkflowModal({ type: "invite", candidate });
      return;
    }
    if (candidate.status === "复筛通过" || candidate.status === "已邀约") {
      setWorkflowModal({ type: "schedule", candidate });
      return;
    }
    setWorkflowModal({ type: "package", candidate });
  };

  const workflowActionLabel = (status: string) => {
    if (["强推荐", "待复筛", "可面试", "人才储备"].includes(status)) return "复筛通过并生成邀约";
    if (status === "复筛通过") return "发送邀约并安排面试";
    if (status === "已邀约") return "确认面试安排";
    if (status === "已确认面试") return "生成面试资料包";
    return "重新生成资料包";
  };

  const activeLabel = navItems.find((item) => item[0] === active)?.[1] ?? "工作台";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><i /><i /><i /></div>
          <div><strong>WorkBuddy</strong><span>招聘流水线</span></div>
        </div>

        <nav aria-label="主导航">
          <p className="nav-label">工作空间</p>
          {navItems.map(([id, label, icon]) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => {
                setActive(id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="nav-icon">{icon}</span>{label}
              {id === "resumes" && <em>18</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-state">
            <span className="pulse" />
            <div><strong>自动化运行中</strong><small>下次扫描 14:00</small></div>
          </div>
          <button className="profile" onClick={() => notify("已打开个人设置")}>
            <span>王</span><div><strong>王嘉琪</strong><small>招聘负责人</small></div><b>•••</b>
          </button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{active === "overview" ? "下午好，嘉琪" : activeLabel}</h1>
            <p>{active === "overview" ? <>今天有 <strong>12 项</strong> 招聘任务需要关注</> : "WorkBuddy 招聘流水线 · 数据更新于 13:42"}</p>
          </div>
          <div className="top-actions">
            <span className={`data-source ${dataSource}`}>
              <i />{dataSource === "cloud" ? "数据已同步" : dataSource === "syncing" ? "正在同步" : "演示数据"}
            </span>
            <label className="role-switch">
              <span>视角</span>
              <select value={viewerRole} onChange={(event) => {
                setViewerRole(event.target.value);
                notify(`已切换为${event.target.value}视角`);
              }}>
                <option>HR 负责人</option>
                <option>用人经理</option>
              </select>
            </label>
            <label className="search">
              <span>⌕</span>
              <input aria-label="全局搜索" placeholder="搜索候选人、岗位…" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-btn" aria-label="通知" onClick={() => notify("你有 3 条未读通知")}>♢<span>3</span></button>
            <button className="primary" onClick={runBatch} disabled={batchRunning}>
              <b>{batchRunning ? "◌" : "+"}</b>{batchRunning ? "正在解析…" : "批量处理简历"}
            </button>
          </div>
        </header>

        <div className="content">
          {active === "overview" ? <>
          <section className="hero-grid">
            <article className="focus-card">
              <div className="eyebrow"><span /> 今日重点</div>
              <h2>把最重要的候选人<br />推进到下一步</h2>
              <p>3 位强推荐候选人等待复筛，2 场面试资料尚未确认。</p>
              <button onClick={() => {
                setFilter("强推荐");
                document.getElementById("candidate-list")?.scrollIntoView({ behavior: "smooth" });
              }}>查看待办 <span>→</span></button>
              <div className="focus-visual" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="focus-number">12<small>待办</small></div>
              </div>
            </article>

            <article className="metrics-card">
              <div className="card-heading">
                <div><span>本周招聘漏斗</span><strong>整体转化保持健康</strong></div>
                <select aria-label="选择统计周期"><option>本周</option><option>本月</option></select>
              </div>
              <div className="funnel">
                {[
                  ["新增简历", 186, "100%", "wide"],
                  ["AI 初筛通过", 94, "50.5%", "mid"],
                  ["复筛通过", 38, "40.4%", "narrow"],
                  ["确认面试", 21, "55.3%", "tiny"],
                ].map(([label, value, rate, width]) => (
                  <div className={`funnel-row ${width}`} key={label}>
                    <span>{label}</span><strong>{value}</strong><em>{rate}</em>
                  </div>
                ))}
              </div>
              <div className="funnel-note"><i>↑ 8.2%</i><span>较上周整体转化率</span><b>7 个岗位进行中</b></div>
            </article>

            <article className="quick-card">
              <div className="card-heading">
                <div><span>快捷操作</span><strong>常用工作流</strong></div>
              </div>
              <div className="quick-list">
                <button onClick={runBatch}><i className="purple">↥</i><span><strong>上传简历</strong><small>PDF / Word / 图片</small></span><b>→</b></button>
                <button onClick={() => { setActive("jobs"); notify("开始创建岗位标准"); }}><i className="green">◇</i><span><strong>新建岗位标准</strong><small>从 JD 智能生成</small></span><b>→</b></button>
                <button onClick={() => { setActive("reports"); notify("本周报表已生成"); }}><i className="amber">⌁</i><span><strong>生成招聘周报</strong><small>数据更新至 13:42</small></span><b>→</b></button>
              </div>
            </article>
          </section>

          {batchRunning && (
            <div className="processing">
              <div className="processing-icon">AI</div>
              <div><strong>正在处理新增简历</strong><span>文本解析 → 去重校验 → 硬门槛筛选 → 匹配度评分</span></div>
              <div className="progress"><i /></div>
              <em>12 / 18</em>
            </div>
          )}
          {batchDone && !batchRunning && (
            <div className="processing complete">
              <div className="processing-icon">✓</div>
              <div><strong>批次处理完成</strong><span>18 份简历已归档，发现 2 份重复投递，6 人进入复筛</span></div>
              <button onClick={() => setBatchDone(false)}>收起</button>
            </div>
          )}

          <section className="pipeline-section">
            <div className="section-title">
              <div><span>进行中的岗位</span><h2>招聘进度</h2></div>
              <button onClick={() => setActive("jobs")}>查看全部 7 个岗位 <span>→</span></button>
            </div>
            <div className="job-grid">
              {[
                { role: "高级产品经理", dept: "产品与增长部", hc: "2 / 3 HC", count: 42, color: "violet", bars: [42, 21, 8, 4], owner: "JQ", note: "8 人待复筛" },
                { role: "用户增长专家", dept: "市场增长部", hc: "1 / 2 HC", count: 31, color: "teal", bars: [31, 16, 7, 3], owner: "MW", note: "3 场面试本周" },
                { role: "招聘运营经理", dept: "人力资源部", hc: "0 / 1 HC", count: 18, color: "orange", bars: [18, 9, 4, 2], owner: "JQ", note: "2 份资料待确认" },
              ].map((job) => (
                <article className="job-card" key={job.role}>
                  <div className="job-top">
                    <i className={job.color}>{job.role.slice(0, 1)}</i>
                    <div><h3>{job.role}</h3><p>{job.dept}</p></div>
                    <button aria-label={`${job.role}更多操作`} onClick={() => notify(`${job.role}：岗位标准 v3 已生效`)}>•••</button>
                  </div>
                  <div className="hc-row"><span>{job.hc}</span><strong>{job.count} 位候选人</strong></div>
                  <div className="mini-pipeline">
                    {job.bars.map((bar, index) => <i key={index} style={{ width: `${Math.max(22, bar * 2)}%` }} />)}
                  </div>
                  <div className="job-bottom"><span className="avatar">{job.owner}</span><b>{job.note}</b><em>更新于今天</em></div>
                </article>
              ))}
            </div>
          </section>

          <section className="candidates-section" id="candidate-list">
            <div className="section-title candidate-heading">
              <div><span>智能初筛结果</span><h2>最新候选人</h2></div>
              <div className="filters" role="group" aria-label="候选人筛选">
                {["全部", "强推荐", "待复筛", "可面试"].map((item) => (
                  <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
                ))}
              </div>
            </div>
            <div className="candidate-table" role="table" aria-label="候选人列表">
              <div className="table-row table-header" role="row">
                <span>候选人</span><span>应聘岗位</span><span>AI 匹配度</span><span>当前状态</span><span>来源 / 更新时间</span><span />
              </div>
              {visibleCandidates.map((candidate) => (
                <button className="table-row candidate-row" role="row" key={candidate.name} onClick={() => setSelected(candidate)}>
                  <span className="candidate-name"><i className={candidate.tone}>{candidate.initials}</i><b>{candidate.name}<small>{candidate.school}</small></b></span>
                  <span>{candidate.role}<small>{candidate.company}</small></span>
                  <span className={`score score-${candidate.tone}`}><b>{candidate.score}</b><i><em style={{ width: `${candidate.score}%` }} /></i></span>
                  <span><b className={`status ${candidate.tone}`}><i />{candidate.status}</b></span>
                  <span>{candidate.channel}<small>{candidate.updated}</small></span>
                  <span className="row-arrow">→</span>
                </button>
              ))}
            </div>
          </section>

          <section className="activity-section">
            <div className="section-title">
              <div><span>自动化中心</span><h2>WorkBuddy 最近完成</h2></div>
              <button onClick={() => notify("自动化日志已全部读取")}>查看运行日志 <span>→</span></button>
            </div>
            <div className="activity-strip">
              {activityLog.slice(0, 4).map((text, index) => (
                <div key={`${text}-${index}`}><i className={["green", "purple", "blue", "amber"][index]}>{
                  ["✓", "✦", "↗", "⌁"][index]
                }</i><span><strong>{text}</strong><small>{index === 0 ? "刚刚" : `${index * 16 + 2} 分钟前`}</small></span></div>
              ))}
            </div>
          </section>
          </> : (
            <ModuleView
              active={active}
              notify={notify}
              runBatch={runBatch}
              refreshLedger={refreshLedger}
              batchRunning={batchRunning}
              setSelected={setSelected}
              candidateData={candidateData}
            />
          )}
        </div>
      </main>

      {selected && (
        <div className="drawer-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}>
          <aside className="candidate-drawer" aria-label={`${selected.name}候选人详情`}>
            <div className="drawer-top">
              <span>候选人画像</span>
              <button aria-label="关闭详情" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="candidate-profile">
              <div className={`large-avatar ${selected.tone}`}>{selected.initials}</div>
              <div><h2>{selected.name}</h2><p>{selected.role} · {selected.experience}经验</p><b className={`status ${selected.tone}`}><i />{selected.status}</b></div>
              <ScoreRing score={selected.score} small />
            </div>
            <div className="profile-meta">
              <span><small>当前公司</small>{selected.company}</span>
              <span><small>教育背景</small>{selected.school}</span>
              <span><small>简历来源</small>{selected.channel}</span>
              <span><small>最近更新</small>{selected.updated}</span>
            </div>
            <div className="ai-summary">
              <div className="summary-label"><i>✦</i><span>AI 匹配结论</span><em>基于岗位标准 v3</em></div>
              <p>候选人的核心经历与岗位要求高度匹配，在产品策略、跨团队推进和数据驱动方面表现突出，建议优先安排业务面试。</p>
            </div>
            <div className="drawer-section">
              <h3>核心匹配点 <span>{selected.highlights.length} 项</span></h3>
              <ul>{selected.highlights.map((item) => <li key={item}><i>✓</i>{item}</li>)}</ul>
            </div>
            <div className="drawer-section risk-section">
              <h3>风险与深挖方向</h3>
              <p><i>!</i>{selected.risk}</p>
            </div>
            <div className="interview-preview">
              <span>面试筹备</span>
              <div><b>一页纸画像</b><em>已生成</em></div>
              <div><b>定制面试题（12 题）</b><em>已生成</em></div>
              <div><b>标准评价表</b><em>已生成</em></div>
            </div>
            <div className="drawer-section workflow-timeline">
              <h3>流程轨迹</h3>
              {[
                ["简历入库并完成初筛", "今天 10:12"],
                [selected.score >= 80 ? "AI 判定为强推荐" : "AI 完成匹配度评分", "今天 10:13"],
                [selected.status, selected.updated],
              ].map(([event, time], index) => <div key={`${event}-${index}`}><i>{index === 2 ? "●" : "✓"}</i><span><strong>{event}</strong><small>{time}</small></span></div>)}
            </div>
            <div className="drawer-actions">
              <button onClick={() => notify("已打开完整面试资料包")}>查看资料包</button>
              <button className="primary" onClick={() => startCandidateWorkflow(selected)}>{workflowActionLabel(selected.status)}</button>
            </div>
          </aside>
        </div>
      )}

      {workflowModal && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setWorkflowModal(null);
        }}>
          <section className="workflow-modal" role="dialog" aria-modal="true" aria-label="候选人流程操作">
            <div className="modal-head">
              <div><span>WORKBUDDY AUTOMATION</span><h2>{workflowModal.type === "invite" ? "确认邀约内容" : workflowModal.type === "schedule" ? "确认面试安排" : "生成面试资料包"}</h2><p>{workflowModal.candidate.name} · {workflowModal.candidate.role}</p></div>
              <button aria-label="关闭" onClick={() => setWorkflowModal(null)}>×</button>
            </div>
            {workflowModal.type === "invite" && (
              <div className="invite-editor">
                <div className="invite-tabs"><button className="active">邮件正式版</button><button>即时通讯版</button><span>AI 已结合候选人经历个性化生成</span></div>
                <label>邮件主题<input defaultValue={`【面试邀请】${workflowModal.candidate.role} - WorkBuddy`} /></label>
                <label>邀约正文<textarea rows={8} defaultValue={`${workflowModal.candidate.name}，您好：\n\n感谢您关注我们的「${workflowModal.candidate.role}」岗位。您的${workflowModal.candidate.highlights[0]}经历与岗位需求非常匹配，我们诚邀您参加业务面试。\n\n面试形式：线上视频面试\n可选时间：7 月 30 日 10:00 / 14:30\n联系人：王嘉琪\n\n期待与您交流。`} /></label>
                <div className="message-check"><i>✓</i><span><strong>隐私与信息检查通过</strong><small>岗位、时间、面试形式与联系人信息完整</small></span></div>
              </div>
            )}
            {workflowModal.type === "schedule" && (
              <div className="schedule-form">
                <label>面试日期<input type="date" defaultValue="2026-07-30" /></label>
                <label>开始时间<select defaultValue="14:30"><option>10:00</option><option>14:30</option><option>16:00</option></select></label>
                <label>面试形式<select defaultValue="腾讯会议"><option>腾讯会议</option><option>飞书会议</option><option>线下面试</option></select></label>
                <label>面试官<select defaultValue="刘明 · 产品负责人"><option>刘明 · 产品负责人</option><option>孟玮 · 增长负责人</option><option>王嘉琪 · 招聘负责人</option></select></label>
                <div className="schedule-summary"><i>▣</i><span><strong>面试前 2 小时自动提醒</strong><small>将同时通知候选人、面试官和负责 HR，并附带资料包路径。</small></span></div>
              </div>
            )}
            {workflowModal.type === "package" && (
              <div className="package-builder">
                {[["候选人一页纸画像", "核心信息、匹配点、业绩亮点、风险方向", "已生成"], ["定制化面试题库", "动机、专业、简历深挖、软素质共 12 题", "已生成"], ["岗位面试评价表", "4 项能力维度、分项评分与综合评价", "已生成"]].map(([title, desc, state], index) => <div key={title}><i>{index + 1}</i><span><strong>{title}</strong><small>{desc}</small></span><em>{state}</em></div>)}
                <div className="package-path"><span>归档位置</span><code>/招聘流水线/{workflowModal.candidate.role}/面试资料/{workflowModal.candidate.name}/</code></div>
              </div>
            )}
            <div className="modal-actions">
              <button onClick={() => setWorkflowModal(null)}>取消</button>
              <button className="primary" onClick={() => {
                if (workflowModal.type === "invite") {
                  updateCandidateStatus(workflowModal.candidate, "已邀约", `${workflowModal.candidate.name}已复筛通过，邀约内容已保存`);
                } else if (workflowModal.type === "schedule") {
                  updateCandidateStatus(workflowModal.candidate, "已确认面试", `${workflowModal.candidate.name}已确认 7 月 30 日面试`);
                } else {
                  updateCandidateStatus(workflowModal.candidate, "资料已就绪", `${workflowModal.candidate.name}的面试资料包已生成`);
                }
                setWorkflowModal(null);
              }}>{workflowModal.type === "invite" ? "保存并标记已邀约" : workflowModal.type === "schedule" ? "确认安排并生成资料" : "确认归档资料包"}</button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}
