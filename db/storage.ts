import { del, get, put } from "@vercel/blob";

function assertConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "缺少 BLOB_READ_WRITE_TOKEN。请在 Vercel Storage 中创建 Private Blob 存储。",
    );
  }
}

export function getResumeBucket() {
  assertConfigured();
  return {
    async put(
      pathname: string,
      body: ReadableStream<Uint8Array>,
      options?: {
        httpMetadata?: { contentType?: string };
        customMetadata?: Record<string, string>;
      },
    ) {
      return put(pathname, body, {
        access: "private",
        addRandomSuffix: false,
        contentType:
          options?.httpMetadata?.contentType ?? "application/octet-stream",
      });
    },
    async get(pathname: string) {
      const result = await get(pathname, {
        access: "private",
        useCache: false,
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return {
        arrayBuffer: () => new Response(result.stream).arrayBuffer(),
      };
    },
    async delete(pathname: string) {
      await del(pathname);
    },
  };
}
