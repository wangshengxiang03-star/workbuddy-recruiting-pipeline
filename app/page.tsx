"use client";

import { useMemo, useState } from "react";

type Candidate = {
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

const candidates: Candidate[] = [
  {
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

export default function Home() {
  const [active, setActive] = useState("overview");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("全部");

  const visibleCandidates = useMemo(() => {
    if (filter === "全部") return candidates;
    return candidates.filter((candidate) => candidate.status === filter);
  }, [filter]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const runBatch = () => {
    setBatchRunning(true);
    setBatchDone(false);
    window.setTimeout(() => {
      setBatchRunning(false);
      setBatchDone(true);
      notify("18 份新增简历已完成解析与初筛");
    }, 1600);
  };

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
                if (id !== "overview") notify(`${label}模块已切换，当前展示概览数据`);
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
            <h1>下午好，嘉琪</h1>
            <p>今天有 <strong>12 项</strong> 招聘任务需要关注</p>
          </div>
          <div className="top-actions">
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
          {active !== "overview" && (
            <div className="section-banner">
              <div>
                <span>模块视图</span>
                <h2>{navItems.find((item) => item[0] === active)?.[1]}</h2>
                <p>相关业务数据已按当前权限汇总，完整工作流可从候选人列表继续操作。</p>
              </div>
              <button onClick={() => setActive("overview")}>返回工作台</button>
            </div>
          )}

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
              {[
                ["✓", "完成 18 份简历初筛", "2 分钟前", "green"],
                ["✦", "生成林栩面试资料包", "18 分钟前", "purple"],
                ["↗", "同步 6 位候选人状态", "34 分钟前", "blue"],
                ["⌁", "更新本周招聘看板", "1 小时前", "amber"],
              ].map(([icon, text, time, tone]) => (
                <div key={text}><i className={tone}>{icon}</i><span><strong>{text}</strong><small>{time}</small></span></div>
              ))}
            </div>
          </section>
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
            <div className="drawer-actions">
              <button onClick={() => notify("已打开完整面试资料包")}>查看资料包</button>
              <button className="primary" onClick={() => notify(`已将 ${selected.name} 标记为复筛通过并生成邀约话术`)}>复筛通过</button>
            </div>
          </aside>
        </div>
      )}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}
