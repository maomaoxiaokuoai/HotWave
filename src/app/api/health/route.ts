import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`select 1`);
      return Response.json({ ok: true, database: "connected" });
    }
    // 无数据库配置（如 Cloudflare 部署）：应用仍可完整运行
    return Response.json({ ok: true, database: "disabled" });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
