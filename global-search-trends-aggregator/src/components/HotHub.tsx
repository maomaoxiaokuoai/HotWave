"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlatformCard from "./PlatformCard";
import WeatherFX from "./WeatherFX";
import { Icon } from "./icons";
import {
  FX_DEFS,
  FX_WITH_INTENSITY,
  INTENSITIES,
  INTENSITY_LABELS,
  THEMES,
  isFxType,
  isIntensity,
  isThemeId,
  type FXType,
  type Intensity,
  type ThemeId,
} from "@/lib/themes";
import type { AggregateResult } from "@/lib/hotsearch";
import type { Region } from "@/lib/hotsearch/types";

type RegionFilter = "all" | Region;

const AUTO_REFRESH_MS = 180_000; // 3 分钟自动刷新

export default function HotHub() {
  const [data, setData] = useState<AggregateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>("frost");
  const [fx, setFx] = useState<FXType>("snow");
  const [intensity, setIntensity] = useState<Intensity>("light");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clock, setClock] = useState(() => new Date());

  const firstLoad = useRef(true);

  // ---------- 数据加载 ----------
  const load = useCallback(async (force = false, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hot${force ? "?refresh=1" : ""}`);
      if (!res.ok) throw new Error("接口异常");
      const json = (await res.json()) as AggregateResult;
      setData(json);
    } catch {
      setError("热搜数据加载失败，请点击刷新重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ---------- 初始化：读取本地偏好 + 服务端设置 + 加载数据 ----------
  useEffect(() => {
    try {
      const localTheme = localStorage.getItem("hotwave:theme");
      if (localTheme && isThemeId(localTheme)) {
        document.documentElement.dataset.theme = localTheme;
        setTheme(localTheme);
      }

      // 兼容旧版 snow 键，迁移到新的 fx / intensity
      const localFx = localStorage.getItem("hotwave:fx");
      const localInt = localStorage.getItem("hotwave:intensity");
      if (localFx && isFxType(localFx)) setFx(localFx);
      if (localInt && isIntensity(localInt)) setIntensity(localInt);
      if (!localFx) {
        const oldSnow = localStorage.getItem("hotwave:snow");
        if (oldSnow === "off") {
          setFx("none");
          localStorage.removeItem("hotwave:snow");
        } else if (oldSnow && isIntensity(oldSnow)) {
          setFx("snow");
          setIntensity(oldSnow);
          localStorage.removeItem("hotwave:snow");
        }
      }
    } catch {
      /* ignore */
    }

    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s?.theme && isThemeId(s.theme)) {
          document.documentElement.dataset.theme = s.theme;
          setTheme(s.theme);
        }
        if (s?.fx && isFxType(s.fx)) setFx(s.fx);
        if (s?.intensity && isIntensity(s.intensity)) setIntensity(s.intensity);
      })
      .catch(() => undefined);

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 设置持久化（主题） ----------
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("hotwave:theme", theme);
    } catch {
      /* ignore */
    }
    fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme }),
    }).catch(() => undefined);
  }, [theme]);

  // ---------- 设置持久化（特效） ----------
  useEffect(() => {
    if (firstLoad.current) return;
    try {
      localStorage.setItem("hotwave:fx", fx);
      localStorage.setItem("hotwave:intensity", intensity);
    } catch {
      /* ignore */
    }
    fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fx, intensity }),
    }).catch(() => undefined);
  }, [fx, intensity]);

  // ---------- 自动刷新 ----------
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => load(true, true), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------- 派生数据 ----------
  const platforms = useMemo(
    () =>
      (data?.platforms ?? []).filter(
        (p) => region === "all" || p.region === region
      ),
    [data, region]
  );

  const liveCount = useMemo(
    () => data?.platforms.filter((p) => p.live).length ?? 0,
    [data]
  );
  const totalCount = data?.platforms.length ?? 0;
  const showIntensity = FX_WITH_INTENSITY.includes(fx);

  return (
    <div className="app-bg">
      <WeatherFX fx={fx} intensity={intensity} theme={theme} />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        {/* ============ 顶部栏 ============ */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="floaty flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              }}
            >
              <Icon name="snowflake" className="h-6 w-6" />
            </span>
            <div>
              <h1 className="title-gradient text-2xl font-extrabold tracking-tight sm:text-3xl">
                热浪聚合 · HotWave
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
                国内外热门搜索一站式聚合 · 多风格主题 · 雨雪雷暴特效
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <span className="chip px-2.5 py-1 font-medium" title="当前时间">
              {clock.toLocaleTimeString("zh-CN", { hour12: false })}
            </span>
            <button
              className="tool-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
              onClick={() => load(true)}
              disabled={refreshing}
            >
              <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>
                ⟳
              </span>
              {refreshing ? "刷新中" : "刷新"}
            </button>
            <button
              className={`tool-btn px-3 py-2 text-xs font-semibold ${autoRefresh ? "" : "opacity-60"}`}
              data-active={autoRefresh ? "true" : "false"}
              onClick={() => setAutoRefresh((v) => !v)}
              title="每 3 分钟自动刷新"
            >
              自动刷新 {autoRefresh ? "开" : "关"}
            </button>
          </div>
        </header>

        {/* ============ 主题切换 ============ */}
        <nav aria-label="主题风格" className="mt-6 flex flex-wrap items-center gap-2">
          <span
            className="mr-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            <Icon name="flower" className="h-3.5 w-3.5" />
            风格
          </span>
          {THEMES.map((t) => (
            <button
              key={t.id}
              className="tool-btn flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium"
              data-active={theme === t.id ? "true" : "false"}
              onClick={() => setTheme(t.id)}
              title={t.desc}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.name}
            </button>
          ))}
        </nav>

        {/* ============ 天气特效切换 ============ */}
        <nav aria-label="天气特效" className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="mr-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            <Icon name="zap" className="h-3.5 w-3.5" />
            特效
          </span>
          {FX_DEFS.map((f) => (
            <button
              key={f.id}
              className="tool-btn flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium"
              data-active={fx === f.id ? "true" : "false"}
              onClick={() => setFx(f.id)}
              title={f.desc}
            >
              <Icon name={f.icon} className="h-4 w-4" />
              {f.label}
            </button>
          ))}

          {showIntensity && (
            <>
              <span className="mx-2 hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} />
              <span
                className="mr-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--muted)" }}
              >
                <Icon name="rain" className="h-3.5 w-3.5" />
                强度
              </span>
              {INTENSITIES.map((i) => (
                <button
                  key={i}
                  className="tool-btn px-3.5 py-2 text-[13px] font-medium"
                  data-active={intensity === i ? "true" : "false"}
                  onClick={() => setIntensity(i)}
                >
                  {INTENSITY_LABELS[i]}
                </button>
              ))}
            </>
          )}

          {fx === "storm" && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              ⚡ 强度越大：雨越密、闪电越频繁越亮
            </span>
          )}
        </nav>

        {/* ============ 地区筛选 ============ */}
        <nav aria-label="地区筛选" className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="mr-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            <Icon name="globe" className="h-3.5 w-3.5" />
            地区
          </span>
          {(
            [
              { id: "all", label: "全部" },
              { id: "domestic", label: "国内" },
              { id: "overseas", label: "海外" },
            ] as { id: RegionFilter; label: string }[]
          ).map((r) => (
            <button
              key={r.id}
              className="tool-btn px-3.5 py-2 text-[13px] font-medium"
              data-active={region === r.id ? "true" : "false"}
              onClick={() => setRegion(r.id)}
            >
              {r.label}
            </button>
          ))}
        </nav>

        {/* ============ 统计 ============ */}
        <div
          className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"
          style={{ color: "var(--muted)" }}
        >
          <span>
            {totalCount} 个平台
            {liveCount > 0 && (
              <span className="ml-1" style={{ color: "var(--accent)" }}>
                · {liveCount} 个实时
              </span>
            )}
            {liveCount < totalCount && (
              <span className="ml-1">· {totalCount - liveCount} 个演示</span>
            )}
          </span>
          {data && (
            <span>
              上次更新：
              {new Date(data.updatedAt).toLocaleString("zh-CN", { hour12: false })}
            </span>
          )}
          {data && data.cache === "fresh" && (
            <span className="chip px-2 py-0.5">实时数据</span>
          )}
          {error && <span style={{ color: "var(--accent)" }}>⚠ {error}</span>}
        </div>

        {/* ============ 榜单网格 ============ */}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="card h-96 animate-pulse"
                style={{ background: "var(--chip)" }}
              />
            ))}
          </div>
        ) : platforms.length === 0 ? (
          <div className="card mt-6 flex flex-col items-center justify-center gap-3 p-16 text-center">
            <Icon name="globe" className="h-10 w-10" />
            <p className="font-semibold">暂无数据</p>
            <button className="tool-btn px-4 py-2 text-sm" onClick={() => load(true)}>
              重新加载
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {platforms.map((p, i) => (
              <PlatformCard key={p.key} data={p} index={i} />
            ))}
          </div>
        )}

        {/* ============ 页脚 ============ */}
        <footer
          className="mt-14 border-t pt-6 text-center text-xs leading-relaxed"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <p>
            热浪聚合 · 数据来自 百度 / 微博 / B站 / 知乎 / 抖音 / Google Trends /
            Reddit / Hacker News 等公开接口
          </p>
          <p className="mt-1">
            部分平台接口受网络环境影响，实时抓取失败时将展示演示数据 · 点击榜单条目可跳转源站
          </p>
          <p className="mt-1 opacity-70">
            Made with ❤️ and weather effects · {clock.getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
