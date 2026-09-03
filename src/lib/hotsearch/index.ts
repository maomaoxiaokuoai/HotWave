import { getDb } from "@/db";
import { hotCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PLATFORMS, type HotItem, type PlatformData } from "./types";
import { fetchPlatform } from "./fetchers";

const CACHE_KEY = "hot:v10"; // v10: 多端点抓取 + 失败保留最近成功数据
const MEMORY_TTL = 60_000; // 内存缓存 60 秒
const DB_TTL = 120_000; // 数据库缓存 120 秒
const STALE_TTL = 30 * 60_000; // 上游短暂故障时最多展示 30 分钟内的真实结果

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
  let previousPayload: AggregatePayload | undefined;

  // 1. 内存缓存
  const mem = memoryCache.get(CACHE_KEY);
  if (mem) previousPayload = mem.payload;
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
      if (row) {
        const payload = JSON.parse(row.payload) as AggregatePayload;
        previousPayload ??= payload;
        if (!force && now - row.updatedAt.getTime() < DB_TTL) {
          memoryCache.set(CACHE_KEY, { at: now, payload });
          return { ...payload, cache: "db" };
        }
      }
    } catch {
      /* 数据库不可用时继续走实时抓取 */
    }
  }

  // 3. 实时抓取。短暂失败时保留最近一次成功的真实数据，并明确标注为缓存结果。
  const results = await Promise.allSettled(
    PLATFORMS.map(async (p) => {
      const res = await fetchPlatform(p.key).catch(() => ({
        items: [] as HotItem[],
        status: "failed" as const,
      }));
      return { ...p, ...res, fetchedAt: now } satisfies PlatformData;
    })
  );

  const platforms: PlatformData[] = results.map((r, i) => {
    const def = PLATFORMS[i];
    if (r.status === "fulfilled" && r.value.status === "live") return r.value;
    const previous = previousPayload?.platforms.find((p) => p.key === def.key);
    if (
      previous?.items.length &&
      previous.status !== "failed" &&
      now - previous.fetchedAt < STALE_TTL
    ) {
      return { ...def, items: previous.items, status: "stale", fetchedAt: previous.fetchedAt };
    }
    return { ...def, items: [], status: "failed", fetchedAt: now };
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
