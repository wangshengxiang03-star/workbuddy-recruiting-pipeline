import { env } from "cloudflare:workers";

export function getResumeBucket(): R2Bucket {
  if (!env.RESUMES) {
    throw new Error("Cloudflare R2 binding `RESUMES` is unavailable.");
  }
  return env.RESUMES;
}
