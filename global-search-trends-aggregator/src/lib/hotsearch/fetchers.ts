import type { HotItem, PlatformKey } from "./types";
import { FALLBACK } from "./fallback";

const TIMEOUT = 4500;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

async function fetchJson(
  url: string,
  headers: Record<string, string> = {},
  init: RequestInit = {}
) {
  const res = await fetchWithTimeout(url, {
    ...init,
    headers: { "user-agent": UA, accept: "application/json, text/plain, */*", ...headers },
  });
  return res.json();
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const res = await fetchWithTimeout(url, {
    headers: { "user-agent": UA, ...headers },
  });
  return res.text();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyObj = any;

/** 数字/热度格式化 */
export function fmtHot(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return "";
  if (typeof n === "string") {
    const num = parseInt(n.replace(/[^\d.-]/g, ""), 10);
    if (isNaN(num)) return n;
    return fmtNum(num);
  }
  return fmtNum(n);
}

function fmtNum(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

const limitItems = (items: HotItem[], max = 12): HotItem[] =>
  items.filter((i) => i && i.title && i.title.trim()).slice(0, max);

/* ==================== 国内平台 ==================== */

async function fetchBaidu(): Promise<HotItem[]> {
  const json: AnyObj = await fetchJson(
    "https://top.baidu.com/api/board?platform=wise&tab=realtime",
    { referer: "https://top.baidu.com/board?tab=realtime" }
  );
  let list: AnyObj[] = json?.data?.cards?.[0]?.content ?? [];
  // 兼容嵌套结构：cards[0].content[0].content 才是榜单
  if (list.length === 1 && Array.isArray(list[0]?.content)) {
    list = list[0].content;
  }
  const items: HotItem[] = list.map((c) => ({
    title: String(c.word ?? c.query ?? ""),
    hot: c.isTop
      ? "置顶"
      : c.index
        ? `TOP${c.index}`
        : fmtHot(c.hotScore ?? c.heat_score),
    url:
      c.rawUrl ||
      c.appUrl ||
      c.url ||
      `https://www.baidu.com/s?wd=${encodeURIComponent(String(c.word ?? ""))}`,
  }));
  if (!items.length) throw new Error("baidu empty");
  return limitItems(items);
}

async function fetchWeibo(): Promise<HotItem[]> {
  // 先尝试 PC 接口
  try {
    const json: AnyObj = await fetchJson("https://weibo.com/ajax/side/hotSearch", {
      referer: "https://weibo.com/hot/search",
    });
    const list: AnyObj[] = json?.data?.realtime ?? [];
    if (list.length) {
      return limitItems(
        list.map((w) => ({
          title: String(w.word ?? w.note ?? ""),
          hot: fmtHot(w.num ?? w.raw_hot),
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(String(w.word ?? ""))}`,
        }))
      );
    }
  } catch {
    /* 尝试移动端接口 */
  }
  const json: AnyObj = await fetchJson(
    "https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtime",
    { referer: "https://m.weibo.cn/" }
  );
  const list: AnyObj[] = json?.data?.cards?.[0]?.card_group ?? [];
  const items: HotItem[] = list.map((w) => ({
    title: String(w.desc ?? ""),
    hot: fmtHot(w.desc_extr),
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(String(w.desc ?? ""))}`,
  }));
  if (!items.length) throw new Error("weibo empty");
  return limitItems(items);
}

async function fetchBilibili(): Promise<HotItem[]> {
  const json: AnyObj = await fetchJson(
    "https://api.bilibili.com/x/web-interface/search/square?limit=30"
  );
  const list: AnyObj[] = json?.data?.trending?.list ?? [];
  const items: HotItem[] = list.map((w) => ({
    title: String(w.keyword ?? ""),
    hot: String(w.show_name ?? ""),
    url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(String(w.keyword ?? ""))}`,
  }));
  if (!items.length) throw new Error("bilibili empty");
  return limitItems(items);
}

async function fetchZhihu(): Promise<HotItem[]> {
  // api.zhihu.com 热榜接口（无需登录，www 的 v3 接口需要鉴权）
  const json: AnyObj = await fetchJson("https://api.zhihu.com/topstory/hot-list?limit=50", {
    referer: "https://www.zhihu.com/hot",
  });
  const list: AnyObj[] = json?.data ?? [];
  const items: HotItem[] = list.map((w) => {
    const t = w?.target ?? {};
    const id = t?.id;
    let url = String(t?.url ?? "");
    url = url
      .replace("api.zhihu.com", "www.zhihu.com")
      .replace("/questions/", "/question/");
    if (!url) {
      url = id
        ? `https://www.zhihu.com/question/${id}`
        : `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(
            String(t?.title ?? "")
          )}`;
    }
    return {
      title: String(t?.title ?? ""),
      hot: String(w?.detail_text ?? ""),
      url,
    };
  });
  if (!items.length) throw new Error("zhihu empty");
  return limitItems(items);
}

async function fetchDouyin(): Promise<HotItem[]> {
  const json: AnyObj = await fetchJson(
    "https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web",
    { referer: "https://www.douyin.com/hot" }
  );
  const list: AnyObj[] = json?.data?.word_list ?? [];
  const items: HotItem[] = list.map((w) => ({
    title: String(w.word ?? ""),
    hot: fmtHot(w.hot_value),
    url: `https://www.douyin.com/search/${encodeURIComponent(String(w.word ?? ""))}`,
  }));
  if (!items.length) throw new Error("douyin empty");
  return limitItems(items);
}

/* ==================== 海外平台 ==================== */

async function fetchGoogleTrends(): Promise<HotItem[]> {
  try {
    const txt = await fetchText(
      "https://trends.google.com/trends/api/dailytrends?hl=en-US&tz=-480&geo=US&ns=15"
    );
    const clean = txt.replace(/^\)\]\}',?\s*/, "");
    const json: AnyObj = JSON.parse(clean);
    const day: AnyObj = json?.default?.trendingSearchesDays?.[0];
    const list: AnyObj[] = day?.trendingSearches ?? [];
    const items: HotItem[] = list.map((t) => {
      const q = String(t?.title?.query ?? "");
      return {
        title: q,
        hot: String(t?.formattedTraffic ?? ""),
        url:
          t?.articles?.[0]?.url ||
          `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      };
    });
    if (items.length) return limitItems(items);
  } catch {
    /* 退回 RSS */
  }
  const xml = await fetchText(
    "https://trends.google.com/trending/rss?geo=US&hl=en-US"
  );
  const blocks = xml.split("<item>").slice(1);
  const items: HotItem[] = blocks.map((b) => {
    const title = b.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const traffic = b.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/)?.[1]?.trim() ?? "";
    const link = b.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    return {
      title,
      hot: traffic,
      url: link || `https://www.google.com/search?q=${encodeURIComponent(title)}`,
    };
  });
  if (!items.length) throw new Error("google empty");
  return limitItems(items);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function fetchReddit(): Promise<HotItem[]> {
  // 方案一：官方 JSON（普通网络环境可用；部分数据中心 IP 会被 403）
  try {
    const json: AnyObj = await fetchJson(
      "https://www.reddit.com/r/all/hot.json?limit=25",
      { "user-agent": "Mozilla/5.0 (compatible; HotWaveAggregator/1.0)" }
    );
    const children: AnyObj[] = json?.data?.children ?? [];
    const direct: HotItem[] = children
      .filter((c) => !c?.data?.stickied)
      .map((c) => {
        const d = c.data;
        return {
          title: String(d?.title ?? ""),
          hot: `${fmtHot(d?.score)} 分`,
          url:
            (typeof d?.url === "string" && d.url.startsWith("http")
              ? d.url
              : `https://www.reddit.com${d?.permalink ?? ""}`) ||
            "https://www.reddit.com/r/all/hot/",
        };
      });
    if (direct.length) return limitItems(direct);
  } catch {
    /* 走备用方案 */
  }
  // 方案二：rss2json 代理 Reddit RSS（官方 JSON 被墙时仍可拿到实时标题）
  const json: AnyObj = await fetchJson(
    "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent("https://www.reddit.com/r/all/hot/.rss")
  );
  const items: HotItem[] = (json?.items ?? []).map((it: AnyObj) => {
    const link = String(it?.link ?? "");
    const sub = link.match(/reddit\.com\/r\/([^/]+)\//)?.[1];
    return {
      title: decodeEntities(String(it?.title ?? "")),
      hot: sub ? `r/${sub}` : "",
      url: link || "https://www.reddit.com/r/all/hot/",
    };
  });
  if (!items.length) throw new Error("reddit empty");
  return limitItems(items);
}

async function fetchHackerNews(): Promise<HotItem[]> {
  const json: AnyObj = await fetchJson(
    "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15"
  );
  const hits: AnyObj[] = json?.hits ?? [];
  const items: HotItem[] = hits.map((h) => ({
    title: String(h?.title ?? ""),
    hot: `${h?.points ?? 0} 分`,
    url:
      h?.story_url ||
      h?.url ||
      `https://news.ycombinator.com/item?id=${h?.objectID ?? ""}`,
  }));
  if (!items.length) throw new Error("hn empty");
  return limitItems(items);
}

/** X.com 客户端内置的公开 Bearer Token（无需注册，仅用于访客流程） */
const X_PUBLIC_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

async function fetchTwitter(): Promise<HotItem[]> {
  const bearer = process.env.TWITTER_BEARER || X_PUBLIC_BEARER;
  // 1. 获取访客 token
  const act: AnyObj = await fetchJson(
    "https://api.twitter.com/1.1/guest/activate.json",
    { authorization: `Bearer ${bearer}` },
    { method: "POST" }
  );
  const guestToken = act?.guest_token;
  if (!guestToken) throw new Error("twitter no guest token");
  // 2. 全球趋势榜（id=1 为 Worldwide）
  const json: AnyObj = await fetchJson(
    "https://api.twitter.com/1.1/trends/place.json?id=1",
    {
      authorization: `Bearer ${bearer}`,
      "x-guest-token": String(guestToken),
    }
  );
  const trends: AnyObj[] = json?.[0]?.trends ?? [];
  const items: HotItem[] = trends.map((t) => {
    const name = String(t?.name ?? "");
    return {
      title: name,
      hot: t?.tweet_volume ? `${fmtHot(t.tweet_volume)} 推文` : "",
      url: String(
        t?.url ?? `https://x.com/search?q=${encodeURIComponent(name)}`
      ),
    };
  });
  if (!items.length) throw new Error("twitter empty");
  return limitItems(items);
}

/** 递归收集 videoRenderer（限深度防爆栈） */
function collectVideoRenderers(node: unknown, out: AnyObj[], depth = 0) {
  if (!node || typeof node !== "object" || depth > 40 || out.length >= 30) return;
  if (Array.isArray(node)) {
    for (const v of node) collectVideoRenderers(v, out, depth + 1);
    return;
  }
  const obj = node as AnyObj;
  const vr = obj.videoRenderer;
  if (vr && typeof vr === "object" && vr.videoId) {
    out.push(vr);
    return;
  }
  for (const v of Object.values(obj)) collectVideoRenderers(v, out, depth + 1);
}

/** 方案一：解析 YouTube 官方趋势页内嵌的 ytInitialData */
async function fetchYouTubeFromHtml(): Promise<HotItem[]> {
  const html = await fetchText(
    "https://www.youtube.com/feed/trending?gl=US&hl=en",
    {
      cookie: "CONSENT=YES+cb; SOCS=CAI",
      "accept-language": "en-US,en;q=0.9",
    }
  );
  const start = html.indexOf("var ytInitialData = ");
  if (start < 0) throw new Error("no ytInitialData");
  const jsonStart = start + "var ytInitialData = ".length;
  const end = html.indexOf(";</script>", jsonStart);
  if (end < 0) throw new Error("no ytInitialData end");
  const data: AnyObj = JSON.parse(html.slice(jsonStart, end));
  const renderers: AnyObj[] = [];
  collectVideoRenderers(data, renderers);
  const items: HotItem[] = renderers.map((v) => {
    const title =
      v?.title?.runs?.[0]?.text ?? v?.title?.simpleText ?? "";
    const rawCount =
      v?.viewCountText?.simpleText ??
      (v?.viewCountText?.runs ?? []).map((r: AnyObj) => r?.text ?? "").join("");
    return {
      title: String(title),
      hot: String(rawCount).replace(/ views?|次观看/gi, "").trim(),
      url: `https://www.youtube.com/watch?v=${v?.videoId ?? ""}`,
    };
  });
  if (!items.length) throw new Error("youtube html empty");
  return limitItems(items);
}

/** Piped 代理实例（YouTube 前端镜像，返回 JSON） */
const PIPED_INSTANCES = ["https://api.piped.private.coffee"];

async function fetchYouTube(): Promise<HotItem[]> {
  // 方案一：官方页面解析
  try {
    const items = await fetchYouTubeFromHtml();
    if (items.length) return items;
  } catch {
    /* 走 Piped 代理 */
  }
  // 方案二：Piped 实例趋势接口
  for (const base of PIPED_INSTANCES) {
    try {
      const json: AnyObj = await fetchJson(`${base}/trending?region=US`);
      const list: AnyObj[] = Array.isArray(json) ? json : [];
      const items: HotItem[] = list.map((v) => ({
        title: String(v?.title ?? ""),
        hot: v?.views ? `${fmtHot(v.views)} 观看` : "",
        url:
          typeof v?.url === "string" && v.url.startsWith("/")
            ? `https://www.youtube.com${v.url}`
            : String(v?.url ?? "https://www.youtube.com/feed/trending"),
      }));
      if (items.length) return limitItems(items);
    } catch {
      /* 尝试下一个实例 */
    }
  }
  throw new Error("youtube all sources failed");
}

export interface FetchResult {
  items: HotItem[];
  live: boolean;
}

type Fetcher = () => Promise<HotItem[]>;

/** 全部 10 个平台实时抓取（单个失败自动降级演示数据） */
const FETCHERS: Partial<Record<PlatformKey, Fetcher>> = {
  baidu: fetchBaidu,
  weibo: fetchWeibo,
  bilibili: fetchBilibili,
  zhihu: fetchZhihu,
  douyin: fetchDouyin,
  google: fetchGoogleTrends,
  reddit: fetchReddit,
  hackernews: fetchHackerNews,
  twitter: fetchTwitter,
  youtube: fetchYouTube,
};

export async function fetchPlatform(key: PlatformKey): Promise<FetchResult> {
  const fetcher = FETCHERS[key];
  if (!fetcher) {
    return { items: FALLBACK[key] ?? [], live: false };
  }
  try {
    const items = await fetcher();
    if (!items.length) throw new Error(`${key} empty`);
    return { items, live: true };
  } catch {
    return { items: FALLBACK[key] ?? [], live: false };
  }
}
