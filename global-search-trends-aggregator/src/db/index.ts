import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * 数据库客户端（惰性加载）：
 * - 配置了 DATABASE_URL 时连接 PostgreSQL（本地开发 / 自托管部署）
 * - 未配置时返回 null，应用自动降级为「localStorage 偏好 + 内存热搜缓存」，
 *   保证在 Cloudflare Workers / Pages 等不支持 TCP 连接的环境也能完整运行。
 *
 * 注意：pg 与 drizzle 的 node-postgres 驱动都通过动态 import 加载，
 * 避免在 Cloudflare 构建产物中被打包（Workers 运行时没有 node:net）。
 */
type Db = NodePgDatabase<Record<string, never>>;

let cached: Db | null | undefined;

export async function getDb(): Promise<Db | null> {
  if (!process.env.DATABASE_URL) return null;
  if (cached !== undefined) return cached;
  try {
    const [{ drizzle }, { Pool }] = await Promise.all([
      import("drizzle-orm/node-postgres"),
      import("pg"),
    ]);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    cached = drizzle(pool);
    return cached;
  } catch (err) {
    console.error("数据库连接失败，降级为无数据库模式:", err);
    cached = null;
    return null;
  }
}
