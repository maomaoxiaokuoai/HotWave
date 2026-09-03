export type Region = "domestic" | "overseas";

export const PLATFORM_KEYS = [
  "baidu",
  "weibo",
  "bilibili",
  "zhihu",
  "douyin",
  "toutiao",
  "kuaishou",
  "tencent",
  "netease",
  "bingcn",
  "google",
  "bingintl",
  "hackernews",
  "twitter",
  "youtube",
] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export interface HotItem {
  title: string;
  hot: string;
  url: string;
}

export interface PlatformDef {
  key: PlatformKey;
  name: string;
  /** 本地平台图标路径（public 资源） */
  icon: string;
  /** 图标底色：默认用品牌色 16% 透明，深色图标需提供实底 */
  chipBg?: string;
  region: Region;
  home: string;
  color: string;
}

export interface PlatformData extends PlatformDef {
  items: HotItem[];
  /** live=实时成功，stale=本次失败时保留的最近一次真实结果，failed=没有可展示的数据 */
  status: "live" | "stale" | "failed";
  fetchedAt: number;
}

export const PLATFORMS: PlatformDef[] = [
  {
    key: "baidu",
    name: "百度热搜",
    icon: "/icons/baidu.png",
    region: "domestic",
    home: "https://top.baidu.com/board?tab=realtime",
    color: "#2932e1",
  },
  {
    key: "weibo",
    name: "微博热搜",
    icon: "/icons/weibo.png",
    region: "domestic",
    home: "https://weibo.com/hot/search",
    color: "#e6162d",
  },
  {
    key: "bilibili",
    name: "B站热搜",
    icon: "/icons/bilibili.png",
    region: "domestic",
    home: "https://www.bilibili.com/",
    color: "#00a1d6",
  },
  {
    key: "zhihu",
    name: "知乎热榜",
    icon: "/icons/zhihu.png",
    region: "domestic",
    home: "https://www.zhihu.com/hot",
    color: "#0084ff",
  },
  {
    key: "douyin",
    name: "抖音热点",
    icon: "/icons/douyin.png",
    chipBg: "#ffffff",
    region: "domestic",
    home: "https://www.douyin.com/hot",
    color: "#161823",
  },
  {
    key: "toutiao",
    name: "今日头条",
    icon: "/icons/toutiao.png",
    region: "domestic",
    home: "https://www.toutiao.com/",
    color: "#f04142",
  },
  {
    key: "kuaishou",
    name: "快手热搜",
    icon: "/icons/kuaishou.png",
    region: "domestic",
    home: "https://www.kuaishou.com/",
    color: "#ff6423",
  },
  {
    key: "tencent",
    name: "腾讯新闻",
    icon: "/icons/qqnews.png",
    region: "domestic",
    home: "https://news.qq.com/",
    color: "#1e6fff",
  },
  {
    key: "netease",
    name: "网易新闻",
    icon: "/icons/neteasenews.png",
    region: "domestic",
    home: "https://news.163.com/",
    color: "#e60000",
  },
  {
    key: "bingcn",
    name: "国内 Bing",
    icon: "/icons/bing-cn.png",
    region: "domestic",
    home: "https://cn.bing.com/",
    color: "#00809d",
  },
  {
    key: "google",
    name: "Google 趋势",
    icon: "/icons/google-trends.png",
    region: "overseas",
    home: "https://trends.google.com/trending?geo=US",
    color: "#4285f4",
  },
  {
    key: "bingintl",
    name: "国际 Bing",
    icon: "/icons/bing-intl.png",
    region: "overseas",
    home: "https://www.bing.com/",
    color: "#00809d",
  },
  {
    key: "hackernews",
    name: "Hacker News",
    icon: "/icons/hackernews.png",
    region: "overseas",
    home: "https://news.ycombinator.com/",
    color: "#f0652f",
  },
  {
    key: "twitter",
    name: "X / 推特热搜",
    icon: "/icons/x.png",
    region: "overseas",
    home: "https://x.com/explore/tabs/trending",
    color: "#1d9bf0",
  },
  {
    key: "youtube",
    name: "YouTube 热门",
    icon: "/icons/youtube.png",
    region: "overseas",
    home: "https://www.youtube.com/feed/trending",
    color: "#ff0000",
  },
];

export const PLATFORM_MAP: Record<PlatformKey, PlatformDef> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p])
) as Record<PlatformKey, PlatformDef>;
