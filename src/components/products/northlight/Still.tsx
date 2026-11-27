"use client";

import { useEffect, useRef } from "react";
import type { Title } from "@/lib/products/northlight";
import { drawScene } from "./scenes";

export function Still({ title, t = 18, className }: { title: Title; t?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
    const ctx = canvas.getContext("2d");
    if (ctx) drawScene(ctx, title.scene, t, canvas.width, canvas.height);
  }, [title, t]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
