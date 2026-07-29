import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { activityLogs, candidates, jobs, resumeFiles } from "./schema";

let schemaReady: Promise<void> | null = null;

export function ensureDatabaseSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const db = getDb();
    const d1 = db.$client;
    await d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS candidates (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        initials text NOT NULL,
        role text NOT NULL,
        score integer NOT NULL,
        status text NOT NULL,
        tone text NOT NULL,
        school text NOT NULL,
        company text NOT NULL,
        experience text NOT NULL,
        channel text NOT NULL,
        highlights text NOT NULL,
        risk text NOT NULL,
        owner_email text,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS jobs (
        id text PRIMARY KEY NOT NULL,
        role text NOT NULL,
        department text NOT NULL,
        jd_text text NOT NULL DEFAULT '',
        version integer NOT NULL,
        owner text NOT NULL,
        headcount integer NOT NULL,
        filled_headcount integer NOT NULL DEFAULT 0,
        gates text NOT NULL,
        weights text NOT NULL,
        interview_dimensions text NOT NULL DEFAULT '[]',
        status text NOT NULL DEFAULT 'active',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS activity_logs (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        candidate_id text,
        action text NOT NULL,
        actor_email text,
        created_at integer NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS resume_files (
        id text PRIMARY KEY NOT NULL,
        batch_id text NOT NULL,
        original_name text NOT NULL,
        storage_key text NOT NULL,
        content_type text NOT NULL,
        size_bytes integer NOT NULL,
        target_role text,
        status text NOT NULL DEFAULT '已入库',
        score integer,
        result text,
        uploaded_by text,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )`),
      d1.prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS resume_files_storage_key_unique ON resume_files (storage_key)",
      ),
    ]);

    const jobColumns = await d1.prepare("PRAGMA table_info(jobs)").all<{
      name: string;
    }>();
    const columnNames = new Set(
      (jobColumns.results as Array<{ name: string }>).map((column) => column.name),
    );
    if (!columnNames.has("jd_text")) {
      await d1.prepare("ALTER TABLE jobs ADD COLUMN jd_text text NOT NULL DEFAULT ''").run();
    }
    if (!columnNames.has("interview_dimensions")) {
      await d1
        .prepare(
          "ALTER TABLE jobs ADD COLUMN interview_dimensions text NOT NULL DEFAULT '[]'",
        )
        .run();
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

const seedCandidates: Array<typeof candidates.$inferInsert> = [
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
    highlights: ["0→1 搭建 B 端增长产品", "带领 8 人跨职能项目组", "核心指标提升 42%"],
    risk: "近两年有 2 次工作变动，需确认职业稳定性。",
    createdAt: new Date("2026-07-28T02:12:00.000Z"),
    updatedAt: new Date("2026-07-28T02:12:00.000Z"),
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
    highlights: ["负责千万级用户增长", "擅长实验平台与策略分析", "消费互联网经验完整"],
    risk: "期望薪资接近岗位预算上限。",
    createdAt: new Date("2026-07-28T01:56:00.000Z"),
    updatedAt: new Date("2026-07-28T01:56:00.000Z"),
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
    highlights: ["平台型产品经验", "有商业化项目经历", "数据分析能力扎实"],
    risk: "管理经验弱于岗位偏好，需要重点验证影响力。",
    createdAt: new Date("2026-07-28T01:10:00.000Z"),
    updatedAt: new Date("2026-07-28T01:10:00.000Z"),
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
    highlights: ["招聘流程数字化经验", "搭建过人才库体系", "熟悉业务招聘"],
    risk: "缺少千人以上组织的项目经验。",
    createdAt: new Date("2026-07-28T00:10:00.000Z"),
    updatedAt: new Date("2026-07-28T00:10:00.000Z"),
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
    highlights: ["渠道投放经验丰富", "执行推进能力强"],
    risk: "策略深度与实验设计经验未达到当前职级要求。",
    createdAt: new Date("2026-07-27T04:00:00.000Z"),
    updatedAt: new Date("2026-07-27T04:00:00.000Z"),
  },
];

const seedJobs: Array<typeof jobs.$inferInsert> = [
  {
    id: "job-senior-pm",
    role: "高级产品经理",
    department: "产品与增长部",
    version: 3,
    owner: "王嘉琪",
    headcount: 3,
    filledHeadcount: 2,
    gates: ["本科及以上", "5 年以上产品经验", "B 端产品经验"],
    weights: [["业务洞察", 30], ["产品能力", 30], ["数据分析", 20], ["协作影响力", 20]],
    createdAt: new Date("2026-07-20T02:00:00.000Z"),
    updatedAt: new Date("2026-07-28T02:24:00.000Z"),
  },
  {
    id: "job-growth",
    role: "用户增长专家",
    department: "市场增长部",
    version: 2,
    owner: "孟玮",
    headcount: 2,
    filledHeadcount: 1,
    gates: ["本科及以上", "4 年以上增长经验", "有实验平台经验"],
    weights: [["增长策略", 35], ["实验设计", 25], ["数据能力", 25], ["项目推进", 15]],
    createdAt: new Date("2026-07-21T02:00:00.000Z"),
    updatedAt: new Date("2026-07-27T08:40:00.000Z"),
  },
  {
    id: "job-recruiting-ops",
    role: "招聘运营经理",
    department: "人力资源部",
    version: 1,
    owner: "王嘉琪",
    headcount: 1,
    filledHeadcount: 0,
    gates: ["本科及以上", "3 年招聘运营经验"],
    weights: [["流程设计", 35], ["项目管理", 25], ["数据分析", 20], ["业务理解", 20]],
    createdAt: new Date("2026-07-22T02:00:00.000Z"),
    updatedAt: new Date("2026-07-25T02:00:00.000Z"),
  },
];

export async function ensureSeedData() {
  await ensureDatabaseSchema();
  const db = getDb();
  await db.insert(candidates).values(seedCandidates).onConflictDoNothing();
  await db.insert(jobs).values(seedJobs).onConflictDoNothing();
}

export async function listCandidates() {
  await ensureSeedData();
  return getDb().select().from(candidates).orderBy(desc(candidates.updatedAt));
}

export async function updateCandidateStatus(
  id: string,
  status: string,
  actorEmail: string | null,
) {
  const db = getDb();
  const now = new Date();
  const updated = await db
    .update(candidates)
    .set({ status, updatedAt: now })
    .where(eq(candidates.id, id))
    .returning();

  if (!updated[0]) return null;

  await db.insert(activityLogs).values({
    candidateId: id,
    action: `${updated[0].name}状态更新为「${status}」`,
    actorEmail,
    createdAt: now,
  });
  return updated[0];
}

export async function listJobs() {
  await ensureSeedData();
  return getDb().select().from(jobs).orderBy(desc(jobs.updatedAt));
}

export async function listRecentActivity() {
  await ensureDatabaseSchema();
  return getDb()
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(8);
}

export async function createResumeRecords(
  records: Array<typeof resumeFiles.$inferInsert>,
) {
  await ensureDatabaseSchema();
  if (!records.length) return [];
  return getDb().insert(resumeFiles).values(records).returning();
}

export async function listResumeRecords(limit = 50) {
  await ensureDatabaseSchema();
  return getDb()
    .select()
    .from(resumeFiles)
    .orderBy(desc(resumeFiles.createdAt))
    .limit(limit);
}

export async function createJobStandard(
  input: Omit<
    typeof jobs.$inferInsert,
    "id" | "version" | "filledHeadcount" | "status" | "createdAt" | "updatedAt"
  >,
) {
  await ensureDatabaseSchema();
  const now = new Date();
  const created = await getDb()
    .insert(jobs)
    .values({
      ...input,
      id: crypto.randomUUID(),
      version: 1,
      filledHeadcount: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created[0];
}

export async function updateJobStandard(
  id: string,
  input: Partial<
    Pick<
      typeof jobs.$inferInsert,
      | "role"
      | "department"
      | "jdText"
      | "owner"
      | "headcount"
      | "gates"
      | "weights"
      | "interviewDimensions"
      | "status"
    >
  >,
) {
  await ensureDatabaseSchema();
  const db = getDb();
  const existing = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!existing[0]) return null;
  const updated = await db
    .update(jobs)
    .set({
      ...input,
      version: existing[0].version + 1,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id))
    .returning();
  return updated[0] ?? null;
}
