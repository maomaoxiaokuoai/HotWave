import { getDb } from "@/db";
import { hotCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PLATFORMS, type PlatformData } from "./types";
import { fetchPlatform } from "./fetchers";
import { FALLBACK } from "./fallback";

const CACHE_KEY = "hot:v7"; // v7: 新增头条/快手/腾讯/网易/国内Bing/国际Bing 6 个平台
const MEMORY_TTL = 60_000; // 内存缓存 60 秒
const DB_TTL = 120_000; // 数据库缓存 120 秒

interface AggregatePayload {
  updatedAt: number;
  platforms: PlatformData[];
}

const memoryCache = new Map<string, { at: number; payload: AggregatePayload }>();

export interface AggregateResult extends AggregatePayload {
  cache: "memory" | "db" | "fresh";
}

export async function aggregateHotSearches(force = false): Promise<AggregateResult> {
  const now = Date.now();

  // 1. 内存缓存
  const mem = memoryCache.get(CACHE_KEY);
  if (!force && mem && now - mem.at < MEMORY_TTL) {
    return { ...mem.payload, cache: "memory" };
  }

  // 2. 数据库缓存（无数据库配置时跳过，如 Cloudflare 部署）
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(hotCache)
        .where(eq(hotCache.key, CACHE_KEY))
        .limit(1);
      const row = rows[0];
      if (row && !force && now - row.updatedAt.getTime() < DB_TTL) {
        const payload = JSON.parse(row.payload) as AggregatePayload;
        memoryCache.set(CACHE_KEY, { at: now, payload });
        return { ...payload, cache: "db" };
      }
    } catch {
      /* 数据库不可用时继续走实时抓取 */
    }
  }

  // 3. 实时抓取（各平台并行，单个失败自动降级为演示数据）
  const results = await Promise.allSettled(
    PLATFORMS.map(async (p) => {
      const res = await fetchPlatform(p.key).catch(() => ({
        items: FALLBACK[p.key] ?? [],
        live: false,
      }));
      return { ...p, ...res, fetchedAt: now } satisfies PlatformData;
    })
  );

  const platforms: PlatformData[] = results.map((r, i) => {
    const def = PLATFORMS[i];
    if (r.status === "fulfilled") return r.value;
    return {
      ...def,
      items: FALLBACK[def.key] ?? [],
      live: false,
      fetchedAt: now,
    };
  });

  const payload: AggregatePayload = { updatedAt: now, platforms };
  memoryCache.set(CACHE_KEY, { at: now, payload });

  // 4. 写数据库缓存（失败不影响返回；无数据库时跳过）
  if (db) {
    try {
      const json = JSON.stringify(payload);
      await db
        .insert(hotCache)
        .values({ key: CACHE_KEY, payload: json, updatedAt: new Date(now) })
        .onConflictDoUpdate({
          target: hotCache.key,
          set: { payload: json, updatedAt: new Date(now) },
        });
    } catch {
      /* ignore */
    }
  }

  return { ...payload, cache: "fresh" };
}
