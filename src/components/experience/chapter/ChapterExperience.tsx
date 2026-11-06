"use client";

import { useEffect, useRef, useState } from "react";
import chapter from "../../../../content/experience/ch01/chapter.json";
import scenes from "../../../../content/experience/ch01/story/scenes.json";
import { Chapter1Experience } from "@/components/experience/Chapter1Experience";
import { GoDeeperCard } from "@/components/experience/chapter/GoDeeperCard";
import { Recap } from "@/components/experience/chapter/Recap";
import { Stage } from "@/components/experience/chapter/Stage";
import { StoryPanel, type PredictionId } from "@/components/experience/chapter/StoryPanel";
import { ChapterSimEngine } from "@/lib/experience/ch01/sim";
import { loadActProgress, saveActProgress } from "@/lib/experience/ch01/progress";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

type Step =
  | { kind: "beat"; index: number; act: string }
  | { kind: "operate"; act: "operate" }
  | { kind: "lab"; act: "deeper" };

const PATH: Step[] = [
  { kind: "beat", index: 0, act: "story" },
  { kind: "beat", index: 1, act: "story" },
  { kind: "beat", index: 2, act: "story" },
  { kind: "beat", index: 3, act: "feel" },
  { kind: "beat", index: 4, act: "xray" },
  { kind: "beat", index: 5, act: "xray" },
  { kind: "operate", act: "operate" },
  { kind: "beat", index: 6, act: "act" },
  { kind: "lab", act: "deeper" },
  { kind: "beat", index: 7, act: "recap" },
];

const ACT_LABELS: Record<string, string> = {
  story: "Story",
  feel: "Feel it",
  xray: "X-ray",
  operate: "Operate",
  act: "Act on it",
  deeper: "Live lab",
  recap: "Recap",
};

function firstCursor(actId: string) {
  const index = PATH.findIndex((step) => step.act === actId);
  return index < 0 ? 0 : index;
}

export function ChapterExperience({ killercodaUrl }: { killercodaUrl: string }) {
  const reduced = usePrefersReducedMotion();
  const engineRef = useRef<ChapterSimEngine | null>(null);
  if (!engineRef.current) engineRef.current = new ChapterSimEngine();
  const engine = engineRef.current;
  const [cursor, setCursor] = useState(0);
  const [prediction, setPrediction] = useState<PredictionId | null>(null);
  const [view, setView] = useState<"customer" | "xray">("customer");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.3);
  const [tick, setTick] = useState(0);
  const [mix, setMix] = useState(0);
  const [ready, setReady] = useState(false);
  const playingRef = useRef(true);
  const speedRef = useRef(0.3);
  const viewRef = useRef(view);
  const reducedRef = useRef(reduced);
  playingRef.current = playing;
  speedRef.current = speed;
  viewRef.current = view;
  reducedRef.current = reduced;

  useEffect(() => {
    const saved = loadActProgress();
    if (saved) {
      setCursor(Math.min(saved.cursor, PATH.length - 1));
      setPrediction(saved.prediction);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveActProgress({ cursor, prediction });
  }, [cursor, prediction, ready]);

  useEffect(() => {
    const step = PATH[cursor];
    if (!step || step.kind !== "beat") return;
    const beat = scenes.beats[step.index];
    if (!beat) return;
    if (beat.flagButton) {
      if (engine.target !== 1 && engine.flagOffAt == null) engine.setTarget(1);
    } else if (beat.target !== engine.target) {
      engine.setTarget(beat.target);
    }
    if (beat.maya && (!engine.maya || (engine.maya.state === "done" && engine.t - engine.maya.end > 4))) {
      engine.mayaWanted = true;
    }
    setView(beat.view === "xray" ? "xray" : "customer");
  }, [cursor, engine]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const realDt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        let left = realDt * speedRef.current;
        while (left > 0) {
          const hop = Math.min(left, 0.002);
          engine.step(hop);
          left -= hop;
        }
      }
      const target = viewRef.current === "xray" ? 1 : 0;
      setMix((current) => {
        if (reducedRef.current) return target;
        return current + (target - current) * Math.min(1, realDt / 0.4);
      });
      setTick((value) => (value + 1) % 1_000_000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine]);

  const step = PATH[cursor] ?? PATH[0]!;
  const beat = step.kind === "beat" ? scenes.beats[step.index] ?? null : null;
  const actId = step.act;

  const go = (next: number) => setCursor(Math.max(0, Math.min(PATH.length - 1, next)));
  const restart = () => {
    engine.reset(0);
    setPrediction(null);
    setCursor(0);
    setView("customer");
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (cursor === PATH.length - 1) restart();
      else go(cursor + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(cursor - 1);
    }
  };

  return (
    <article className="bg-[#f6f1ea] text-[#241c18]" onKeyDown={onKeyDown}>
      <header className="mx-auto flex max-w-[1240px] flex-wrap items-baseline gap-3 px-5 pb-2 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#b4532a]">
          Chapter {chapter.number} · {chapter.title}
        </p>
        <h1 className="text-xl font-semibold">{chapter.headline}</h1>
      </header>
      <nav className="mx-auto flex max-w-[1240px] flex-wrap gap-1.5 px-5" aria-label="Acts">
        {chapter.acts.map((act, index) => {
          const current = act.id === actId;
          const done = firstCursor(act.id) < cursor;
          return (
            <button
              key={act.id}
              type="button"
              aria-current={current ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                current
                  ? "border-[#241c18] bg-[#241c18] text-white"
                  : "border-[#e6ddd2] bg-[#fffdf9] text-[#6f625a]"
              }`}
              onClick={() => setCursor(firstCursor(act.id))}
            >
              {index + 1}. {ACT_LABELS[act.id] ?? act.title}
              {done ? <span className="text-[#2f7d4f]"> ✓</span> : null}
            </button>
          );
        })}
      </nav>
      <div className="mx-auto grid max-w-[1240px] gap-4 px-5 py-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <StoryPanel
          beat={
            beat ?? {
              act: actId,
              label: actId === "operate" ? "Operate" : "Live lab",
              title:
                actId === "operate"
                  ? "Operate the incident yourself."
                  : "The same failure, on real services.",
              body_md:
                actId === "operate"
                  ? "Guided, Practice, and Challenge are the lab you already have. They start from the feature, and the incident they reach is this one: 100% rollout, all 40 connections busy.\n\nThe story on the left stays here while you work the pool."
                  : "About 45 minutes. Real services in your browser, nothing to install. Docker stays on your machine or on Killercoda. This site does not start it.",
              view: "xray",
              target: 1,
            }
          }
          predictionChoice={prediction}
          onPredict={setPrediction}
          showReveal={Boolean(beat && "reveal" in beat && beat.reveal)}
          onFlagOff={() => engine.turnFlagOff()}
          flagOff={engine.flagOffAt != null}
          onOperate={() => setCursor(firstCursor("operate"))}
          onLiveLab={() => setCursor(firstCursor("deeper"))}
          onBack={() => go(cursor - 1)}
          onNext={() => {
            if (cursor === PATH.length - 1) restart();
            else go(cursor + 1);
          }}
          backDisabled={cursor === 0}
          nextLabel={cursor === PATH.length - 1 ? "Start over" : "Next"}
        />
        <div>
          {step.kind === "operate" ? (
            <div className="overflow-hidden rounded-xl border border-[#e6ddd2] bg-white">
              <Chapter1Experience />
            </div>
          ) : step.kind === "lab" ? (
            <GoDeeperCard url={killercodaUrl} />
          ) : (
            <>
              <Stage
                engine={engine}
                tick={tick}
                view={view}
                mix={mix}
                reduced={reduced}
                playing={playing}
                speed={speed}
                onView={setView}
                onTogglePlay={() => setPlaying((value) => !value)}
                onSpeed={setSpeed}
                showTimeline={Boolean(beat?.maya) || step.kind === "beat" && step.index === 5}
                showFlagStatus={Boolean(beat && "flagButton" in beat && beat.flagButton)}
              />
              {actId === "recap" ? (
                <Recap
                  onOperate={() => setCursor(firstCursor("operate"))}
                  onLiveLab={() => setCursor(firstCursor("deeper"))}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
