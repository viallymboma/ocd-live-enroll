"use client";

import { Mic, ShoppingBag, Store, Users } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef } from "react";

import { useI18n } from "@/i18n/client";
import { BORDERS, CITIES, CONTINENT, LOME, MAP_H, MAP_W, TOGO } from "./africa-geo";

/**
 * THE SIGNATURE SCENE — Africa with real borders (Natural Earth), Togo lit
 * in OCD orange, Lomé as the origin of every connection. A lens enlarges
 * Togo so its true narrow shape is readable. Avatars float on their own
 * depth layer and follow the pointer a little more than the map (parallax).
 *
 * Pure SVG + transforms: no WebGL, nothing that delays the CTAs next to it.
 */

// Cities far enough from Lomé to draw a readable arc.
const ROUTES = ["Dakar", "Abidjan", "Douala", "Kinshasa", "Nairobi", "Johannesburg", "Cairo", "Casablanca", "Addis Ababa"];

function arc(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  // Bend every arc "upwards" from the map, proportional to its length.
  return `M${x1},${y1} Q${mx},${my - dist * 0.35} ${x2},${y2}`;
}

// The lens: the whole of Togo enlarged (centred on the country, not on Lomé).
const LENS = { x: 78, y: 420, r: 62, zoom: 3.3, cx: 178, cy: 268 };

const AVATARS = [
  { role: "brand", Icon: Store, left: "4%", top: "20%", depth: 1.6, delay: 0.9, tone: "from-[#3a2a20] to-[#1c1512]" },
  { role: "influencer", Icon: Mic, left: "70%", top: "5%", depth: 2.2, delay: 1.1, tone: "from-[#5a2c17] to-[#251510]", live: true },
  { role: "product", Icon: ShoppingBag, left: "50%", top: "52%", depth: 1.3, delay: 1.3, tone: "from-[#3b3226] to-[#1a1612]" },
  { role: "audience", Icon: Users, left: "72%", top: "68%", depth: 1.9, delay: 1.5, tone: "from-[#2d2a26] to-[#141210]" },
] as const;

function useParallax(strength: number, x: MotionValue<number>, y: MotionValue<number>) {
  const tx = useTransform(x, (v) => v * strength);
  const ty = useTransform(y, (v) => v * strength);
  return { x: tx, y: ty };
}

export function AfricaScene({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });
  const mapLayer = useParallax(6, sx, sy);
  const rotX = useTransform(sy, (v) => -v * 3);
  const rotY = useTransform(sx, (v) => v * 4);

  useEffect(() => {
    if (reduce) return;
    // Only fine pointers: on phones the scene stays still (and battery-friendly).
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      px.set((e.clientX / w - 0.5) * 2);
      py.set((e.clientY / h - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py, reduce]);

  const cities = CITIES.filter((c) => ROUTES.includes(c.name));
  const lensTx = LENS.x - LENS.cx * LENS.zoom;
  const lensTy = LENS.y - LENS.cy * LENS.zoom;
  const lensLome = { x: LENS.x + (LOME.x - LENS.cx) * LENS.zoom, y: LENS.y + (LOME.y - LENS.cy) * LENS.zoom };

  return (
    <div ref={ref} className={`relative select-none [perspective:1400px] ${className}`} role="img" aria-label={t.hero.mapLabel}>
      {/* warm light behind the continent */}
      <div aria-hidden className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgb(210_105_42/0.22),transparent)] blur-2xl" />

      <motion.div style={reduce ? undefined : { rotateX: rotX, rotateY: rotY, ...mapLayer }} className="relative [transform-style:preserve-3d]">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-auto w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="land" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor="#2a221d" />
              <stop offset="1" stopColor="#141110" />
            </linearGradient>
            <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="3.5" cy="3.5" r="0.9" fill="#e0a458" opacity="0.22" />
            </pattern>
            <radialGradient id="lomeGlow">
              <stop offset="0" stopColor="#e8843f" stopOpacity="0.9" />
              <stop offset="1" stopColor="#e8843f" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="route" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e8843f" />
              <stop offset="1" stopColor="#e0a458" stopOpacity="0.4" />
            </linearGradient>
            <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <clipPath id="lensClip">
              <circle cx={LENS.x} cy={LENS.y} r={LENS.r} />
            </clipPath>
          </defs>

          {/* extrusion: the same shape, offset and darker, gives the continent thickness */}
          {[10, 7, 4].map((d, i) => (
            <path key={d} d={CONTINENT} transform={`translate(${d * 0.6} ${d})`} fill={["#070605", "#0b0908", "#100d0b"][i]} />
          ))}
          <motion.g
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <path d={CONTINENT} fill="url(#land)" />
            <path d={CONTINENT} fill="url(#dots)" />
            <path d={BORDERS} fill="none" stroke="#4a3e35" strokeWidth="0.6" strokeLinejoin="round" />
            <path d={CONTINENT} fill="none" stroke="#e0a458" strokeOpacity="0.35" strokeWidth="1" />
          </motion.g>

          {/* Togo, lit */}
          <path d={TOGO} fill="#d2692a" filter="url(#soft)" opacity="0.9" />
          <path d={TOGO} fill="#e8843f" stroke="#ffd3a8" strokeWidth="0.4" />

          {/* routes from Lomé */}
          {cities.map((c, i) => {
            const d = arc(LOME.x, LOME.y, c.x, c.y);
            return (
              <g key={c.name}>
                <motion.path
                  d={d}
                  fill="none"
                  stroke="url(#route)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  transition={{ delay: 0.8 + i * 0.12, duration: 1.4, ease: [0.83, 0, 0.17, 1] }}
                />
                <motion.circle
                  cx={c.x}
                  cy={c.y}
                  r="2.6"
                  fill="#e0a458"
                  initial={reduce ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.8 + i * 0.12, duration: 0.5 }}
                  style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                />
                {!reduce && (
                  // a small "signal" travelling from Lomé along each route
                  <circle r="1.8" fill="#fff3e2" opacity="0">
                    <animateMotion dur={`${3.2 + (i % 4) * 0.7}s`} begin={`${2.4 + i * 0.35}s`} repeatCount="indefinite" path={d} />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur={`${3.2 + (i % 4) * 0.7}s`} begin={`${2.4 + i * 0.35}s`} repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Lomé */}
          <circle cx={LOME.x} cy={LOME.y} r="22" fill="url(#lomeGlow)" />
          {!reduce && (
            <circle cx={LOME.x} cy={LOME.y} r="6" fill="none" stroke="#e8843f" strokeWidth="1.2" className="origin-center animate-pulse-ring [transform-box:fill-box]" />
          )}
          <circle cx={LOME.x} cy={LOME.y} r="3.4" fill="#fff3e2" />

          {/* the lens: Togo enlarged, true shape */}
          <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}>
            <line x1={LOME.x - 4} y1={LOME.y + 4} x2={LENS.x + LENS.r * 0.7} y2={LENS.y - LENS.r * 0.7} stroke="#e0a458" strokeOpacity="0.5" strokeDasharray="2 3" />
            <circle cx={LENS.x} cy={LENS.y} r={LENS.r + 1} fill="#0e0c0b" stroke="#e0a458" strokeOpacity="0.55" />
            <g clipPath="url(#lensClip)">
              <g transform={`translate(${lensTx} ${lensTy}) scale(${LENS.zoom})`}>
                <path d={CONTINENT} fill="#1d1815" />
                <path d={BORDERS} fill="none" stroke="#4a3e35" strokeWidth={0.6 / LENS.zoom} />
                <path d={TOGO} fill="#d2692a" stroke="#ffd3a8" strokeWidth={0.5 / LENS.zoom} />
              </g>
              <circle cx={lensLome.x} cy={lensLome.y} r="3.2" fill="#fff3e2" />
              <circle cx={lensLome.x} cy={lensLome.y} r="7" fill="none" stroke="#fff3e2" strokeOpacity="0.5" />
              <text x={lensLome.x + 8} y={lensLome.y - 6} fill="#fff3e2" fontSize="9" fontWeight="700">Lomé</text>
            </g>
            <text x={LENS.x} y={LENS.y + LENS.r + 18} textAnchor="middle" fill="#f3ebdd" fontSize="13" fontWeight="700" letterSpacing="1.5">
              TOGO · LOMÉ
            </text>
            <text x={LENS.x} y={LENS.y + LENS.r + 33} textAnchor="middle" fill="#8f8476" fontSize="10" letterSpacing="1">
              6.13°N · 1.21°E
            </text>
          </motion.g>
        </svg>
      </motion.div>

      {/* floating avatars, on their own depth */}
      {AVATARS.map((a) => (
        <Avatar key={a.role} {...a} label={t.hero.roles[a.role]} sx={sx} sy={sy} reduce={!!reduce} />
      ))}
    </div>
  );
}

function Avatar({
  role,
  Icon,
  left,
  top,
  depth,
  delay,
  tone,
  label,
  live,
  sx,
  sy,
  reduce,
}: {
  role: string;
  Icon: typeof Store;
  left: string;
  top: string;
  depth: number;
  delay: number;
  tone: string;
  label: string;
  live?: boolean;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  reduce: boolean;
}) {
  const p = useParallax(10 * depth, sx, sy);
  return (
    <motion.div
      data-role={role}
      className="absolute"
      style={{ left, top, ...(reduce ? {} : p) }}
      initial={reduce ? false : { opacity: 0, scale: 0.6, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex animate-float items-center gap-2 rounded-full border border-line-2/80 bg-ink/70 py-1 pl-1 pr-3 shadow-[0_12px_30px_-12px_rgb(0_0_0/0.8)] backdrop-blur-md" style={{ animationDelay: `${delay}s` }}>
        <span className={`relative grid size-8 place-items-center rounded-full bg-gradient-to-br ring-1 ring-gold/40 sm:size-9 ${tone}`}>
          <Icon className="size-4 text-gold" strokeWidth={1.8} />
          <span className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-ink ${live ? "bg-live" : "bg-ok"}`} />
        </span>
        <span className="text-[11px] font-bold tracking-wide text-ivory sm:text-xs">
          {label}
          {live && <span className="ml-1.5 rounded-sm bg-live px-1 py-px text-[9px] font-extrabold tracking-widest text-white">LIVE</span>}
        </span>
      </div>
    </motion.div>
  );
}
