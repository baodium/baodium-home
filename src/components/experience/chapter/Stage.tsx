"use client";

import { useEffect, useRef } from "react";
import { CHAPTER1_MODEL, type ChapterSimEngine } from "@/lib/experience/ch01/sim";
import { paintStage, STAGE } from "@/components/experience/chapter/drawStage";
import { ActOnIt } from "@/components/experience/chapter/ActOnIt";
import { RequestTimeline } from "@/components/experience/chapter/RequestTimeline";

export function Stage({
  engine,
  tick,
  view,
  mix,
  reduced,
  playing,
  speed,
  onView,
  onTogglePlay,
  onSpeed,
  showTimeline,
  showFlagStatus,
}: {
  engine: ChapterSimEngine;
  tick: number;
  view: "customer" | "xray";
  mix: number;
  reduced: boolean;
  playing: boolean;
  speed: number;
  onView: (view: "customer" | "xray") => void;
  onTogglePlay: () => void;
  onSpeed: (speed: number) => void;
  showTimeline: boolean;
  showFlagStatus: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stats = engine.windowStats();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = STAGE.width * ratio;
    canvas.height = STAGE.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintStage(ctx, engine, mix, reduced);
  }, [engine, tick, mix, reduced]);

  const metric = (label: string, value: string, bad = false) => (
    <div key={label} className={`border-t-2 pt-2 ${bad ? "border-[#b03a2e]" : "border-[#e6ddd2]"}`}>
      <span className="block text-sm leading-snug text-[#6f625a]">{label}</span>
      <strong className={`text-xl tabular-nums ${bad ? "text-[#b03a2e]" : "text-[#241c18]"}`}>{value}</strong>
    </div>
  );

  return (
    <section className="rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] p-4 text-[#241c18] sm:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-full border border-[#e6ddd2]" role="group" aria-label="View">
          <button
            type="button"
            className={`px-3.5 py-2 text-[0.95rem] ${view === "customer" ? "bg-[#241c18] text-white" : "bg-white text-[#6f625a]"}`}
            aria-pressed={view === "customer"}
            onClick={() => onView("customer")}
          >
            Product page
          </button>
          <button
            type="button"
            className={`px-3.5 py-2 text-[0.95rem] ${view === "xray" ? "bg-[#241c18] text-white" : "bg-white text-[#6f625a]"}`}
            aria-pressed={view === "xray"}
            onClick={() => onView("xray")}
          >
            The pool
          </button>
        </div>
        <button type="button" className="rounded-lg border border-[#e6ddd2] bg-white px-3.5 py-2 text-[0.95rem]" onClick={onTogglePlay}>
          {playing ? "Pause" : "Play"}
        </button>
        <label className="ml-auto flex items-center gap-2 text-[0.95rem] text-[#6f625a]">
          Speed
          <select
            className="rounded-md border border-[#e6ddd2] bg-white px-1.5 py-1"
            value={String(speed)}
            aria-label="Speed"
            onChange={(event) => onSpeed(Number(event.target.value))}
          >
            <option value="0.15">slow motion</option>
            <option value="0.3">slower</option>
            <option value="1">real time</option>
          </select>
          <span className="tabular-nums">t = {engine.t.toFixed(1)} s</span>
        </label>
      </div>
      <canvas
        ref={canvasRef}
        className="block h-auto w-full rounded-lg bg-[#fbf8f3]"
        aria-label="Animated view of Baodium"
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {metric("Product page p99", stats.page == null ? "–" : `${Math.round(stats.page)} ms`, (stats.page ?? 0) > CHAPTER1_MODEL.pageObjectiveMs)}
        {metric("Waiting for a connection p99", stats.acq == null ? "–" : `${Math.round(stats.acq)} ms`, (stats.acq ?? 0) > 50)}
        {metric("SQL p99", stats.sql == null ? "–" : `${Math.round(stats.sql)} ms`)}
        {metric("Connections busy", `${stats.busy} / ${CHAPTER1_MODEL.pool}`, stats.busy >= CHAPTER1_MODEL.pool)}
        {metric("Requests waiting", String(stats.waiting), stats.waiting > 0)}
      </div>
      {showTimeline ? <RequestTimeline engine={engine} /> : null}
      {showFlagStatus ? (
        <ActOnIt
          seen={engine.instancesSeen()}
          elapsed={engine.flagOffAt == null ? null : engine.t - engine.flagOffAt}
          armed={engine.flagOffAt != null}
        />
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-[#6f625a]">
        One Recommendation Service instance, modelled on the chapter: {CHAPTER1_MODEL.pool} connections, ~
        {Math.round(CHAPTER1_MODEL.holdMean * 1000)} ms per lookup, ~
        {CHAPTER1_MODEL.otherRate + CHAPTER1_MODEL.pageRate} lookups/s at full exposure. Not every request is drawn.
      </p>
    </section>
  );
}
