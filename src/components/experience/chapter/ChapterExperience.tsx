"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import chapter from "../../../../content/experience/ch01/chapter.json";
import scenes from "../../../../content/experience/ch01/story/scenes.json";
import { Chapter1Experience } from "@/components/experience/Chapter1Experience";
import { LabPanel, useChapter1LabDone } from "@/components/experience/chapter/LabPanel";
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
  story: "Recommended for you",
  feel: "The product page",
  xray: "The recommendation call",
  operate: "The pool",
  act: "The flag",
  deeper: "The store",
  recap: "What you saw",
};

function firstCursor(actId: string) {
  const index = PATH.findIndex((step) => step.act === actId);
  return index < 0 ? 0 : index;
}

type ChapterProps = { killercodaUrl: string; runnerUrl: string; labUrl: string };
function subscribeMounted() { return () => {}; }
export function ChapterExperience(props: ChapterProps) {
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  return mounted ? <ChapterSession {...props} /> : <article className="bg-[#f6f1ea] p-12 text-[#241c18]"><h1 className="font-serif text-3xl">{chapter.headline}</h1></article>;
}
function ChapterSession({ killercodaUrl, runnerUrl, labUrl }: ChapterProps) {
  const reduced = usePrefersReducedMotion();
  const [engine] = useState(() => new ChapterSimEngine());
  const [saved] = useState(loadActProgress);
  const [cursor, setCursor] = useState(() => Math.min(saved?.cursor ?? 0, PATH.length - 1));
  const [prediction, setPrediction] = useState<PredictionId | null>(saved?.prediction ?? null);
  const [viewOverride, setViewOverride] = useState<{ cursor: number; value: "customer" | "xray" } | null>(null);
  const activeStep = PATH[cursor];
  const activeBeat = activeStep?.kind === "beat" ? scenes.beats[activeStep.index] : null;
  const view = viewOverride?.cursor === cursor ? viewOverride.value : activeBeat?.view === "xray" ? "xray" : "customer";
  const setView = (value: "customer" | "xray") => setViewOverride({ cursor, value });
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.3);
  const [tick, setTick] = useState(0);
  const [mix, setMix] = useState(0);
  const labDone = useChapter1LabDone(Boolean(runnerUrl || labUrl));

  const playingRef = useRef(true);
  const speedRef = useRef(0.3);
  const viewRef = useRef(view);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    playingRef.current = playing;
    speedRef.current = speed;
    viewRef.current = view;
    reducedRef.current = reduced;
  }, [playing, speed, view, reduced]);

  useEffect(() => { saveActProgress({ cursor, prediction }); }, [cursor, prediction]);

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
      engine.requestMaya();
    }
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
      <header className="mx-auto max-w-[1240px] px-6 pb-8 pt-16 sm:px-10 sm:pt-20">
        <p className="font-mono text-sm uppercase tracking-[0.16em] text-[#b4532a]">
          Chapter {chapter.number} · {chapter.title}
        </p>
        <h1 className="lab-title mt-4 max-w-[18em] text-[clamp(2.15rem,3.4vw,3.05rem)] leading-[1.15] tracking-[-0.03em]">
          {chapter.headline}
        </h1>
      </header>
      <nav className="mx-auto flex max-w-[1240px] flex-wrap gap-2.5 px-6 sm:px-10" aria-label="Acts">
        {chapter.acts.map((act, index) => {
          const current = act.id === actId;
          const done = firstCursor(act.id) < cursor || (act.id === "deeper" && labDone);
          return (
            <button
              key={act.id}
              type="button"
              aria-current={current ? "true" : undefined}
              className={`rounded-full border px-4 py-2 text-base ${
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
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-14">
        <StoryPanel
          beat={
            beat ?? {
              act: actId,
              label: actId === "operate" ? "The pool" : "The store",
              title:
                actId === "operate"
                  ? "All 40 connections are busy."
                  : "The same product page, on real services.",
              body_md:
                actId === "operate"
                  ? "The flag is at 100%. The product page calls Recommendation Service, and every lookup waits on the pool.\n\nWork the pool from this state. The story stays here."
                  : "The product page calls Recommendation Service. Every lookup waits on the pool of 40. Start the store and turn the flag on.",
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
            <LabPanel runnerUrl={runnerUrl} labUrl={labUrl} killercodaUrl={killercodaUrl} />
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
