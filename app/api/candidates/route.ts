import { getChatGPTUser } from "../../chatgpt-auth";
import {
  listCandidates,
  listRecentActivity,
  updateCandidateStatus,
} from "../../../db/repository";

export const runtime = "edge";

function toCandidate(record: Awaited<ReturnType<typeof listCandidates>>[number]) {
  return {
    ...record,
    updated: record.updatedAt.toISOString(),
  };
}

export async function GET() {
  const [candidateRecords, recentActivity] = await Promise.all([
    listCandidates(),
    listRecentActivity(),
  ]);

  return Response.json({
    candidates: candidateRecords.map(toCandidate),
    activity: recentActivity.map((item) => item.action),
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; status?: string };
  const allowedStatuses = new Set([
    "强推荐",
    "待复筛",
    "可面试",
    "人才储备",
    "复筛通过",
    "已邀约",
    "已确认面试",
    "资料已就绪",
    "淘汰",
  ]);

  if (!body.id || !body.status || !allowedStatuses.has(body.status)) {
    return Response.json({ error: "候选人或状态参数无效" }, { status: 400 });
  }

  const user = await getChatGPTUser();
  const updated = await updateCandidateStatus(
    body.id,
    body.status,
    user?.email ?? null,
  );

  if (!updated) {
    return Response.json({ error: "候选人不存在" }, { status: 404 });
  }

  return Response.json({ candidate: toCandidate(updated) });
}
