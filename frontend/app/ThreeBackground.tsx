"use client";

import { useRef, useEffect } from "react";

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  palIdx: number;
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

const DARK_PALETTES = [
  { r: 165, g: 180, b: 252 },  // indigo-300 — bright on dark
  { r: 196, g: 181, b: 253 },  // violet-300
  { r: 147, g: 197, b: 253 },  // blue-300
];

const LIGHT_PALETTES = [
  { r: 67, g: 56, b: 202 },    // indigo-700 — deep on light
  { r: 91, g: 33, b: 182 },    // violet-700
  { r: 29, g: 78, b: 216 },    // blue-700
];

export default function AnimatedBackground({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boids = useRef<Boid[]>([]);
  const animRef = useRef<number>(0);
  const initialized = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(devicePixelRatio, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    const FLOCK_COUNT = 3;
    const PER_FLOCK = 18;

    if (!initialized.current) {
      initialized.current = true;
      for (let f = 0; f < FLOCK_COUNT; f++) {
        const cx = Math.random() * canvas.width;
        const cy = Math.random() * canvas.height;
        for (let i = 0; i < PER_FLOCK; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.8 + Math.random() * 0.6;
          boids.current.push({
            x: cx + (Math.random() - 0.5) * 120 * dpr,
            y: cy + (Math.random() - 0.5) * 80 * dpr,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            palIdx: f,
          });
        }
      }
    }

    const maxSpeed = 1.8;
    const visualRange = 100 * dpr;
    const separationDist = 25 * dpr;

    function applyRules(b: Boid, all: Boid[], idx: number) {
      let cohX = 0, cohY = 0, cohN = 0;
      let aliVx = 0, aliVy = 0, aliN = 0;
      let sepX = 0, sepY = 0;

      const flockId = Math.floor(idx / PER_FLOCK);

      for (let i = 0; i < all.length; i++) {
        if (i === idx) continue;
        if (Math.floor(i / PER_FLOCK) !== flockId) continue;

        const dx = all[i].x - b.x;
        const dy = all[i].y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < visualRange) {
          cohX += all[i].x;
          cohY += all[i].y;
          cohN++;
          aliVx += all[i].vx;
          aliVy += all[i].vy;
          aliN++;
        }

        if (dist < separationDist) {
          sepX -= dx;
          sepY -= dy;
        }
      }

      if (cohN > 0) {
        b.vx += ((cohX / cohN) - b.x) * 0.002;
        b.vy += ((cohY / cohN) - b.y) * 0.002;
      }
      if (aliN > 0) {
        b.vx += ((aliVx / aliN) - b.vx) * 0.03;
        b.vy += ((aliVy / aliN) - b.vy) * 0.03;
      }
      b.vx += sepX * 0.03;
      b.vy += sepY * 0.03;
    }

    function keepInBounds(b: Boid, w: number, h: number) {
      const margin = 80 * dpr;
      const turn = 0.15;
      if (b.x < margin) b.vx += turn;
      if (b.x > w - margin) b.vx -= turn;
      if (b.y < margin) b.vy += turn;
      if (b.y > h - margin) b.vy -= turn;
    }

    function limitSpeed(b: Boid) {
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (speed > maxSpeed) {
        b.vx = (b.vx / speed) * maxSpeed;
        b.vy = (b.vy / speed) * maxSpeed;
      }
      if (speed < 0.4) {
        b.vx = (b.vx / (speed || 1)) * 0.4;
        b.vy = (b.vy / (speed || 1)) * 0.4;
      }
    }

    const palettes = isDark ? DARK_PALETTES : LIGHT_PALETTES;
    const bodyOpacity = isDark ? 0.6 : 0.45;
    const trailOpacity = isDark ? 0.15 : 0.1;
    const lineOpacity = isDark ? 0.06 : 0.04;
    const connDist = 70 * dpr;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const all = boids.current;

      for (let i = 0; i < all.length; i++) {
        const b = all[i];
        applyRules(b, all, i);
        keepInBounds(b, w, h);
        limitSpeed(b);

        const prevX = b.x;
        const prevY = b.y;
        b.x += b.vx;
        b.y += b.vy;

        const pal = palettes[b.palIdx % palettes.length];
        const r = clamp(pal.r + ((i * 7) % 25) - 12, 0, 255);
        const g = clamp(pal.g + ((i * 11) % 25) - 12, 0, 255);
        const bVal = clamp(pal.b + ((i * 13) % 25) - 12, 0, 255);

        const angle = Math.atan2(b.vy, b.vx);
        const size = 4 * dpr;
        const tailLen = 10 * dpr;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.6, -size * 0.5);
        ctx.lineTo(-size * 0.6, size * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(${r},${g},${bVal},${bodyOpacity})`;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(prevX - b.vx * tailLen, prevY - b.vy * tailLen);
        ctx.strokeStyle = `rgba(${r},${g},${bVal},${trailOpacity})`;
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
      }

      for (let f = 0; f < FLOCK_COUNT; f++) {
        const start = f * PER_FLOCK;
        const end = start + PER_FLOCK;
        const pal = palettes[f % palettes.length];
        for (let i = start; i < end; i++) {
          for (let j = i + 1; j < end; j++) {
            const dx = all[i].x - all[j].x;
            const dy = all[i].y - all[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connDist) {
              const alpha = (1 - dist / connDist) * lineOpacity;
              ctx.beginPath();
              ctx.moveTo(all[i].x, all[i].y);
              ctx.lineTo(all[j].x, all[j].y);
              ctx.strokeStyle = `rgba(${pal.r},${pal.g},${pal.b},${alpha})`;
              ctx.lineWidth = 0.5 * dpr;
              ctx.stroke();
            }
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isDark]);

  return (
    <div className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{ background: "var(--bg)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
