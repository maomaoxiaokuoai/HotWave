import type { HotItem, PlatformKey } from "./types";

const TIMEOUT = 4500;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeout = TIMEOUT
): Promise<Response> {
  // 不使用 AbortSignal.timeout：Cloudflare Workers(workerd)运行时不支持该 API。
  // 改用 AbortController + setTimeout，Node / workerd 全兼容。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
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

async function fetchText(
  url: string,
  headers: Record<string, string> = {},
  timeout = TIMEOUT
) {
  const res = await fetchWithTimeout(url, {
    headers: { "user-agent": UA, ...headers },
  }, timeout);
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

/** 可见的 Unicode 文字（中文/日文/韩文/泰文等），在地址栏中保持原文显示 */
const VISIBLE_UNICODE =
  /^[\u0e00-\u0e7f\u2e80-\u9fff\u3000-\u303f\ua4d0-\ua95f\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]$/;

/**
 * 生成「干净」的 URL 参数：只有会破坏 URL 结构的字符（# & % ? 空格引号等）
 * 才做百分号编码，中文等可见文字保持原文——地址栏不再出现 %E6%9F... 乱码。
 * @param spaces 空格形式：查询参数用 "+"，路径段用 "%20"
 */
function prettyEnc(value: string, spaces: "+" | "%20" = "+"): string {
  let out = "";
  for (const ch of value) {
    if (VISIBLE_UNICODE.test(ch)) out += ch;
    else if (ch === " ") out += spaces;
    else out += encodeURIComponent(ch);
  }
  return out;
}

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
  const items: HotItem[] = list.map((c) => {
    const word = String(c.word ?? c.query ?? "").trim();
    return {
      title: word,
      hot: c.isTop
        ? "置顶"
        : c.index
          ? `TOP${c.index}`
          : fmtHot(c.hotScore ?? c.heat_score),
      // 百度资讯直达：点开即展示该词条对应的新闻文章（tn=news 资讯频道 + rtt=1 按时间排序）
      url: `https://www.baidu.com/s?tn=news&rtt=1&word=${prettyEnc(word)}`,
    };
  });
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
          url: `https://s.weibo.com/weibo?q=${prettyEnc(String(w.word ?? w.note ?? "").trim())}`,
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
    url: `https://s.weibo.com/weibo?q=${prettyEnc(String(w.desc ?? "").trim())}`,
  }));
  if (!items.length) throw new Error("weibo empty");
  return limitItems(items);
}

async function fetchBilibili(): Promise<HotItem[]> {
  // 热搜接口会按出口 IP 限流；热门视频接口是 B 站同一公开 API 的独立路径，可作真实数据兜底。
  try {
    const json: AnyObj = await fetchJson(
      "https://api.bilibili.com/x/web-interface/search/square?limit=30&web_location=333.1007",
      { referer: "https://www.bilibili.com/" }
    );
    const list: AnyObj[] = json?.data?.trending?.list ?? [];
    const items: HotItem[] = list.map((w) => ({
      title: String(w.keyword ?? ""),
      hot: String(w.show_name ?? ""),
      url: `https://search.bilibili.com/all?keyword=${prettyEnc(String(w.keyword ?? "").trim())}`,
    }));
    if (items.length) return limitItems(items);
  } catch {
    /* 使用官方热门视频接口 */
  }

  const json: AnyObj = await fetchJson(
    "https://api.bilibili.com/x/web-interface/popular?ps=30&pn=1",
    { referer: "https://www.bilibili.com/" }
  );
  const items: HotItem[] = (json?.data?.list ?? []).map((video: AnyObj) => ({
    title: String(video?.title ?? ""),
    hot: video?.stat?.view ? `${fmtHot(video.stat.view)} 播放` : "",
    url: video?.bvid
      ? `https://www.bilibili.com/video/${video.bvid}`
      : `https://search.bilibili.com/all?keyword=${prettyEnc(String(video?.title ?? "").trim())}`,
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
        : `https://www.zhihu.com/search?type=content&q=${prettyEnc(
            String(t?.title ?? "").trim()
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
    // 路径段中的空格用 %20（"+" 在路径里不代表空格）
    url: `https://www.douyin.com/search/${prettyEnc(String(w.word ?? "").trim(), "%20")}`,
  }));
  if (!items.length) throw new Error("douyin empty");
  return limitItems(items);
}

async function fetchToutiao(): Promise<HotItem[]> {
  const json: AnyObj = await fetchJson(
    "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
    { referer: "https://www.toutiao.com/" }
  );
  const list: AnyObj[] = json?.data ?? [];
  const items: HotItem[] = list.map((it) => {
    const title = String(it?.Title ?? "").trim();
    const url = String(it?.Url ?? "");
    return {
      title,
      hot: fmtHot(it?.HotValue),
      // Url 为事件/文章直达页（toutiao.com/trending/或/article/），缺失时退回头条搜索
      url: /^https?:\/\//i.test(url)
        ? url
        : `https://so.toutiao.com/search?keyword=${prettyEnc(title)}`,
    };
  });
  if (!items.length) throw new Error("toutiao empty");
  return limitItems(items);
}

async function fetchTencent(): Promise<HotItem[]> {
  const json: AnyObj = await fetchJson(
    "https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50",
    { referer: "https://news.qq.com/" }
  );
  const sections: AnyObj[] = json?.idlist ?? [];
  const items: HotItem[] = [];
  for (const s of sections) {
    for (const n of s?.newslist ?? []) {
      const title = String(n?.title ?? "").trim();
      const url = String(n?.url ?? "");
      // 跳过无链接的栏目头（如"腾讯新闻用户最关注的热点"）
      if (title && /^https?:/i.test(url)) {
        items.push({
          title,
          hot: n?.readCount ? `${fmtHot(n.readCount)} 阅读` : "",
          // view.inews.qq.com 为文章直达页
          url,
        });
      }
    }
  }
  if (!items.length) throw new Error("tencent empty");
  return limitItems(items);
}

/** 快手官方 GraphQL 热榜查询（从快手 PC 端 JS 包中提取的真实查询） */
const KUAISHOU_QUERY = `query hotRankQuery($page: String) {
  visionHotRank(page: $page) {
    result
    pcursor
    webPageArea
    items { rank id name viewCount hotValue iconUrl poster tagType photoIds }
  }
}`;

async function fetchKuaishou(): Promise<HotItem[]> {
  // 方案一：快手官方 GraphQL 端点（与网页端完全相同的热榜数据源）
  for (const endpoint of ["https://www.kuaishou.com/graphql"]) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": UA,
          accept: "*/*",
          "accept-language": "zh-CN,zh;q=0.9",
          referer: "https://www.kuaishou.com/",
          origin: "https://www.kuaishou.com",
        },
        body: JSON.stringify({
          operationName: "hotRankQuery",
          variables: { page: "hotSearch" },
          query: KUAISHOU_QUERY,
        }),
      });
      const json: AnyObj = await res.json();
      const list: AnyObj[] = json?.data?.visionHotRank?.items ?? [];
      if (!list.length) continue;
      const items: HotItem[] = list
        .map((it) => {
          const name = String(it?.name ?? it?.id ?? "").trim();
          return {
            title: name,
            hot: String(it?.hotValue ?? ""),
            url: `https://www.kuaishou.com/search/video?searchKey=${prettyEnc(name)}`,
          };
        })
        .filter((i) => i.title);
      if (items.length) return limitItems(items);
    } catch {
      /* 尝试下一个端点 */
    }
  }
  // 方案二：第三方热榜聚合源（官方端点不可达时的备用）
  for (const src of [
    "https://api.vvhan.com/api/hotlist/ksHotSearch",
    "https://api-hot.imsyy.top/kuaishou?cache=true",
  ]) {
    try {
      const json: AnyObj = await fetchJson(src);
      const list: AnyObj[] = json?.data ?? [];
      if (!list.length) continue;
      const items: HotItem[] = list
        .map((it) => {
          const title = String(it?.title ?? "").trim();
          return {
            title,
            hot: fmtHot(it?.hot ?? it?.heat),
            url:
              String(it?.url ?? it?.mobileUrl ?? "").startsWith("http")
                ? String(it?.url ?? it?.mobileUrl)
                : `https://www.kuaishou.com/search/video?searchKey=${prettyEnc(title)}`,
          };
        })
        .filter((i) => i.title);
      if (items.length) return limitItems(items);
    } catch {
      /* 尝试下一个源 */
    }
  }
  throw new Error("kuaishou all sources failed");
}

/** Bing 热搜：官方搜索建议接口的空查询会返回当前热门搜索词 */
async function fetchBingByMarket(market: string): Promise<HotItem[]> {
  const json: AnyObj = await fetchJson(
    `https://api.bing.com/osjson.aspx?query=&market=${market}`
  );
  // 返回结构：["", [...热词], [], [], {meta}]
  const words: string[] = Array.isArray(json?.[1]) ? json[1] : [];
  const isCn = market.startsWith("zh");
  const base = isCn ? "https://cn.bing.com" : "https://www.bing.com";
  const items: HotItem[] = words
    .map((w) => {
      const word = String(w).trim();
      return {
        title: word,
        hot: "",
        url: `${base}/search?q=${prettyEnc(word)}`,
      };
    })
    .filter((i) => i.title);
  if (!items.length) throw new Error(`bing ${market} empty`);
  return limitItems(items);
}

const fetchBingCN = () => fetchBingByMarket("zh-CN");
const fetchBingIntl = () => fetchBingByMarket("en-US");

async function fetchNetease(): Promise<HotItem[]> {
  const raw = await fetchText(
    "https://news.163.com/special/cm_yaowen20200213/?callback=data_callback",
    { referer: "https://news.163.com/" }
  );
  // JSONP：data_callback([{title, docurl, tienum, ...}])
  const m = raw.match(/data_callback\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*$/);
  const data: AnyObj = JSON.parse(m ? m[1] : raw);
  const list: AnyObj[] = Array.isArray(data) ? data : [];
  const items: HotItem[] = list
    .map((n) => ({
      title: String(n?.title ?? "").trim(),
      hot: n?.tienum ? `${fmtHot(n.tienum)} 跟帖` : "",
      url: String(n?.docurl ?? ""),
    }))
    .filter((i) => i.title && i.url);
  if (!items.length) throw new Error("netease empty");
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
      const article = String(t?.articles?.[0]?.url ?? "");
      // 文章链接若指向 RSS/XML 源，点击会显示裸 XML 界面，改用 Google 搜索页
      const url =
        article && !/(rss|xml)/i.test(article)
          ? article
          : `https://www.google.com/search?q=${prettyEnc(q)}`;
      return {
        title: q,
        hot: String(t?.formattedTraffic ?? ""),
        url,
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
    // RSS 里的 <link> 是订阅源地址（点开是 XML），一律用 Google 搜索页
    return {
      title,
      hot: traffic,
      url: `https://www.google.com/search?q=${prettyEnc(title)}`,
    };
  });
  if (!items.length) throw new Error("google empty");
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
    // 去掉趋势词两端的引号（如 "Happy New Month"），链接和标题都更干净
    const name = String(t?.name ?? "").replace(/^["']+|["']+$/g, "").trim();
    return {
      title: name,
      hot: t?.tweet_volume ? `${fmtHot(t.tweet_volume)} 推文` : "",
      // 自己构造搜索链接（API 返回的 http 老链接是 %-encoded 的）
      url: `https://x.com/search?q=${prettyEnc(name)}`,
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
  status: "live" | "failed";
}

type Fetcher = () => Promise<HotItem[]>;

/** 全部 15 个平台实时抓取（失败时如实标记 failed，不伪造数据） */
const FETCHERS: Partial<Record<PlatformKey, Fetcher>> = {
  baidu: fetchBaidu,
  weibo: fetchWeibo,
  bilibili: fetchBilibili,
  zhihu: fetchZhihu,
  douyin: fetchDouyin,
  toutiao: fetchToutiao,
  kuaishou: fetchKuaishou,
  tencent: fetchTencent,
  netease: fetchNetease,
  bingcn: fetchBingCN,
  google: fetchGoogleTrends,
  bingintl: fetchBingIntl,
  hackernews: fetchHackerNews,
  twitter: fetchTwitter,
  youtube: fetchYouTube,
};

export async function fetchPlatform(key: PlatformKey): Promise<FetchResult> {
  const fetcher = FETCHERS[key];
  if (!fetcher) {
    // 未配置抓取源：如实标记失败，绝不伪造演示数据
    return { items: [], status: "failed" };
  }
  try {
    const items = await fetcher();
    if (!items.length) throw new Error(`${key} empty`);
    return { items, status: "live" };
  } catch {
    // 抓取失败如实展示，页面卡片会显示失败状态
    return { items: [], status: "failed" };
  }
}
