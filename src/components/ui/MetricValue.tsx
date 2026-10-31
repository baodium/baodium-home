"use client";

import { useEffect, useState } from "react";
import { useMotionValueEvent, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/** Tracks a live number with a short spring. Reduced motion shows the value immediately. */
export function MetricValue({
  value,
  digits = 0,
  unit,
  className = "",
}: {
  value: number;
  digits?: number;
  unit?: string;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const spring = useSpring(value, { stiffness: 280, damping: 32, mass: 0.35 });
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    spring.set(value);
  }, [reduce, spring, value]);

  useMotionValueEvent(spring, "change", (latest) => {
    if (!reduce) setShown(latest);
  });

  const text = Number.isFinite(shown) ? shown.toFixed(digits) : "0";

  return (
    <span className={`instrument-value ${className}`}>
      {text}
      {unit ? <span className="ml-1 text-[0.62em] font-normal tracking-normal text-[color:var(--exp-faint,var(--drill-faint))]">{unit}</span> : null}
    </span>
  );
}
