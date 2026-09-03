"use client";

import { useEffect, useState } from "react";

interface Shard {
  id: number;
  left: string;
  top: string;
  width: string;
  height: string;
  delay: string;
  duration: string;
  hue: "pink" | "cyan" | "white";
}

function createShards(): Shard[] {
  return Array.from({ length: 18 }, (_, id) => ({
    id,
    left: `${Math.round(Math.random() * 92)}%`,
    top: `${Math.round(Math.random() * 92)}%`,
    width: `${48 + Math.round(Math.random() * 220)}px`,
    height: `${4 + Math.round(Math.random() * 28)}px`,
    delay: `${-(Math.random() * 7).toFixed(2)}s`,
    duration: `${(3.2 + Math.random() * 5.8).toFixed(2)}s`,
    hue: id % 3 === 0 ? "pink" : id % 3 === 1 ? "cyan" : "white",
  }));
}

/** Randomized, non-interactive shards shown only by the glitch theme. */
export default function GlitchFX({ active }: { active: boolean }) {
  const [shards, setShards] = useState<Shard[]>([]);

  useEffect(() => {
    setShards(active ? createShards() : []);
  }, [active]);

  if (!active) return null;

  return (
    <div className="glitch-fragments" aria-hidden="true">
      {shards.map((shard) => (
        <i
          key={shard.id}
          className={`glitch-shard glitch-shard-${shard.hue}`}
          style={{
            left: shard.left,
            top: shard.top,
            width: shard.width,
            height: shard.height,
            animationDelay: shard.delay,
            animationDuration: shard.duration,
          }}
        />
      ))}
    </div>
  );
}
