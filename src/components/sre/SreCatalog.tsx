"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";
import "@/components/learning/lesson-craft.css";
import { SRE_LESSONS, type SreLabKey } from "@/lib/sre/catalog";
import {
  loadSreProgress,
  sreServerSnapshot,
  subscribeSreProgress,
} from "@/lib/sre/progress";
import { OBSERVABILITY_COURSE } from "@/lib/sre/observability-course";
import { ModeTrack } from "@/components/sre/ModeTrack";

const BROWSER_HINTS: Record<SreLabKey, string> = {
  instrument: "About ten minutes. You add a metric, a span, and a log, then name the hop holding the time.",
  slo: "About twelve minutes. You judge the window against 99.5 percent. Seventeen misses in a thousand is 98.3 percent.",
  alert: "About fifteen minutes. You compare four scenes and page only when both windows agree.",
  cascade: "About twenty minutes. You follow one checkout and change one limit, then rerun the same seed.",
  capacity: "About fifteen minutes. You hold latency through the surge without turning traffic away.",
  deployment: "About twelve minutes. You choose the share on the bad release, then take it back.",
};

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
  const reduce = usePrefersReducedMotion();
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
          <p className="product-eyebrow">SRE labs</p>
          <h1>Practice hands-on SRE labs.</h1>
          <p>
            Eight exercises run Express and FastAPI with Prometheus, Grafana,
            OpenTelemetry, and Jaeger. Those need Docker and Node.js 20 or
            newer. The six lessons below run in the browser.
          </p>
          <Link className="product-button" href="/sre-labs/observability/setup">
            Start the hands-on course <ArrowRight size={17} />
          </Link>
          <Link className="catalog-secondary" href="#practice-labs">
            Or start in the browser ↓
          </Link>
        </div>
        <aside className="course-toolchain">
          <p className="product-eyebrow">What this checkout records</p>
          <div className="course-service-pair">
            <span>
              <strong>Express</strong>Checkout service
            </span>
            <ArrowRight size={20} />
            <span>
              <strong>FastAPI</strong>Payment service
            </span>
          </div>
          <dl>
            <div>
              <dt>Metrics →</dt>
              <dd>Prometheus + PromQL</dd>
            </div>
            <div>
              <dt>Dashboards →</dt>
              <dd>Grafana</dd>
            </div>
            <div>
              <dt>Traces →</dt>
              <dd>OpenTelemetry + Jaeger</dd>
            </div>
            <div>
              <dt>Logs →</dt>
              <dd>Correlated JSON events</dd>
            </div>
          </dl>
          <Link href="/sre-labs/observability" className="product-text-link">
            View the course and prerequisites <ArrowRight size={15} />
          </Link>
          <a
            className="course-download"
            href="/downloads/baodium-observability-lab.zip"
            download
          >
            Download the runnable lab kit ↗
          </a>
        </aside>
      </header>
      <section className="course-objective" aria-label="SRE coding practice">
        <p className="product-eyebrow">Coding practice</p>
        <h2>Practice twenty-four functions in Go, TypeScript, or Python.</h2>
        <p>
          Fleet checks, log analysis, retries, rate limits, and delivery
          policies. Go, TypeScript, and Python share the same checks, and they
          run in the browser.
        </p>
        <Link href="/sre-labs/coding" className="product-button">Open the coding roadmap <ArrowRight size={16}/></Link>
        <Link href="/labs" className="product-text-link">All learning paths</Link>
      </section>
      <section
        className="course-catalog-outline"
        aria-labelledby="course-outline-title"
      >
        <div className="section-heading">
          <div>
            <p className="product-eyebrow">The hands-on path</p>
            <h2 id="course-outline-title">
              Eight exercises on a running checkout.
            </h2>
          </div>
          <span>8 exercises · local execution</span>
        </div>
        <ol>
          {OBSERVABILITY_COURSE.map((lesson, index) => (
            <li key={lesson.slug}>
              <Link href={`/sre-labs/observability/${lesson.slug}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{lesson.title}</strong>
                  <small>
                    {lesson.tool} · {lesson.minutes} min
                  </small>
                </div>
                <ArrowRight size={16} />
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="browser-course" id="practice-labs" aria-labelledby="browser-course-title">
        <header className="browser-course-head">
          <div>
            <p className="product-eyebrow">In the browser</p>
            <h2 id="browser-course-title">Six lessons in the browser.</h2>
            <p>Nothing to install. You start by naming the slow hop.</p>
          </div>
          <Link href={`/sre-labs/${next.id}`} className="product-button">
            {completed ? "Continue" : "Start lesson 1"} <ArrowRight size={16} />
          </Link>
        </header>
        <ol className="browser-lessons">
          {SRE_LESSONS.map((lab, index) => (
            <motion.li
              key={lab.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : index * 0.05 }}
            >
              <Link href={`/sre-labs/${lab.id}`}>
                <span className="browser-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{lab.title}</h3>
                <p>{lab.summary}</p>
                <span className="hint" tabIndex={0}>
                  <span className="hint-label">
                    {lab.minutes} min · {lab.difficulty}
                  </span>
                  <span className="hint-bubble" role="tooltip">
                    {BROWSER_HINTS[lab.id]}
                  </span>
                </span>
                {progress[lab.id]?.completedModes.length ? (
                  <span className="browser-done">Passed on this device</span>
                ) : (
                  <span className="browser-go">Open</span>
                )}
              </Link>
            </motion.li>
          ))}
        </ol>
      </section>
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
      <section aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="product-eyebrow">Filter</p>
            <h2 id="catalog-title">Find a lesson by topic, level, or time.</h2>
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
                    ? "Passed"
                    : progress[lab.id]?.opened
                      ? "In progress"
                      : "Not started"}
                </span>
              </div>
              <h3>
                <Link href={`/sre-labs/${lab.id}`}>{lab.title}</Link>
              </h3>
              <p>{lab.summary}</p>
              <p className="catalog-outcome">{lab.outcome}</p>
              <ModeTrack
                compact
                completed={progress[lab.id]?.completedModes ?? []}
              />
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
                  : "None. Start here."}
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
          <h2>Practice five shorter drills from the book.</h2>
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
