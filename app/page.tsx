"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CandidateProfile = {
  summary: string;
  experience: string;
  education: string;
  backgrounds: string[];
  capabilities: string[];
  bonusSignals: string[];
  verificationPoints: string[];
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

export default function Home() {
  const [view, setView] = useState<View>("profile");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
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

      {toast && <div className="mvp-toast"><i>✓</i>{toast}</div>}
    </div>
  );
}

function ProfileView({ job, onContinue }: { job: Job; onContinue: () => void }) {
  const profile = job.candidateProfile;
  return (
    <div className="profile-page">
      <section className="page-intro">
        <div>
          <span>01 · CANDIDATE PERSONA</span>
          <h2>这个岗位，应该找什么样的人？</h2>
          <p>系统根据 JD 提炼候选人的典型背景、核心能力和必须核验的条件。</p>
        </div>
        <button className="primary-action" onClick={onContinue}>去筛选简历 <b>→</b></button>
      </section>

      <section className="profile-hero">
        <div className="role-monogram">{job.role.slice(0, 1)}</div>
        <div>
          <span>{job.department} · {job.version}</span>
          <h3>{job.role}</h3>
          <p>{profile.summary}</p>
        </div>
        <div className="profile-meta">
          <span>经验要求<strong>{profile.experience}</strong></span>
          <span>学历偏好<strong>{profile.education}</strong></span>
        </div>
      </section>

      <div className="profile-grid">
        <article className="profile-card capability-card">
          <div className="card-heading"><i>01</i><span><strong>核心能力</strong><small>简历和面试的重点判断项</small></span></div>
          <div className="capability-list">
            {profile.capabilities.map((item, index) => (
              <div key={item}>
                <em>{String(index + 1).padStart(2, "0")}</em>
                <strong>{item}</strong>
                <span><i style={{ width: `${92 - index * 7}%` }} /></span>
              </div>
            ))}
          </div>
        </article>

        <article className="profile-card">
          <div className="card-heading"><i>02</i><span><strong>典型背景</strong><small>更可能快速进入状态的经历</small></span></div>
          <ul className="signal-list">
            {profile.backgrounds.map((item) => <li key={item}><i>✓</i>{item}</li>)}
          </ul>
        </article>

        <article className="profile-card">
          <div className="card-heading"><i>03</i><span><strong>加分信号</strong><small>不是硬门槛，但值得优先关注</small></span></div>
          <ul className="signal-list bonus">
            {profile.bonusSignals.map((item) => <li key={item}><i>＋</i>{item}</li>)}
          </ul>
        </article>

        <article className="profile-card verification-card">
          <div className="card-heading"><i>04</i><span><strong>必须核验</strong><small>简历初筛与面试均需确认</small></span></div>
          <div className="verification-list">
            {profile.verificationPoints.map((item) => (
              <div key={item}><i>!</i><span>{item}</span><em>待核验</em></div>
            ))}
          </div>
        </article>
      </div>

      <details className="jd-source">
        <summary>查看原始 JD <span>展开</span></summary>
        <p>{job.jdText}</p>
      </details>
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
