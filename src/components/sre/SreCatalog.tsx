"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, SlidersHorizontal } from "lucide-react";
import { SRE_LESSONS } from "@/lib/sre/catalog";
import {
  loadSreProgress,
  sreServerSnapshot,
  subscribeSreProgress,
} from "@/lib/sre/progress";
import { SystemPreview } from "@/components/product/SystemPreview";

export function SreCatalog() {
  const progress = useSyncExternalStore(
    subscribeSreProgress,
    loadSreProgress,
    sreServerSnapshot,
  );
  const [topic, setTopic] = useState("All topics");
  const [difficulty, setDifficulty] = useState("All levels");
  const [duration, setDuration] = useState("Any duration");
  const [prerequisite, setPrerequisite] = useState("All labs");
  const completed = SRE_LESSONS.filter(
    ({ id }) => progress[id]?.completedModes.length,
  ).length;
  const next =
    SRE_LESSONS.find(({ id }) => !progress[id]?.completedModes.length) ??
    SRE_LESSONS[0];
  const filtered = SRE_LESSONS.filter(
    (lab) =>
      (topic === "All topics" || lab.topic === topic) &&
      (difficulty === "All levels" || lab.difficulty === difficulty) &&
      (duration === "Any duration" ||
        (duration === "15 min or less"
          ? lab.minutes <= 15
          : lab.minutes > 15)) &&
      (prerequisite === "All labs" ||
        (prerequisite === "No prerequisites"
          ? lab.prerequisites.length === 0
          : lab.prerequisites.every(
              (id) => progress[id]?.completedModes.length,
            ))),
  );
  const clear = () => {
    setTopic("All topics");
    setDifficulty("All levels");
    setDuration("Any duration");
    setPrerequisite("All labs");
  };
  return (
    <div className="sre-catalog">
      <header className="catalog-hero">
        <div className="catalog-heading">
          <p className="product-eyebrow">
            Baodium SRE Lab / Learn by operating
          </p>
          <h1>
            Know what happened.
            <br />
            <em>Know what to do next.</em>
          </h1>
          <p>
            Build the signals, define reliability, decide when to page, and
            investigate a failing checkout. Six working labs, one progression
            from observation to action.
          </p>
          <Link className="product-button" href={`/sre-labs/${next.id}`}>
            {completed ? "Continue learning" : "Start with instrumentation"}
            <ArrowRight size={17} />
          </Link>
          <p className="catalog-disclosure">
            Browser simulations · no sign-in · recommended prerequisites never
            lock a lab
          </p>
          <div className="catalog-progress">
            <span>
              {completed} of {SRE_LESSONS.length} labs assessed successfully
            </span>
            <progress
              value={completed}
              max={SRE_LESSONS.length}
              aria-label="SRE curriculum completion"
            />
            <small>
              Stored in this browser. Complete any mode to finish a lab.
            </small>
          </div>
        </div>
        <div className="catalog-preview">
          <SystemPreview />
        </div>
      </header>
      <section
        className="curriculum-path"
        aria-label="Recommended learning path"
      >
        {SRE_LESSONS.map((lab, index) => (
          <Link href={`/sre-labs/${lab.id}`} key={lab.id}>
            <span>
              {progress[lab.id]?.completedModes.length ? (
                <Check size={14} aria-label="Completed" />
              ) : (
                `0${index + 1}`
              )}
            </span>
            <div>
              <strong>{lab.topic}</strong>
              <small>
                {lab.minutes} min · {lab.difficulty}
              </small>
            </div>
            {index < 3 ? <ArrowRight size={15} aria-hidden="true" /> : null}
          </Link>
        ))}
      </section>
      <section aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="product-eyebrow">The working curriculum</p>
            <h2 id="catalog-title">Choose your next investigation.</h2>
          </div>
          <span className="catalog-count" role="status">
            {filtered.length} {filtered.length === 1 ? "lab" : "labs"}
          </span>
        </div>
        <div className="catalog-filters">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <label>
            Topic
            <select
              aria-label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {["All topics", ...SRE_LESSONS.map((lab) => lab.topic)].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Difficulty
            <select
              aria-label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {["All levels", "Beginner", "Intermediate"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Duration
            <select
              aria-label="Duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {["Any duration", "15 min or less", "Over 15 min"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Prerequisites
            <select
              aria-label="Prerequisites"
              value={prerequisite}
              onChange={(e) => setPrerequisite(e.target.value)}
            >
              {["All labs", "No prerequisites", "Ready for me"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button onClick={clear} className="catalog-clear">
            Clear filters
          </button>
        </div>
        <div className="catalog-lessons">
          {filtered.map((lab) => (
            <article key={lab.id} className="catalog-lesson">
              <div className="catalog-lesson-top">
                <span className="product-eyebrow">{lab.topic}</span>
                <span className="signal-label">
                  {progress[lab.id]?.completedModes.length
                    ? "Completed"
                    : progress[lab.id]?.opened
                      ? "In progress"
                      : "Ready to explore"}
                </span>
              </div>
              <h3>
                <Link href={`/sre-labs/${lab.id}`}>{lab.title}</Link>
              </h3>
              <p>{lab.summary}</p>
              <p className="catalog-outcome">
                <strong>You’ll learn to</strong>{" "}
                {lab.outcome.charAt(0).toLowerCase() + lab.outcome.slice(1)}
              </p>
              <p className="lesson-meta">
                {lab.difficulty} · About {lab.minutes} min · Browser simulation
              </p>
              <p className="catalog-prerequisites">
                Recommended first:{" "}
                {lab.prerequisites.length
                  ? lab.prerequisites
                      .map(
                        (id) =>
                          SRE_LESSONS.find((item) => item.id === id)!.topic,
                      )
                      .join(", ")
                  : "None — start here"}
              </p>
              <Link href={`/sre-labs/${lab.id}`} className="product-text-link">
                {progress[lab.id]?.completedModes.length
                  ? "Revisit lab"
                  : "Open lab"}
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="catalog-empty">
            <h3>No labs match these filters.</h3>
            <p>Try a broader topic, level or duration.</p>
            <button onClick={clear} className="product-button">
              Show all labs
            </button>
          </div>
        ) : null}
      </section>
      <aside className="curriculum-next">
        <div>
          <p className="product-eyebrow">Keep practicing</p>
          <h2>Five focused reliability drills.</h2>
          <p>
            Explore admission limits, connection pools, caching, tail latency
            and dependency deadlines in shorter experiments.
          </p>
          <Link href="/play" className="product-text-link">
            Open the drill collection <ArrowRight size={16} />
          </Link>
        </div>
        <div>
          <p className="product-eyebrow">Curriculum boundaries</p>
          <p>
            Capacity and canary labs model operational decisions in the browser.
            They do not execute Kubernetes or deploy a real application.
            Advanced cluster operations and real infrastructure environments
            remain future tracks.
          </p>
        </div>
      </aside>
    </div>
  );
}
