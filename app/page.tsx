"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CandidateProfile = {
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

type InterviewQuestion = {
  category: string;
  question: string;
  focus: string;
  followUp: string;
};

type Job = {
  id: string;
  role: string;
  department: string;
  jdText: string;
  supplementalRequirements: string;
  version: string;
  owner: string;
  headcount: number;
  gates: string[];
  interviewDimensions: string[];
  candidateProfile: CandidateProfile;
  interviewQuestions: InterviewQuestion[];
  updatedAt: string;
};

type ResumeRecord = {
  id: string;
  name: string;
  role: string;
  status: string;
  score: number | null;
  result: string;
  tags: string[];
  errorMessage: string | null;
  createdAt: string;
};

type View = "profile" | "screening" | "questions";

const navItems: Array<{
  id: View;
  index: string;
  label: string;
  description: string;
}> = [
  { id: "profile", index: "01", label: "岗位画像", description: "从 JD 看清要找什么人" },
  { id: "screening", index: "02", label: "简历初筛", description: "提取标签与初筛建议" },
  { id: "questions", index: "03", label: "面试问题", description: "带着问题直接去面试" },
];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scoreTone(score: number | null) {
  if (score === null) return "neutral";
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  return "reserve";
}

function lines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\n|；|;/)
    .map((item) => item.replace(/^[-*•\d.\s]+/, "").trim())
    .filter(Boolean);
}

function profileMarkdown(job: Job) {
  const profile = job.candidateProfile;
  const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
  return `# ${job.role}｜候选人画像

> ${profile.summary}

## 岗位使命
${profile.mission}

## 理想候选人
- 经验：${profile.experience}
- 学历：${profile.education}
- 职级定位：${profile.seniority}

## 必须满足
${list(profile.mustHaves)}

## 核心能力与证据
${profile.capabilityDetails
  .map((item) => `### ${item.name}（${item.priority}）\n- 为什么重要：${item.why}\n- 判断证据：${item.evidence}`)
  .join("\n\n")}

## 典型背景
${list(profile.backgrounds)}

## 加分信号
${list(profile.bonusSignals)}

## 推荐搜索职位
${list(profile.targetTitles)}

## 搜索关键词
${list(profile.searchKeywords)}

## 风险信号
${list(profile.redFlags)}

## 待业务确认
${list(profile.openQuestions)}

---
岗位版本：${job.version}｜更新时间：${formatTime(job.updatedAt)}
`;
}

export default function Home() {
  const [view, setView] = useState<View>("profile");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showReanalyze, setShowReanalyze] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const loadResumes = async () => {
    const response = await fetch("/api/resumes", { cache: "no-store" });
    if (!response.ok) throw new Error("简历读取失败");
    const payload = (await response.json()) as { files: ResumeRecord[] };
    setResumes(payload.files);
  };

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [jobResponse, resumeResponse] = await Promise.all([
          fetch("/api/jobs", { cache: "no-store" }),
          fetch("/api/resumes", { cache: "no-store" }),
        ]);
        if (!jobResponse.ok || !resumeResponse.ok) throw new Error("数据读取失败");
        const [jobPayload, resumePayload] = (await Promise.all([
          jobResponse.json(),
          resumeResponse.json(),
        ])) as [{ jobs: Job[] }, { files: ResumeRecord[] }];
        if (!active) return;
        setJobs(jobPayload.jobs);
        setSelectedJobId(jobPayload.jobs[0]?.id ?? "");
        setResumes(resumePayload.files);
      } catch {
        if (active) setToast("数据同步失败，请刷新重试");
      } finally {
        if (active) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const createJob = async (formData: FormData) => {
    setCreating(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role: formData.get("role"),
          department: formData.get("department"),
          jdText: formData.get("jdText"),
          supplementalRequirements: formData.get("supplementalRequirements"),
          headcount: 1,
        }),
      });
      const payload = (await response.json()) as { job?: Job; error?: string };
      if (!response.ok || !payload.job) {
        throw new Error(payload.error ?? "岗位创建失败");
      }
      setJobs((current) => [payload.job!, ...current]);
      setSelectedJobId(payload.job.id);
      setShowCreate(false);
      setView("profile");
      notify("岗位画像和面试问题已生成");
    } catch (error) {
      notify(error instanceof Error ? error.message : "岗位创建失败");
    } finally {
      setCreating(false);
    }
  };

  const uploadResumes = async (files: FileList | null) => {
    if (!files?.length) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      const uploadResponse = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = (await uploadResponse.json()) as {
        files?: ResumeRecord[];
        error?: string;
      };
      if (!uploadResponse.ok || !uploadPayload.files) {
        throw new Error(uploadPayload.error ?? "简历上传失败");
      }
      const ids = uploadPayload.files.map((file) => file.id);
      const processResponse = await fetch("/api/resumes/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const processPayload = (await processResponse.json()) as {
        summary?: { total: number; completed: number; manual: number };
        error?: string;
      };
      if (!processResponse.ok) {
        throw new Error(processPayload.error ?? "简历处理失败");
      }
      await loadResumes();
      notify(
        processPayload.summary
          ? `已完成 ${processPayload.summary.total} 份简历初筛`
          : "简历已进入初筛队列",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "简历处理失败");
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const copyQuestions = async () => {
    if (!selectedJob) return;
    const content = selectedJob.interviewQuestions
      .map(
        (item, index) =>
          `${index + 1}. 【${item.category}】${item.question}\n考察：${item.focus}\n追问：${item.followUp}`,
      )
      .join("\n\n");
    await navigator.clipboard.writeText(content);
    notify("全部面试问题已复制");
  };

  const replaceJob = (job: Job) => {
    setJobs((current) => current.map((item) => (item.id === job.id ? job : item)));
  };

  const patchJob = async (payload: Record<string, unknown>) => {
    if (!selectedJob) throw new Error("请先选择岗位");
    const response = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selectedJob.id, ...payload }),
    });
    const result = (await response.json()) as { job?: Job; error?: string };
    if (!response.ok || !result.job) throw new Error(result.error ?? "保存失败");
    replaceJob(result.job);
    return result.job;
  };

  const saveProfile = async (formData: FormData) => {
    if (!selectedJob) return;
    setSaving(true);
    try {
      const capabilityNames = lines(formData.get("capabilities"));
      const previous = new Map(
        selectedJob.candidateProfile.capabilityDetails.map((item) => [item.name, item]),
      );
      const candidateProfile: CandidateProfile = {
        ...selectedJob.candidateProfile,
        summary: String(formData.get("summary") ?? "").trim(),
        mission: String(formData.get("mission") ?? "").trim(),
        experience: String(formData.get("experience") ?? "").trim(),
        education: String(formData.get("education") ?? "").trim(),
        seniority: String(formData.get("seniority") ?? "").trim(),
        backgrounds: lines(formData.get("backgrounds")),
        capabilities: capabilityNames,
        capabilityDetails: capabilityNames.map((name, index) =>
          previous.get(name) ?? {
            name,
            priority: index < 2 ? "核心" : index < 4 ? "重要" : "辅助",
            why: `支持候选人承担${selectedJob.role}的关键工作`,
            evidence: "能用完整案例说明目标、方法、个人贡献和结果",
          },
        ),
        mustHaves: lines(formData.get("mustHaves")),
        verificationPoints: lines(formData.get("mustHaves")),
        bonusSignals: lines(formData.get("bonusSignals")),
        targetTitles: lines(formData.get("targetTitles")),
        searchKeywords: lines(formData.get("searchKeywords")),
        redFlags: lines(formData.get("redFlags")),
        openQuestions: lines(formData.get("openQuestions")),
      };
      await patchJob({ candidateProfile });
      setShowEditProfile(false);
      notify("岗位画像已保存为新版本");
    } catch (error) {
      notify(error instanceof Error ? error.message : "画像保存失败");
    } finally {
      setSaving(false);
    }
  };

  const reanalyzeJob = async (formData: FormData) => {
    setSaving(true);
    try {
      await patchJob({
        role: formData.get("role"),
        department: formData.get("department"),
        jdText: formData.get("jdText"),
        supplementalRequirements: formData.get("supplementalRequirements"),
        regenerateProfile: true,
      });
      setShowReanalyze(false);
      notify("已根据最新 JD 重新生成岗位画像");
    } catch (error) {
      notify(error instanceof Error ? error.message : "重新分析失败");
    } finally {
      setSaving(false);
    }
  };

  const copyProfile = async () => {
    if (!selectedJob) return;
    await navigator.clipboard.writeText(profileMarkdown(selectedJob));
    notify("岗位画像已复制");
  };

  const exportProfile = () => {
    if (!selectedJob) return;
    const blob = new Blob([profileMarkdown(selectedJob)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedJob.role}-候选人画像.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("岗位画像文档已导出");
  };

  return (
    <div className="mvp-shell">
      <aside className="mvp-sidebar">
        <div className="mvp-brand">
          <div className="brand-symbol"><i /><i /><i /></div>
          <div>
            <strong>WorkBuddy</strong>
            <span>招聘判断助手</span>
          </div>
        </div>

        <div className="mvp-scope">
          <span>MVP · 三步完成</span>
          <strong>从 JD 到面试</strong>
        </div>

        <nav aria-label="MVP 功能">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <em>{item.index}</em>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <b>→</b>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <i>✓</i>
          <span>
            <strong>聚焦关键判断</strong>
            <small>不替代最终人工决策</small>
          </span>
        </div>
      </aside>

      <main className="mvp-main">
        <header className="mvp-topbar">
          <div>
            <span>WORKBUDDY MVP</span>
            <h1>{navItems.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="job-switcher">
            <label htmlFor="job-select">当前岗位</label>
            <select
              id="job-select"
              value={selectedJob?.id ?? ""}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              {jobs.map((job) => (
                <option value={job.id} key={job.id}>
                  {job.role} · {job.department}
                </option>
              ))}
            </select>
            <button onClick={() => setShowCreate(true)}>＋ 创建岗位</button>
          </div>
        </header>

        <div className="mvp-content">
          {loading ? (
            <div className="loading-state">
              <i />
              <strong>正在准备招聘判断工作区</strong>
              <span>同步岗位与简历数据…</span>
            </div>
          ) : !selectedJob ? (
            <div className="empty-state">
              <span>从一个岗位开始</span>
              <h2>粘贴 JD，立即生成候选人画像和面试问题</h2>
              <p>无需配置复杂流程，创建岗位后即可继续上传简历。</p>
              <button onClick={() => setShowCreate(true)}>创建第一个岗位</button>
            </div>
          ) : (
            <>
              {view === "profile" && (
                <ProfileView
                  job={selectedJob}
                  onContinue={() => setView("screening")}
                  onCopy={() => void copyProfile()}
                  onExport={exportProfile}
                  onEdit={() => setShowEditProfile(true)}
                  onReanalyze={() => setShowReanalyze(true)}
                />
              )}
              {view === "screening" && (
                <ScreeningView
                  job={selectedJob}
                  resumes={resumes}
                  processing={processing}
                  fileInput={fileInput}
                  onFiles={uploadResumes}
                  onContinue={() => setView("questions")}
                />
              )}
              {view === "questions" && (
                <QuestionsView job={selectedJob} onCopy={copyQuestions} />
              )}
            </>
          )}
        </div>
      </main>

      {showCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCreate(false);
          }}
        >
          <section className="job-modal" role="dialog" aria-modal="true" aria-label="创建岗位">
            <div className="modal-heading">
              <div>
                <span>CREATE A ROLE</span>
                <h2>创建岗位</h2>
                <p>输入 JD 后，系统会同时生成候选人画像与面试问题。</p>
              </div>
              <button aria-label="关闭" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form action={(formData) => void createJob(formData)}>
              <div className="field-row">
                <label>
                  岗位名称
                  <input name="role" required placeholder="例如：高级产品经理" />
                </label>
                <label>
                  所属部门
                  <input name="department" required placeholder="例如：产品与增长部" />
                </label>
              </div>
              <label>
                岗位 JD
                <textarea
                  name="jdText"
                  required
                  rows={10}
                  placeholder="粘贴岗位职责、任职要求、经验要求、能力要求等完整 JD…"
                />
              </label>
              <label>
                补充要求 <span>可选</span>
                <textarea
                  name="supplementalRequirements"
                  rows={3}
                  placeholder="例如：必须有 B 端经验；希望有 0→1 项目经历"
                />
              </label>
              <div className="modal-note">
                <i>✦</i>
                <span>
                  <strong>创建后自动生成</strong>
                  <small>候选人画像、关键核验点、6 道结构化面试问题</small>
                </span>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreate(false)}>取消</button>
                <button className="primary" disabled={creating} type="submit">
                  {creating ? "正在分析 JD…" : "创建并分析岗位"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showEditProfile && selectedJob && (
        <ProfileEditorModal
          job={selectedJob}
          saving={saving}
          onClose={() => setShowEditProfile(false)}
          onSave={saveProfile}
        />
      )}

      {showReanalyze && selectedJob && (
        <ReanalyzeModal
          job={selectedJob}
          saving={saving}
          onClose={() => setShowReanalyze(false)}
          onSave={reanalyzeJob}
        />
      )}

      {toast && <div className="mvp-toast"><i>✓</i>{toast}</div>}
    </div>
  );
}

function ProfileView({
  job,
  onContinue,
  onCopy,
  onExport,
  onEdit,
  onReanalyze,
}: {
  job: Job;
  onContinue: () => void;
  onCopy: () => void;
  onExport: () => void;
  onEdit: () => void;
  onReanalyze: () => void;
}) {
  const profile = job.candidateProfile;
  return (
    <div className="profile-page">
      <section className="page-intro">
        <div>
          <span>01 · CANDIDATE PERSONA</span>
          <h2>这个岗位，应该找什么样的人？</h2>
          <p>把 JD 翻译成一份可用于寻访、筛选和校准招聘团队的候选人画像。</p>
        </div>
        <div className="profile-actions">
          <button onClick={onCopy}>复制画像</button>
          <button onClick={onExport}>导出文档</button>
          <button onClick={onEdit}>编辑画像</button>
          <button className="primary" onClick={onReanalyze}>修改 JD / 重新分析</button>
        </div>
      </section>

      <section className="profile-hero">
        <div className="role-monogram">{job.role.slice(0, 1)}</div>
        <div>
          <span>{job.department} · {job.version} · 更新于 {formatTime(job.updatedAt)}</span>
          <h3>{job.role}</h3>
          <p>{profile.summary}</p>
        </div>
        <div className="profile-meta">
          <span>经验要求<strong>{profile.experience}</strong></span>
          <span>学历偏好<strong>{profile.education}</strong></span>
        </div>
      </section>

      <section className="profile-brief">
        <article>
          <span>岗位使命</span>
          <h3>{profile.mission}</h3>
        </article>
        <article>
          <span>职级定位</span>
          <p>{profile.seniority}</p>
        </article>
        <article className={profile.openQuestions.length ? "needs-input" : ""}>
          <span>画像完整度</span>
          <strong>{profile.openQuestions.length ? `${profile.openQuestions.length} 项待确认` : "信息完整"}</strong>
          <small>{profile.openQuestions.length ? "补齐信息后可再次分析" : "可直接用于寻访与筛选"}</small>
        </article>
      </section>

      <div className="profile-grid profile-grid-rich">
        <article className="profile-card must-have-card">
          <div className="card-heading"><i>01</i><span><strong>必须满足</strong><small>不满足时原则上不进入下一轮</small></span></div>
          <div className="must-have-list">
            {profile.mustHaves.map((item, index) => (
              <div key={item}><em>{index + 1}</em><span>{item}</span><b>硬条件</b></div>
            ))}
          </div>
        </article>

        <article className="profile-card">
          <div className="card-heading"><i>02</i><span><strong>典型人才背景</strong><small>更可能快速进入状态</small></span></div>
          <ul className="signal-list">
            {profile.backgrounds.map((item) => <li key={item}><i>✓</i>{item}</li>)}
          </ul>
          <div className="card-subsection">
            <strong>加分信号</strong>
            <div className="keyword-cloud bonus">
              {profile.bonusSignals.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </article>

        <article className="profile-card capability-evidence-card">
          <div className="card-heading"><i>03</i><span><strong>核心能力与判断证据</strong><small>不只看关键词，要看真实行为和结果</small></span></div>
          <div className="capability-evidence-list">
            {profile.capabilityDetails.map((item, index) => (
              <div key={`${item.name}-${index}`}>
                <div><em>{String(index + 1).padStart(2, "0")}</em><strong>{item.name}</strong><b>{item.priority}</b></div>
                <p>{item.why}</p>
                <small><i>证据</i>{item.evidence}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="profile-card sourcing-card">
          <div className="card-heading"><i>04</i><span><strong>去哪里找这类人</strong><small>可直接用于招聘网站与人才库检索</small></span></div>
          <div className="card-subsection first">
            <strong>目标职位名称</strong>
            <div className="keyword-cloud">
              {profile.targetTitles.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <div className="card-subsection">
            <strong>搜索关键词</strong>
            <div className="keyword-cloud purple">
              {profile.searchKeywords.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </article>

        <article className="profile-card risk-card">
          <div className="card-heading"><i>05</i><span><strong>风险信号</strong><small>看到这些情况，需要继续追问证据</small></span></div>
          <ul>
            {profile.redFlags.map((item) => <li key={item}><i>!</i><span>{item}</span></li>)}
          </ul>
        </article>

        <article className="profile-card open-question-card">
          <div className="card-heading"><i>06</i><span><strong>待业务确认</strong><small>JD 没有说清楚的关键招聘条件</small></span></div>
          {profile.openQuestions.length ? (
            <ol>
              {profile.openQuestions.map((item) => <li key={item}>{item}</li>)}
            </ol>
          ) : (
            <p className="all-clear">✓ 当前 JD 信息较完整，暂无关键待确认项</p>
          )}
          <button onClick={onReanalyze}>补充信息并重新分析</button>
        </article>
      </div>

      <details className="jd-source">
        <summary>查看分析依据（原始 JD 与补充要求）<span>展开</span></summary>
        <p>{job.jdText}{job.supplementalRequirements ? `\n\n补充要求：\n${job.supplementalRequirements}` : ""}</p>
      </details>
      <div className="profile-next">
        <div><span>画像已准备好</span><strong>下一步可按这些条件筛选简历</strong></div>
        <button className="primary-action" onClick={onContinue}>去筛选简历 <b>→</b></button>
      </div>
    </div>
  );
}

function ProfileEditorModal({
  job,
  saving,
  onClose,
  onSave,
}: {
  job: Job;
  saving: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  const profile = job.candidateProfile;
  const joined = (items: string[]) => items.join("\n");
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="job-modal profile-editor" role="dialog" aria-modal="true" aria-label="编辑岗位画像">
        <div className="modal-heading">
          <div><span>CALIBRATE PERSONA</span><h2>人工校准岗位画像</h2><p>保存后生成新版本，不会修改原始 JD。</p></div>
          <button aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <form action={(formData) => void onSave(formData)}>
          <label>一句话画像<textarea name="summary" required rows={2} defaultValue={profile.summary} /></label>
          <label>岗位使命<textarea name="mission" required rows={3} defaultValue={profile.mission} /></label>
          <div className="field-row">
            <label>经验要求<input name="experience" required defaultValue={profile.experience} /></label>
            <label>学历偏好<input name="education" required defaultValue={profile.education} /></label>
          </div>
          <label>职级定位<textarea name="seniority" required rows={2} defaultValue={profile.seniority} /></label>
          <div className="editor-grid">
            <label>必须满足 <span>每行一项</span><textarea name="mustHaves" rows={5} defaultValue={joined(profile.mustHaves)} /></label>
            <label>核心能力 <span>每行一项</span><textarea name="capabilities" rows={5} defaultValue={joined(profile.capabilities)} /></label>
            <label>典型背景 <span>每行一项</span><textarea name="backgrounds" rows={5} defaultValue={joined(profile.backgrounds)} /></label>
            <label>加分信号 <span>每行一项</span><textarea name="bonusSignals" rows={5} defaultValue={joined(profile.bonusSignals)} /></label>
            <label>目标职位名称 <span>每行一项</span><textarea name="targetTitles" rows={5} defaultValue={joined(profile.targetTitles)} /></label>
            <label>搜索关键词 <span>每行一项</span><textarea name="searchKeywords" rows={5} defaultValue={joined(profile.searchKeywords)} /></label>
            <label>风险信号 <span>每行一项</span><textarea name="redFlags" rows={5} defaultValue={joined(profile.redFlags)} /></label>
            <label>待确认问题 <span>每行一项</span><textarea name="openQuestions" rows={5} defaultValue={joined(profile.openQuestions)} /></label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>取消</button>
            <button className="primary" disabled={saving} type="submit">{saving ? "正在保存…" : "保存为新版本"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ReanalyzeModal({
  job,
  saving,
  onClose,
  onSave,
}: {
  job: Job;
  saving: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="job-modal" role="dialog" aria-modal="true" aria-label="重新分析岗位">
        <div className="modal-heading">
          <div><span>REANALYZE ROLE</span><h2>修改 JD 并重新分析</h2><p>系统会重新生成岗位画像、硬条件与能力维度。</p></div>
          <button aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <form action={(formData) => void onSave(formData)}>
          <div className="field-row">
            <label>岗位名称<input name="role" required defaultValue={job.role} /></label>
            <label>所属部门<input name="department" required defaultValue={job.department} /></label>
          </div>
          <label>岗位 JD<textarea name="jdText" required rows={12} defaultValue={job.jdText} /></label>
          <label>补充要求 <span>建议补充目标、团队、汇报线、职级与地点</span><textarea name="supplementalRequirements" rows={5} defaultValue={job.supplementalRequirements} /></label>
          <div className="modal-note"><i>↻</i><span><strong>会生成新的画像版本</strong><small>人工编辑过的画像会被新分析结果替换，请先导出需要保留的内容。</small></span></div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>取消</button>
            <button className="primary" disabled={saving} type="submit">{saving ? "正在重新分析…" : "保存并重新分析"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ScreeningView({
  job,
  resumes,
  processing,
  fileInput,
  onFiles,
  onContinue,
}: {
  job: Job;
  resumes: ResumeRecord[];
  processing: boolean;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onContinue: () => void;
}) {
  const filtered = resumes.filter(
    (resume) => resume.role === job.role || resume.role === "待识别岗位",
  );
  return (
    <div className="screening-page">
      <section className="page-intro">
        <div>
          <span>02 · RESUME TAGGING</span>
          <h2>上传简历，先看标签再做判断</h2>
          <p>自动提取学校、学历、年限、岗位经历与核心能力标签，并给出初筛建议。</p>
        </div>
        <button className="primary-action" onClick={onContinue}>查看面试问题 <b>→</b></button>
      </section>

      <input
        ref={fileInput}
        hidden
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
        onChange={(event) => void onFiles(event.target.files)}
      />
      <button
        className={`upload-zone ${processing ? "processing" : ""}`}
        onClick={() => fileInput.current?.click()}
        disabled={processing}
      >
        <i>{processing ? "···" : "↑"}</i>
        <span>
          <strong>{processing ? "正在提取信息并生成标签" : "上传简历开始初筛"}</strong>
          <small>支持 PDF、Word、图片 · 单次最多 100 份</small>
        </span>
        <em>{job.role}</em>
      </button>

      <div className="screening-summary">
        <span>当前岗位<strong>{job.role}</strong></span>
        <span>已处理<strong>{filtered.length} 份</strong></span>
        <span>推荐进入面试<strong>{filtered.filter((item) => (item.score ?? 0) >= 60).length} 人</strong></span>
      </div>

      <section className="resume-results">
        <div className="section-heading">
          <div><span>SCREENING RESULTS</span><h3>初筛结果</h3></div>
          <small>AI 标签用于提高阅读效率，最终判断由招聘人员完成</small>
        </div>
        {filtered.length ? (
          <div className="resume-list">
            {filtered.map((resume) => (
              <article className="resume-card" key={resume.id}>
                <div className="file-badge">{resume.name.split(".").pop()?.slice(0, 3).toUpperCase()}</div>
                <div className="resume-main">
                  <div className="resume-title">
                    <div><strong>{resume.name}</strong><span>{formatTime(resume.createdAt)}</span></div>
                    <em className={scoreTone(resume.score)}>{resume.status}</em>
                  </div>
                  <div className="tag-row">
                    {(resume.tags.length ? resume.tags : ["等待生成标签"]).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  {resume.errorMessage && <p className="resume-error">{resume.errorMessage}</p>}
                </div>
                <div className={`score-box ${scoreTone(resume.score)}`}>
                  <span>岗位匹配</span>
                  <strong>{resume.score ?? "—"}{resume.score !== null && <small>分</small>}</strong>
                  <em>{resume.result}</em>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <i>⌁</i>
            <strong>还没有这个岗位的简历</strong>
            <span>上传一份简历，即可看到学校、经验和能力标签。</span>
          </div>
        )}
      </section>
    </div>
  );
}

function QuestionsView({ job, onCopy }: { job: Job; onCopy: () => void }) {
  return (
    <div className="questions-page">
      <section className="page-intro">
        <div>
          <span>03 · INTERVIEW QUESTIONS</span>
          <h2>围绕 JD，问到真正有判断力的信息</h2>
          <p>每道问题都包含考察重点和建议追问，面试官拿来即可使用。</p>
        </div>
        <button className="primary-action" onClick={() => void onCopy()}>复制全部问题 <b>⌘</b></button>
      </section>

      <section className="question-context">
        <div className="role-monogram small">{job.role.slice(0, 1)}</div>
        <div>
          <span>面试题单</span>
          <strong>{job.role}</strong>
          <small>{job.department} · 共 {job.interviewQuestions.length} 题</small>
        </div>
        <p>覆盖经历验证、专业能力、业务场景、硬门槛和求职动机</p>
      </section>

      <div className="question-list">
        {job.interviewQuestions.map((item, index) => (
          <article className="question-card" key={`${item.category}-${index}`}>
            <div className="question-index">{String(index + 1).padStart(2, "0")}</div>
            <div className="question-body">
              <span>{item.category}</span>
              <h3>{item.question}</h3>
              <div className="question-notes">
                <p><i>考察</i>{item.focus}</p>
                <p><i>追问</i>{item.followUp}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="interview-tip">
        <i>i</i>
        <p><strong>使用建议</strong><span>不必逐题照读。优先围绕候选人的真实案例追问“你做了什么、为什么这样做、结果如何”。</span></p>
      </div>
    </div>
  );
}
