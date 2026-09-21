"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  className?: string;
}

interface MeteorItem {
  top: string;
  left: string;
  animationDelay: string;
  animationDuration: string;
  size: number;
}

export const Meteors: React.FC<MeteorsProps> = ({ number = 40, className }) => {
  const [meteors, setMeteors] = useState<MeteorItem[]>([]);

  useEffect(() => {
    // Generate evenly distributed meteors across top and left boundaries
    // so they constantly stream across the viewport non-stop
    const items: MeteorItem[] = [];
    for (let i = 0; i < number; i++) {
      // Spawn points spread across top and upper canvas
      const isTopBand = i % 3 !== 0;
      const top = isTopBand
        ? `${Math.floor(Math.random() * 40 - 20)}%`
        : `${Math.floor(Math.random() * 80)}%`;
      const left = isTopBand
        ? `${Math.floor(Math.random() * 110 - 10)}%`
        : `${Math.floor(Math.random() * 30 - 15)}%`;

      // Fast, fluid durations between 2.2s and 4.2s
      const durationNum = +(Math.random() * 2.0 + 2.2).toFixed(2);
      // Negative delay pre-warms the animation: each meteor starts at a random offset mid-flight
      // This guarantees continuous, non-stop animation with ZERO pauses or gaps!
      const delayNum = -(Math.random() * durationNum).toFixed(2);
      const size = Math.random() > 0.65 ? 1.5 : 1;

      items.push({
        top,
        left,
        animationDelay: `${delayNum}s`,
        animationDuration: `${durationNum}s`,
        size,
      });
    }
    setMeteors(items);
  }, [number]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {meteors.map((item, idx) => (
        <span
          key={idx}
          className={cn(
            "pointer-events-none absolute animate-meteor-continuous rounded-full",
            className
          )}
          style={{
            top: item.top,
            left: item.left,
            animationDelay: item.animationDelay,
            animationDuration: item.animationDuration,
          }}
        >
          {/* Glowing Meteor Head */}
          <span
            className="block rounded-full bg-white shadow-[0_0_8px_2px_rgba(0,242,254,0.9),0_0_14px_rgba(255,255,255,0.95)]"
            style={{
              width: `${item.size * 2.5}px`,
              height: `${item.size * 2.5}px`,
            }}
          />
          {/* Luminous Trail */}
          <span
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -z-10 h-[1.5px] bg-gradient-to-r from-white via-cyan-400/80 to-transparent"
            style={{
              width: `${item.size * 80}px`,
              left: 0,
            }}
          />
        </span>
      ))}
    </div>
  );
};

export default Meteors;
