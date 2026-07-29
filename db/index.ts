import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let client: Client | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (database) return database;

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url) {
    throw new Error(
      "缺少 TURSO_DATABASE_URL。请在 Vercel Storage 中连接 Turso 数据库，或在本地环境变量中配置数据库地址。",
    );
  }

  client = createClient({ url, authToken });
  database = drizzle(client, { schema });
  return database;
}
