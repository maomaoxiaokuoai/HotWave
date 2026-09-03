import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "热浪聚合 HotWave · 国内外热门热搜榜",
  description:
    "一站式聚合国内（百度、微博、B站、知乎、抖音）与海外（Google Trends、Hacker News、X、YouTube）热门搜索榜单，支持多风格主题切换与雪、雨、雷暴等天气特效。",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

// 渲染前应用本地保存的主题，避免闪烁
const themeInitScript = `try{var t=localStorage.getItem("hotwave:theme");if(t){document.documentElement.dataset.theme=t;}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="frost" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
