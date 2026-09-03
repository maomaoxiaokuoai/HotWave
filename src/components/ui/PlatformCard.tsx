"use client";

import type { PlatformData } from "@/lib/hotsearch/types";

function rankClass(rank: number): string {
  if (rank === 1) return "rank-1";
  if (rank === 2) return "rank-2";
  if (rank === 3) return "rank-3";
  return "rank-n";
}

export default function PlatformCard({
  data,
  index,
}: {
  data: PlatformData;
  index: number;
}) {
  const live = data.status === "live";
  const stale = data.status === "stale";

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
            // 本地图标万一加载失败，回退到本地品牌 SVG，保证断网也不缺图标
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
            {live ? "实时抓取" : stale ? "上次成功数据" : "抓取失败"} ·{" "}
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
            <i className={live ? "live-dot" : "fail-dot"} />
            {live ? "实时" : stale ? "缓存" : "失败"}
          </span>
          <a
            href={data.home}
            target="_blank"
            rel="noreferrer"
            title="打开官网"
            className="tool-btn flex h-8 w-8 items-center justify-center text-sm"
          >
            ↗
          </a>
        </div>
      </header>

      {/* 榜单 / 失败提示 */}
      {live || stale ? (
        <ol className="p-2">
          {data.items.map((item, i) => (
            <li key={`${data.key}-${i}`}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="link-row group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors"
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
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <span className="text-3xl opacity-70">📡</span>
          <p className="text-sm font-medium">数据源暂不可用</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            该平台接口本次抓取失败，未展示伪造数据。
            <br />
            可点击右上角 ↗ 前往官网查看，或刷新页面重试。
          </p>
        </div>
      )}
    </section>
  );
}
