"use client";

import type { MouseEvent } from "react";
import type { PlatformData } from "@/lib/hotsearch/types";

function rankClass(rank: number): string {
  if (rank === 1) return "rank-1";
  if (rank === 2) return "rank-2";
  if (rank === 3) return "rank-3";
  return "rank-n";
}

/** 外链统一走本站 /go 中转，避免被目标站的 X-Frame-Options/CSP 拦截 */
const goUrl = (raw: string) => `/go?u=${encodeURIComponent(raw)}`;

function handleExternal(e: MouseEvent<HTMLAnchorElement>, url: string) {
  // 保留 Ctrl/Cmd/Shift 点击、中键点击等浏览器原生行为
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
    return;
  }
  e.preventDefault();
  const target = goUrl(url);
  // 优先真正弹出新标签页（可绕开页面级链接拦截）
  const win = window.open(target, "_blank", "noopener,noreferrer");
  // 弹窗被拦截时退回当前页跳转
  if (!win) {
    window.location.assign(target);
  }
}

export default function PlatformCard({
  data,
  index,
}: {
  data: PlatformData;
  index: number;
}) {
  return (
    <section
      className="card overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* 卡片头 */}
      <header
        className="flex items-center gap-3 border-b px-4 py-3.5"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            background:
              data.chipBg ??
              `color-mix(in srgb, ${data.color} 16%, transparent)`,
            borderColor: "var(--border)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.icon}
            alt={`${data.name} 图标`}
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain"
            loading="lazy"
            // 本地 favicon 万一加载失败，回退到本地品牌 SVG，保证断网也不缺图标
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fbk !== "1") {
                img.dataset.fbk = "1";
                img.src = `/icons/${data.key}.svg`;
              }
            }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-bold">{data.name}</h2>
            <span className="chip px-2 py-0.5 text-[11px]">
              {data.region === "domestic" ? "国内" : "海外"}
            </span>
          </div>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--muted)" }}>
            {data.live ? "实时抓取" : "演示数据"} ·{" "}
            {new Date(data.fetchedAt).toLocaleTimeString("zh-CN", {
              hour12: false,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium"
            style={{
              background: "var(--chip)",
              color: "var(--chip-text)",
            }}
          >
            <i className={data.live ? "live-dot" : "demo-dot"} />
            {data.live ? "实时" : "演示"}
          </span>
          <a
            href={goUrl(data.home)}
            target="_blank"
            rel="noreferrer"
            title="打开官网（新标签页）"
            className="tool-btn flex h-8 w-8 items-center justify-center text-sm"
            onClick={(e) => handleExternal(e, data.home)}
          >
            ↗
          </a>
        </div>
      </header>

      {/* 榜单 */}
      <ol className="p-2">
        {data.items.map((item, i) => (
          <li key={`${data.key}-${i}`}>
            <a
              href={goUrl(item.url)}
              target="_blank"
              rel="noreferrer"
              title="新标签页打开"
              className="link-row group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors"
              onClick={(e) => handleExternal(e, item.url)}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${rankClass(i + 1)}`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] leading-snug group-hover:underline">
                {item.title}
              </span>
              {item.hot ? (
                <span
                  className="chip shrink-0 px-2 py-0.5 text-[11px] font-medium"
                  title="热度"
                >
                  {item.hot}
                </span>
              ) : null}
              <span
                className="shrink-0 text-xs opacity-0 transition-opacity group-hover:opacity-60"
                style={{ color: "var(--muted)" }}
              >
                ↗
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
