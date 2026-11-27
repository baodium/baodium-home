"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { SRE_LESSONS, type SreLabKey } from "@/lib/sre/catalog";
import { loadSreProgress, sreServerSnapshot, subscribeSreProgress } from "@/lib/sre/progress";
import "@/components/labs/labs-hub.css";
import "./guided.css";

export type RelatedIncident = { href: string; title: string; product: string };

export function GuidedLessons({ related }: { related: Partial<Record<SreLabKey, RelatedIncident>> }) {
  const progress = useSyncExternalStore(subscribeSreProgress, loadSreProgress, sreServerSnapshot);
  const passed = SRE_LESSONS.filter(({ id }) => progress[id]?.completedModes.length).length;
  const nextIndex = SRE_LESSONS.findIndex(({ id }) => !progress[id]?.completedModes.length);
  const next = SRE_LESSONS[nextIndex === -1 ? 0 : nextIndex];

  return (
    <div className="guided">
      <nav className="guided-crumbs" aria-label="Breadcrumb">
        <Link href="/labs">Labs</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Guided lessons</span>
      </nav>
      <section className="hub-hero guided-hero">
        <p className="labs-kicker">Guided lessons</p>
        <h1>Learn one reliability idea at a time on a small simulated service.</h1>
        <p className="hub-intro">
          Each lesson takes ten to twenty minutes and works through one idea, such as an error budget, a paging rule, or a canary release, on a single request path in your
          browser. Guided mode walks you through it, Practice leaves the steps to you, and Challenge starts with the problem already under way. Each lesson also points to the
          product incident where the same idea decides the outcome.
        </p>
      </section>

      <div className="guided-progress">
        <div>
          <p>
            {passed === 0 ? "No lessons passed on this device yet." : `${passed} of ${SRE_LESSONS.length} lessons passed on this device.`}
          </p>
          <progress value={passed} max={SRE_LESSONS.length} aria-label="Guided lessons passed" />
        </div>
        <Link href={`/sre-labs/${next.id}`} className="guided-start">
          {passed === 0 ? "Start with lesson 1" : passed === SRE_LESSONS.length ? "Revisit lesson 1" : `Continue with lesson ${SRE_LESSONS.indexOf(next) + 1}`}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <ol className="guided-list">
        {SRE_LESSONS.map((lesson, index) => {
          const state = progress[lesson.id];
          const status = state?.completedModes.length ? "Passed" : state?.opened ? "In progress" : "Not started";
          const incident = related[lesson.id];
          return (
            <li key={lesson.id}>
              <span className="guided-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="guided-body">
                <h2>
                  <Link href={`/sre-labs/${lesson.id}`}>{lesson.title}</Link>
                </h2>
                <p>{lesson.summary}</p>
                <p className="guided-meta">
                  {lesson.topic} · About {lesson.minutes} min · {lesson.difficulty}
                </p>
                {incident ? (
                  <p className="guided-related">
                    In a product: <Link href={incident.href}>{incident.title}</Link>, {incident.product}
                  </p>
                ) : null}
              </div>
              <span className="guided-status" data-status={status}>
                {status}
              </span>
            </li>
          );
        })}
      </ol>

      <section className="hub-section" aria-labelledby="further-title">
        <h2 id="further-title" className="hub-section-title">
          After the lessons
        </h2>
        <ul className="hub-more">
          <li>
            <Link href="/sre-labs/observability">
              <h3>The payments stack course</h3>
              <p>
                Eight exercises on an Express checkout service and a FastAPI payment service, with Prometheus, Grafana, OpenTelemetry, and Jaeger running in Docker or Codespaces.
              </p>
              <span>
                Set up the stack <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </li>
          <li>
            <Link href="/labs">
              <h3>Product labs</h3>
              <p>Larder, Northlight, and Porch, each with incidents open in a working product with its own logs, traces, charts, code, and releases.</p>
              <span>
                Open the products <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </li>
          <li>
            <Link href="/sre-labs/coding">
              <h3>Coding exercises</h3>
              <p>Functions for fleet health, retries, rate limits, and safe delivery, written in Go, TypeScript, or Python and checked in the browser.</p>
              <span>
                Open coding practice <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </li>
          <li>
            <Link href="/play">
              <h3>Shorter drills</h3>
              <p>Five experiments from the book on admission limits, connection pools, caching, tail latency, and deadlines between services.</p>
              <span>
                Open the drills <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </li>
        </ul>
        <p className="guided-note">These lessons simulate their services in the browser. None of them deploys or changes real infrastructure.</p>
      </section>
    </div>
  );
}
