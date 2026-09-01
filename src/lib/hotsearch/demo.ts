import type { AggregateResult } from "./index";
import { PLATFORMS } from "./types";
import { FALLBACK } from "./fallback";

/**
 * 客户端兜底：当 /api/hot 不可用时（例如 Cloudflare 上接口异常、
 * 服务器 500 等），直接在浏览器里用内置演示数据构建完整榜单，
 * 保证页面任何时候都有内容可看，不会白屏或一直转圈。
 */
export function buildDemoResult(): AggregateResult {
  const now = Date.now();
  return {
    updatedAt: now,
    platforms: PLATFORMS.map((p) => ({
      ...p,
      items: FALLBACK[p.key] ?? [],
      live: false,
      fetchedAt: now,
    })),
    cache: "fresh",
  };
}
