import { getChatGPTUser } from "../../chatgpt-auth";
import {
  claimModelAnalysisQuota,
  createJobStandard,
  listJobs,
  updateJobStandard,
} from "../../../db/repository";
import {
  deriveCandidateProfile,
  deriveInterviewQuestions,
} from "../../lib/job-analysis";
import type { CandidateProfile } from "../../lib/job-analysis";
import {
  analyzeInterviewQuestions,
  type InterviewQuestionSet,
} from "../../lib/ai-interview-questions";
import {
  analyzeCandidateProfile,
  modelAnalysisConfigured,
} from "../../lib/ai-job-analysis";

export const runtime = "nodejs";
export const maxDuration = 120;

type JobPayload = {
  id?: string;
  role?: string;
  department?: string;
  jdText?: string;
  supplementalRequirements?: string;
  owner?: string;
  headcount?: number;
  gates?: string[];
  weights?: Array<[string, number]>;
  interviewDimensions?: string[];
  status?: string;
  candidateProfile?: CandidateProfile;
  regenerateProfile?: boolean;
};

function serializeJob(job: Awaited<ReturnType<typeof listJobs>>[number]) {
  const generatedProfile = deriveCandidateProfile(job);
  const storedProfile = (job.candidateProfile ?? {}) as Partial<CandidateProfile> & {
    interviewQuestionSet?: InterviewQuestionSet;
  };
  const { interviewQuestionSet, ...candidateProfile } = storedProfile;
  return {
    ...job,
    interviewDimensions: job.interviewDimensions.length
      ? job.interviewDimensions
      : [...job.weights.map(([label]) => label), "求职动机"].slice(0, 5),
    versionNumber: job.version,
    version: `v${job.version}`,
    updatedAt: job.updatedAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    candidateProfile:
      job.candidateProfile && Object.keys(job.candidateProfile).length
        ? { ...generatedProfile, ...candidateProfile }
        : generatedProfile,
    interviewQuestions:
      interviewQuestionSet?.questions?.length
        ? interviewQuestionSet.questions
        : deriveInterviewQuestions(job),
    interviewQuestionMeta:
      interviewQuestionSet?.analysisMeta ?? {
        source: "rules",
        model: "本地规则引擎",
        generatedAt: job.updatedAt.toISOString(),
        warning: "当前题目由规则模板生成，重新分析岗位后可生成模型题目。",
      },
  };
}

function cleanLines(value: string) {
  return value
    .split(/\n|；|;/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter(Boolean);
}

function deriveStandard(body: JobPayload) {
  const jd = `${body.jdText ?? ""}\n${body.supplementalRequirements ?? ""}`;
  const normalized = jd.toLowerCase();
  const gates = body.gates?.filter(Boolean) ?? [];
  if (!gates.length) {
    const sourceLines = cleanLines(body.supplementalRequirements ?? "");
    gates.push(...sourceLines.slice(0, 4));
    if (/本科|学士/.test(jd)) gates.push("本科及以上学历");
    if (/硕士|研究生/.test(jd)) gates.push("硕士及以上学历");
    const years = jd.match(/(\d+)\s*年(?:以上)?(?:相关)?(?:工作|从业|产品|增长|招聘)?经验/);
    if (years) gates.push(`${years[1]} 年以上相关经验`);
    if (/b\s*端|企业服务|saas/.test(normalized)) gates.push("具备 B 端或企业服务经验");
    if (!gates.length) gates.push("具备岗位所需的核心专业经验");
  }

  const dimensions = body.interviewDimensions?.filter(Boolean) ?? [];
  if (!dimensions.length) {
    if (/产品|需求|用户体验/.test(jd)) dimensions.push("产品判断", "业务洞察");
    if (/增长|投放|转化|运营/.test(jd)) dimensions.push("增长策略", "数据分析");
    if (/招聘|人力|人才/.test(jd)) dimensions.push("招聘专业度", "业务理解");
    if (/管理|负责人|带领|团队/.test(jd)) dimensions.push("团队领导力");
    dimensions.push("项目推进", "协作影响力", "求职动机");
  }
  const uniqueDimensions = [...new Set(dimensions)].slice(0, 5);
  const weightBase = Math.floor(100 / Math.min(uniqueDimensions.length, 4));
  const weights =
    body.weights?.filter(([label, weight]) => label && weight > 0) ??
    uniqueDimensions.slice(0, 4).map((label, index, list) => [
      label,
      index === list.length - 1 ? 100 - weightBase * (list.length - 1) : weightBase,
    ] as [string, number]);

  return {
    gates: [...new Set(gates)].slice(0, 6),
    weights,
    interviewDimensions: uniqueDimensions,
  };
}

async function visitorKey(request: Request) {
  const raw = [
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown",
    request.headers.get("user-agent") || "unknown",
  ].join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function modelOptions(request: Request) {
  if (!modelAnalysisConfigured()) return undefined;
  const allowed = await claimModelAnalysisQuota(await visitorKey(request));
  return {
    modelAllowed: allowed,
    limitWarning: "该访客今日的模型体验次数已用完，本次使用规则降级。",
  };
}

export async function GET() {
  const jobRecords = await listJobs();
  return Response.json({ jobs: jobRecords.map(serializeJob) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as JobPayload;
  if (!body.role?.trim() || !body.department?.trim() || !body.jdText?.trim()) {
    return Response.json(
      { error: "岗位名称、所属部门和 JD 内容不能为空" },
      { status: 400 },
    );
  }
  const headcount = Number(body.headcount ?? 1);
  if (!Number.isInteger(headcount) || headcount < 1 || headcount > 999) {
    return Response.json({ error: "招聘人数应为 1-999 的整数" }, { status: 400 });
  }

  const user = await getChatGPTUser();
  const standard = deriveStandard(body);
  const analysisInput = {
    role: body.role.trim(),
    department: body.department.trim(),
    jdText: body.jdText.trim(),
    supplementalRequirements: body.supplementalRequirements?.trim() ?? "",
    ...standard,
  };
  const options = await modelOptions(request);
  const [profile, interviewQuestionSet] = await Promise.all([
    analyzeCandidateProfile(analysisInput, options),
    analyzeInterviewQuestions(
      analysisInput,
      deriveCandidateProfile(analysisInput),
      options,
    ),
  ]);
  const created = await createJobStandard({
    role: body.role.trim(),
    department: body.department.trim(),
    jdText: body.jdText.trim(),
    supplementalRequirements: body.supplementalRequirements?.trim() ?? "",
    candidateProfile: { ...profile, interviewQuestionSet },
    owner: body.owner?.trim() || user?.displayName || user?.email || "招聘负责人",
    headcount,
    ...standard,
  });
  return Response.json({ job: serializeJob(created) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as JobPayload;
  if (!body.id) {
    return Response.json({ error: "缺少岗位标识" }, { status: 400 });
  }
  if (body.weights) {
    const total = body.weights.reduce((sum, [, weight]) => sum + Number(weight), 0);
    if (total !== 100) {
      return Response.json({ error: "评分权重合计必须为 100%" }, { status: 400 });
    }
  }
  const current = (await listJobs()).find((job) => job.id === body.id);
  if (!current) {
    return Response.json({ error: "岗位不存在" }, { status: 404 });
  }

  const nextRole = body.role?.trim() || current.role;
  const nextDepartment = body.department?.trim() || current.department;
  const nextJd = typeof body.jdText === "string" ? body.jdText.trim() : current.jdText;
  const nextSupplemental =
    typeof body.supplementalRequirements === "string"
      ? body.supplementalRequirements.trim()
      : current.supplementalRequirements;
  if (body.regenerateProfile && (!nextRole || !nextDepartment || !nextJd)) {
    return Response.json(
      { error: "重新分析前请补全岗位名称、所属部门和 JD" },
      { status: 400 },
    );
  }
  const nextStandard = body.regenerateProfile
    ? deriveStandard({
        ...body,
        role: nextRole,
        department: nextDepartment,
        jdText: nextJd,
        supplementalRequirements: nextSupplemental,
      })
    : null;
  const analysisInput = nextStandard
    ? {
        role: nextRole,
        department: nextDepartment,
        jdText: nextJd,
        supplementalRequirements: nextSupplemental,
        ...nextStandard,
      }
    : null;
  const analysisOptions = analysisInput ? await modelOptions(request) : undefined;
  const [regeneratedProfile, interviewQuestionSet] = analysisInput
    ? await Promise.all([
        analyzeCandidateProfile(analysisInput, analysisOptions),
        analyzeInterviewQuestions(
          analysisInput,
          deriveCandidateProfile(analysisInput),
          analysisOptions,
        ),
      ])
    : [null, null];
  const existingQuestionSet = (
    current.candidateProfile as { interviewQuestionSet?: InterviewQuestionSet } | null
  )?.interviewQuestionSet;

  const updated = await updateJobStandard(body.id, {
    ...(body.role ? { role: body.role.trim() } : {}),
    ...(body.department ? { department: body.department.trim() } : {}),
    ...(typeof body.jdText === "string" ? { jdText: body.jdText.trim() } : {}),
    ...(typeof body.supplementalRequirements === "string"
      ? { supplementalRequirements: body.supplementalRequirements.trim() }
      : {}),
    ...(body.owner ? { owner: body.owner.trim() } : {}),
    ...(body.headcount ? { headcount: Number(body.headcount) } : {}),
    ...(nextStandard
      ? {
          gates: nextStandard.gates,
          weights: nextStandard.weights,
          interviewDimensions: nextStandard.interviewDimensions,
        }
      : {}),
    ...(!nextStandard && body.gates ? { gates: body.gates.filter(Boolean) } : {}),
    ...(!nextStandard && body.weights ? { weights: body.weights } : {}),
    ...(!nextStandard && body.interviewDimensions
      ? { interviewDimensions: body.interviewDimensions.filter(Boolean) }
      : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(regeneratedProfile
      ? {
          candidateProfile: {
            ...regeneratedProfile,
            interviewQuestionSet,
          },
        }
      : body.candidateProfile
        ? {
            candidateProfile: {
              ...body.candidateProfile,
              ...(existingQuestionSet
                ? { interviewQuestionSet: existingQuestionSet }
                : {}),
            },
          }
        : {}),
  });
  if (!updated) {
    return Response.json({ error: "岗位不存在" }, { status: 404 });
  }
  return Response.json({ job: serializeJob(updated) });
}
