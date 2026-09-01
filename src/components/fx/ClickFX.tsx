"use client";

import { useEffect, useRef } from "react";
import type { ClickMode } from "@/lib/themes";

type ParticleKind = "heart" | "star" | "snowflake";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  kind: ParticleKind;
  color: string;
  life: number;
  ttl: number;
}

const COLORS: Record<ParticleKind, string[]> = {
  heart: ["#f43f5e", "#fb7185", "#fda4af", "#e11d48"],
  star: ["#fbbf24", "#f59e0b", "#fde68a", "#facc15"],
  snowflake: ["#ffffff", "#dbeafe", "#e0f2fe"],
};

const KIND_POOL: ParticleKind[] = ["heart", "star", "snowflake"];

const MODE_TO_KIND: Record<Exclude<ClickMode, "none" | "mixed">, ParticleKind> = {
  hearts: "heart",
  stars: "star",
  snowflakes: "snowflake",
};

function pickKind(mode: ClickMode): ParticleKind {
  if (mode === "mixed") {
    return KIND_POOL[Math.floor(Math.random() * KIND_POOL.length)];
  }
  if (mode === "none") return "heart";
  return MODE_TO_KIND[mode];
}

/**
 * 鼠标点击特效：点击页面任意位置，迸发出一簇
 * 爱心 / 星星 / 雪花（可混合随机），上飘旋转淡出。
 */
export default function ClickFX({ mode }: { mode: ClickMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<ClickMode>(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;

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

    const spawn = (x: number, y: number) => {
      const kindMode = modeRef.current;
      if (kindMode === "none") return;
      const count = 12 + Math.floor(Math.random() * 7);
      for (let i = 0; i < count; i++) {
        const kind = pickKind(kindMode);
        const colors = COLORS[kind];
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 7,
          vy: -(2 + Math.random() * 5),
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.35,
          size:
            kind === "heart"
              ? 4.5 + Math.random() * 6
              : kind === "star"
                ? 3.5 + Math.random() * 5.5
                : 4 + Math.random() * 5,
          kind,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          ttl: 45 + Math.random() * 35,
        });
      }
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const drawHeart = (p: Particle, alpha: number) => {
      const r = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.42);
      ctx.bezierCurveTo(-r, -r * 0.5, -r * 0.45, -r * 1.08, 0, -r * 0.42);
      ctx.bezierCurveTo(r * 0.45, -r * 1.08, r, -r * 0.5, 0, r * 0.42);
      ctx.fill();
      ctx.restore();
    };

    const drawStar = (p: Particle, alpha: number) => {
      const R = p.size;
      const r = R * 0.45;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? R : r;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawSnowflake = (p: Particle, alpha: number) => {
      const R = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      ctx.lineWidth = Math.max(0.8, R * 0.16);
      ctx.lineCap = "round";
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -R);
        ctx.moveTo(0, -R * 0.5);
        ctx.lineTo(-R * 0.22, -R * 0.7);
        ctx.moveTo(0, -R * 0.5);
        ctx.lineTo(R * 0.22, -R * 0.7);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life >= p.ttl) {
          particles.splice(i, 1);
          continue;
        }
        // 迸发后上飘，轻微重力回落
        p.vy += 0.09;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const alpha = 1 - p.life / p.ttl;
        if (p.kind === "heart") drawHeart(p, alpha);
        else if (p.kind === "star") drawStar(p, alpha);
        else drawSnowflake(p, alpha);
      }
      if (particles.length === 0) {
        running = false;
        ctx.clearRect(0, 0, w, h);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onPointerDown = (e: PointerEvent) => spawn(e.clientX, e.clientY);

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="click-fx-canvas" aria-hidden="true" />
  );
}
