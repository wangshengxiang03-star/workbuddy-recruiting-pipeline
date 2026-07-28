import { listJobs } from "../../../db/repository";

export const runtime = "edge";

export async function GET() {
  const jobRecords = await listJobs();
  return Response.json({
    jobs: jobRecords.map((job) => ({
      ...job,
      version: `v${job.version}`,
      updatedAt: job.updatedAt.toISOString(),
    })),
  });
}
