"use client";

import { useEffect, useRef } from "react";
import type { FXType, Intensity } from "@/lib/themes";

const COUNTS: Record<FXType, Record<Intensity, number>> = {
  none: { light: 0, medium: 0, heavy: 0 },
  snow: { light: 70, medium: 170, heavy: 320 },
  rain: { light: 110, medium: 230, heavy: 420 },
  storm: { light: 220, medium: 360, heavy: 520 },
};

/** 雷暴参数：雨量由 COUNTS 控制，这里控制闪电频率、亮度与粗细 */
const STORM_CONFIG: Record<
  Intensity,
  { minGap: number; maxGap: number; flashA: number; width: number }
> = {
  light: { minGap: 2500, maxGap: 6000, flashA: 0.1, width: 1.8 },
  medium: { minGap: 1000, maxGap: 2800, flashA: 0.18, width: 2.6 },
  heavy: { minGap: 350, maxGap: 1200, flashA: 0.26, width: 3.2 },
};

interface SnowP {
  kind: "snow";
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  rot: number;
  vr: number;
  phase: number;
  tw: number;
  depth: number;
}

interface RainP {
  kind: "rain";
  x: number;
  y: number;
  len: number;
  vy: number;
  slope: number;
  depth: number;
}

type Particle = SnowP | RainP;

export default function WeatherFX({
  fx,
  intensity,
  theme,
}: {
  fx: FXType;
  intensity: Intensity;
  theme: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<FXType>(fx);
  const intensityRef = useRef<Intensity>(intensity);
  const colorsRef = useRef({ snow: "#ffffff", rain: "#7cb4e4" });

  useEffect(() => {
    fxRef.current = fx;
  }, [fx]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  // 主题变化后读取对应的特效颜色 CSS 变量
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const cs = getComputedStyle(document.documentElement);
      const snow = cs.getPropertyValue("--snow").trim();
      const rain = cs.getPropertyValue("--rain").trim();
      if (snow) colorsRef.current.snow = snow;
      if (rain) colorsRef.current.rain = rain;
    });
    return () => cancelAnimationFrame(id);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let currentKind: FXType | null = null;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();

    // 闪电状态
    const lightning = {
      active: false,
      ttl: 0,
      dur: 1,
      x: 0,
      points: [] as [number, number][],
      nextAt: 1000 + Math.random() * 2000,
      flashA: 0.18,
      width: 2.4,
    };

    const makeParticle = (kind: FXType, randomY: boolean): Particle => {
      const depth = Math.random();
      if (kind === "snow") {
        return {
          kind: "snow",
          x: Math.random() * w,
          y: randomY ? Math.random() * h : -20 - Math.random() * 40,
          r: 1 + Math.random() * 2.8,
          vy: 0.35 + Math.random() * 1.4,
          vx: (Math.random() - 0.5) * 0.35,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.06,
          phase: Math.random() * Math.PI * 2,
          tw: 0.5 + Math.random() * 1.5,
          depth,
        };
      }
      // rain / storm：雷暴的雨滴更快、更长、更倾斜，更有暴风雨感
      const stormMode = kind === "storm";
      return {
        kind: "rain",
        x: Math.random() * (w + 60) - 30,
        y: randomY ? Math.random() * h : -30 - Math.random() * 60,
        len: stormMode ? 16 + Math.random() * 20 : 10 + Math.random() * 16,
        vy: stormMode ? 13 + Math.random() * 11 : 9 + Math.random() * 8,
        slope: stormMode ? 3.5 + Math.random() * 6 : 2.5 + Math.random() * 4,
        depth,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawSnowflake = (p: SnowP, t: number) => {
      const alpha =
        0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.002 * p.tw + p.phase));
      const scale = 0.55 + 0.45 * p.depth;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha * scale;
      ctx.strokeStyle = colorsRef.current.snow;
      ctx.fillStyle = colorsRef.current.snow;
      ctx.lineWidth = Math.max(0.6, p.r * 0.3 * scale);
      const R = p.r * scale;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -R);
        ctx.moveTo(0, -R * 0.55);
        ctx.lineTo(-R * 0.22, -R * 0.78);
        ctx.moveTo(0, -R * 0.55);
        ctx.lineTo(R * 0.22, -R * 0.78);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, R * 0.16), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawRain = (p: RainP) => {
      ctx.strokeStyle = colorsRef.current.rain;
      ctx.globalAlpha = 0.22 + 0.5 * p.depth;
      ctx.lineWidth = 0.9 + p.depth * 0.9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.slope * (0.5 + p.depth), p.y + p.len);
      ctx.stroke();
    };

    const drawLightning = () => {
      if (!lightning.active) return;
      const a = Math.max(0, lightning.ttl / lightning.dur);
      // 全屏闪光（亮度随强度）
      ctx.fillStyle = `rgba(214,230,255,${(a * lightning.flashA).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      // 闪电枝干（粗细随强度）
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,245,0.95)";
      ctx.lineWidth = lightning.width;
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(190,225,255,1)";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      lightning.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt[0], pt[1]);
        else ctx.lineTo(pt[0], pt[1]);
      });
      ctx.stroke();
      ctx.restore();
    };

    const updateLightning = (dtMs: number) => {
      if (!lightning.active) {
        lightning.nextAt -= dtMs;
        if (lightning.nextAt <= 0) {
          // 当前强度决定闪电亮度与粗细
          const cfg = STORM_CONFIG[intensityRef.current];
          lightning.active = true;
          lightning.dur = 90 + Math.random() * 150;
          lightning.ttl = lightning.dur;
          lightning.flashA = cfg.flashA;
          lightning.width = cfg.width;
          lightning.x = 80 + Math.random() * Math.max(120, w - 160);
          const pts: [number, number][] = [];
          let px = lightning.x;
          let py = -20;
          pts.push([px, py]);
          while (py < h * 0.72) {
            py += 28 + Math.random() * 46;
            px = lightning.x + (Math.random() - 0.5) * 90;
            pts.push([px, py]);
          }
          lightning.points = pts;
        }
      } else {
        lightning.ttl -= dtMs;
        if (lightning.ttl <= 0) {
          // 下一次闪电的间隔由强度决定
          const cfg = STORM_CONFIG[intensityRef.current];
          lightning.active = false;
          if (cfg.minGap < 600 && Math.random() < 0.45) {
            // 高密度模式：随机连闪，紧跟第二次闪电
            lightning.nextAt = 100 + Math.random() * 350;
          } else {
            lightning.nextAt =
              cfg.minGap + Math.random() * (cfg.maxGap - cfg.minGap);
          }
        }
      }
    };

    const tick = (t: number) => {
      const dt = Math.min((t - last) / 16.7, 4);
      const dtMs = Math.min(t - last, 100);
      last = t;

      ctx.clearRect(0, 0, w, h);

      const fxNow = fxRef.current;
      const target = COUNTS[fxNow][intensityRef.current];

      // 特效类型变化时重建粒子
      if (currentKind !== fxNow) {
        particles = [];
        currentKind = fxNow;
      }

      // 平滑增减粒子数量
      if (particles.length < target) {
        const add = Math.min(
          target - particles.length,
          Math.max(1, Math.ceil(dt * 2.5))
        );
        for (let i = 0; i < add; i++) particles.push(makeParticle(fxNow, true));
      } else if (particles.length > target) {
        particles.splice(0, Math.max(1, Math.ceil((particles.length - target) * 0.08)));
      }

      // 雷暴：闪电
      if (fxNow === "storm") {
        updateLightning(dtMs);
        drawLightning();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.kind === "snow") {
          p.rot += p.vr * dt;
          p.y += p.vy * dt * (0.8 + 0.4 * p.depth);
          p.x += (p.vx + Math.sin(t * 0.0012 + p.phase) * 0.5) * dt;
          if (p.y > h + 24 || p.x < -30 || p.x > w + 30) {
            particles[i] = makeParticle("snow", false);
            continue;
          }
          drawSnowflake(p, t);
        } else {
          // rain（雷暴模式下为疾风骤雨参数）
          p.y += p.vy * dt;
          p.x += 0.2 * dt;
          if (p.y > h + 40 || p.x > w + 40) {
            particles[i] = makeParticle(fxNow, false);
            continue;
          }
          drawRain(p);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="snow-canvas" aria-hidden="true" />;
}
