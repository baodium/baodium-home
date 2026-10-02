"use client";

import { useEffect, useState, type RefObject } from "react";
import { motion } from "motion/react";

const IMG_W = 2752;
const IMG_H = 1536;
/** Just outside his left shoulder in the source photo (fractions of width/height), on black background. */
const SHOULDER = { x: 0.494, y: 0.69 };
/** Must match the desktop object-position of the portrait. */
const OBJECT_POS = { x: 0.88, y: 0.38 };

type Geo = {
  w: number;
  h: number;
  sx: number;
  sy: number;
  clear: number;
  words: Array<{ x: number; y: number }>;
};

function buildPath(geo: Geo, index: number) {
  const target = geo.words[index] ?? geo.words[0];
  const xe = target.x + 18;
  const spine = Math.max(
    Math.max(...geo.words.map((word) => word.x)) + 64,
    geo.clear,
  );
  const xa = Math.min(geo.sx - 24, spine);
  const dy = geo.sy - target.y;
  const r = Math.sign(dy || 1) * Math.min(28, Math.abs(dy) / 2);
  return `M${geo.sx.toFixed(1)} ${geo.sy.toFixed(1)} H${xa.toFixed(1)} V${(target.y + r).toFixed(1)} L${(xa - Math.abs(r)).toFixed(1)} ${target.y.toFixed(1)} H${xe.toFixed(1)}`;
}

export function SignatureTrace({
  sectionRef,
  photoRef,
  wordRefs,
  active,
  drawDelay,
  instant = false,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  photoRef: RefObject<HTMLDivElement | null>;
  wordRefs: RefObject<Array<HTMLSpanElement | null>>;
  active: number;
  drawDelay: number;
  instant?: boolean;
}) {
  const [geo, setGeo] = useState<Geo | null>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const measure = () => {
      const section = sectionRef.current;
      const photo = photoRef.current;
      if (!section || !photo || !desktop.matches) {
        setGeo(null);
        return;
      }
      const s = section.getBoundingClientRect();
      const p = photo.getBoundingClientRect();
      const scale = Math.max(p.width / IMG_W, p.height / IMG_H);
      const rw = IMG_W * scale;
      const rh = IMG_H * scale;
      const ox = (p.width - rw) * OBJECT_POS.x;
      const oy = (p.height - rh) * OBJECT_POS.y;
      const words = (wordRefs.current ?? []).map((node) => {
        if (!node) return { x: 0, y: 0 };
        const r = node.getBoundingClientRect();
        return { x: r.right - s.left, y: r.top - s.top + r.height * 0.56 };
      });
      const copy = section
        .querySelector("[data-hero-line]")
        ?.getBoundingClientRect();
      setGeo({
        clear: copy ? copy.right - s.left + 28 : 0,
        w: s.width,
        h: s.height,
        sx: p.left - s.left + ox + rw * SHOULDER.x,
        sy: p.top - s.top + oy + rh * SHOULDER.y,
        words,
      });
    };

    measure();
    const settle = window.setTimeout(measure, 2300);
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    if (sectionRef.current) observer.observe(sectionRef.current);
    desktop.addEventListener("change", measure);
    return () => {
      window.clearTimeout(settle);
      observer.disconnect();
      desktop.removeEventListener("change", measure);
    };
  }, [sectionRef, photoRef, wordRefs]);

  if (!geo) return null;
  const d = buildPath(geo, Math.max(active, 0));
  const end = geo.words[Math.max(active, 0)] ?? geo.words[0];

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[4] hidden lg:block"
      width={geo.w}
      height={geo.h}
      viewBox={`0 0 ${geo.w} ${geo.h}`}
      fill="none"
    >
      <defs>
        <linearGradient id="sig-stroke" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0" stopColor="#e2b08e" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#c96446" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ad4f36" />
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        stroke="url(#sig-stroke)"
        strokeWidth={1.25}
        initial={{ pathLength: instant ? 1 : 0, d }}
        animate={{ pathLength: 1, d }}
        transition={{
          pathLength: {
            duration: 0.8,
            delay: drawDelay,
            ease: [0.65, 0, 0.35, 1],
          },
          d: { duration: instant ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] },
        }}
      />
      {active >= 0 ? (
        <path
          key={active}
          d={d}
          pathLength={1}
          stroke="#f0d2bb"
          strokeWidth={2}
          strokeLinecap="round"
          className="sig-pulse"
        />
      ) : null}
      <motion.circle
        cx={geo.sx}
        cy={geo.sy}
        r={3}
        fill="#e2b08e"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ delay: drawDelay - 0.1, duration: 0.3 }}
      />
      <motion.g
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1, x: end.x + 18, y: end.y }}
        transition={{
          opacity: { delay: drawDelay + 0.75, duration: 0.25 },
          scale: {
            delay: drawDelay + 0.75,
            type: "spring",
            stiffness: 500,
            damping: 18,
          },
          x: { duration: instant ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] },
          y: { duration: instant ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        <circle r={10} fill="#ad4f36" opacity={0.18} />
        <circle r={3.5} fill="#ad4f36" />
      </motion.g>
    </svg>
  );
}
