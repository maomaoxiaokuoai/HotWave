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
  "reddit",
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
  /** SVG 品牌图标路径（本地 public 资源） */
  icon: string;
  /** 图标底色：默认用品牌色 16% 透明，深色图标需提供实底 */
  chipBg?: string;
  region: Region;
  home: string;
  color: string;
}

export interface PlatformData extends PlatformDef {
  items: HotItem[];
  live: boolean;
  fetchedAt: number;
}

export const PLATFORMS: PlatformDef[] = [
  {
    key: "baidu",
    name: "百度热搜",
    icon: "/favicons/baidu.ico",
    region: "domestic",
    home: "https://top.baidu.com/board?tab=realtime",
    color: "#2932e1",
  },
  {
    key: "weibo",
    name: "微博热搜",
    icon: "/favicons/weibo.ico",
    region: "domestic",
    home: "https://weibo.com/hot/search",
    color: "#e6162d",
  },
  {
    key: "bilibili",
    name: "B站热搜",
    icon: "/favicons/bilibili.ico",
    region: "domestic",
    home: "https://www.bilibili.com/",
    color: "#00a1d6",
  },
  {
    key: "zhihu",
    name: "知乎热榜",
    icon: "/favicons/zhihu.ico",
    region: "domestic",
    home: "https://www.zhihu.com/hot",
    color: "#0084ff",
  },
  {
    key: "douyin",
    name: "抖音热点",
    icon: "/icons/douyin.svg",
    // 标准彩色音符(黑+红+青)放白色底上，避免官网深色版 favicon 在卡片上糊成一片白
    chipBg: "#ffffff",
    region: "domestic",
    home: "https://www.douyin.com/hot",
    color: "#161823",
  },
  {
    key: "toutiao",
    name: "今日头条",
    icon: "/favicons/toutiao.ico",
    region: "domestic",
    home: "https://www.toutiao.com/",
    color: "#f04142",
  },
  {
    key: "kuaishou",
    name: "快手热搜",
    icon: "/favicons/kuaishou.ico",
    region: "domestic",
    home: "https://www.kuaishou.com/",
    color: "#ff6423",
  },
  {
    key: "tencent",
    name: "腾讯新闻",
    icon: "/favicons/tencent.ico",
    region: "domestic",
    home: "https://news.qq.com/",
    color: "#1e6fff",
  },
  {
    key: "netease",
    name: "网易新闻",
    icon: "/icons/netease.svg",
    region: "domestic",
    home: "https://news.163.com/",
    color: "#e60000",
  },
  {
    key: "bingcn",
    name: "国内 Bing",
    icon: "/favicons/bingcn.ico",
    region: "domestic",
    home: "https://cn.bing.com/",
    color: "#00809d",
  },
  {
    key: "google",
    name: "Google 趋势",
    icon: "/favicons/google.ico",
    region: "overseas",
    home: "https://trends.google.com/trending?geo=US",
    color: "#4285f4",
  },
  {
    key: "bingintl",
    name: "国际 Bing",
    icon: "/favicons/bingintl.ico",
    region: "overseas",
    home: "https://www.bing.com/",
    color: "#00809d",
  },
  {
    key: "reddit",
    name: "Reddit 热帖",
    icon: "/favicons/reddit.png",
    region: "overseas",
    home: "https://www.reddit.com/r/all/hot/",
    color: "#ff4500",
  },
  {
    key: "hackernews",
    name: "Hacker News",
    // 用本地矢量 SVG（.ico 在部分部署环境存在兼容问题）
    icon: "/icons/hackernews.svg",
    region: "overseas",
    home: "https://news.ycombinator.com/",
    color: "#f0652f",
  },
  {
    key: "twitter",
    name: "X / 推特热搜",
    icon: "/icons/x-logo.svg",
    // X 品牌官方就是白 X + 黑色圆角方块，用矢量版保持锐利
    chipBg: "#000000",
    region: "overseas",
    home: "https://x.com/explore/tabs/trending",
    color: "#1d9bf0",
  },
  {
    key: "youtube",
    name: "YouTube 热门",
    icon: "/favicons/youtube.png",
    region: "overseas",
    home: "https://www.youtube.com/feed/trending",
    color: "#ff0000",
  },
];

export const PLATFORM_MAP: Record<PlatformKey, PlatformDef> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p])
) as Record<PlatformKey, PlatformDef>;
