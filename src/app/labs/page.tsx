import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import { SRE_LESSONS, type SreLabKey } from "@/lib/sre/catalog";

export const metadata: Metadata = {
  title: "Labs",
  description:
    "Hands-on SRE labs across playback, messaging, search, payments, edge delivery, and sign-in.",
  alternates: { canonical: "https://labs.baodium.com/" },
};

const LESSON_COPY: Record<SreLabKey, string> = {
  instrument:
    "A play start is slow, and the manifest fetch is invisible. The metric, the span, and the log name the hop.",
  slo: "A message send counts as good only when it succeeds in under 300 ms. You watch a 99.5 percent budget get spent.",
  alert:
    "Search queries fail while a host looks busy. You choose which of those signals should page someone.",
  cascade:
    "A card provider holds its slots. Retries ask for another, and new charges wait.",
  capacity:
    "Cache misses hit origin faster than edge workers finish them. Latency is the wait at the POP, not a harder object.",
  deployment:
    "A fraction of sign-ins hit a bad release. You watch the failures and take that share back.",
};

export default function LabsPage() {
  const [first, ...rest] = SRE_LESSONS;
  return (
    <LabsShell>
      <section className="labs-hero">
        <div className="labs-hero-copy">
          <p className="labs-kicker">
            Baodium Labs / Site reliability engineering
          </p>
          <h1>Playback, search, edge delivery, and a payments stack.</h1>
          <p className="labs-intro">
            Browser lessons put you on streaming, messaging, search, edge
            delivery, and auth. Coding practice adds analytics windows and API
            contract checks. You change the simulation, read the evidence, and
            choose the next move. Separately, you can run a payments path
            yourself: Express and FastAPI, with Prometheus, Grafana, and Jaeger.
          </p>
          <div className="labs-actions">
            <Link className="labs-button" href="/sre-labs/instrument">
              Start lesson 1
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="labs-text-link" href="/sre-labs/coding">
              Coding exercises
            </Link>
          </div>
          <dl className="labs-stats">
            <div>
              <dt>Coding exercises</dt>
              <dd>24</dd>
            </div>
            <div>
              <dt>Real-stack lessons</dt>
              <dd>8</dd>
            </div>
            <div>
              <dt>Browser lessons</dt>
              <dd>6</dd>
            </div>
          </dl>
        </div>
        <aside className="labs-system-preview" aria-label="Services in the labs">
          <div className="labs-system-title">
            <span>Production map</span>
            <span>Browser first · payments stack next</span>
          </div>
          <h2>Each lesson sits on a different product surface.</h2>
          <ul className="labs-surfaces">
            <li>
              <Link href="/sre-labs/instrument">
                <span>Streaming</span>
                <strong>Playback calls Manifest</strong>
              </Link>
            </li>
            <li>
              <Link href="/sre-labs/slo">
                <span>Messaging</span>
                <strong>Send calls Fanout</strong>
              </Link>
            </li>
            <li>
              <Link href="/sre-labs/alert">
                <span>Search</span>
                <strong>Query calls Index</strong>
              </Link>
            </li>
            <li>
              <Link href="/sre-labs/cascade">
                <span>Payments</span>
                <strong>A charge calls the card provider</strong>
              </Link>
            </li>
            <li>
              <Link href="/sre-labs/capacity">
                <span>Edge / CDN</span>
                <strong>Origin misses wait on edge workers</strong>
              </Link>
            </li>
            <li>
              <Link href="/sre-labs/deployment">
                <span>Auth</span>
                <strong>Sign-in meets a bad release</strong>
              </Link>
            </li>
          </ul>
          <Link href="/sre-labs/observability/setup">
            Open the payments stack <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </section>

      <section className="labs-mode-grid" aria-label="Choose your learning mode">
        <Link href="/sre-labs/instrument">
          <span className="labs-mode-number">01 / GUIDED</span>
          <h2>Walk through an incident</h2>
          <p>
            Change a live simulation, follow the signals, and explain what
            happened. No setup required.
          </p>
          <strong>Start the walkthrough →</strong>
        </Link>
        <Link href="/sre-labs/coding">
          <span className="labs-mode-number">02 / PRACTICE</span>
          <h2>Write the function</h2>
          <p>
            Fleet health, retries, rate limits, and delivery. Checks run in the
            browser in Go, TypeScript, or Python.
          </p>
          <strong>Open coding practice →</strong>
        </Link>
        <Link href="/sre-labs/observability/setup">
          <span className="labs-mode-number">03 / REAL STACK</span>
          <h2>Operate the payments services</h2>
          <p>
            Express and FastAPI, with Prometheus, Grafana, and Jaeger. Query the
            signals, inject a fault, and confirm recovery.
          </p>
          <strong>Open the hands-on course →</strong>
        </Link>
      </section>

      <section className="labs-course" id="course" aria-labelledby="course-title">
        <header className="labs-course-head">
          <div>
            <p className="labs-kicker">The course</p>
            <h2 id="course-title">Start with a slow play start.</h2>
          </div>
        </header>
        <ol className="labs-lessons">
          <li className="labs-lesson is-first" style={{ animationDelay: "0ms" }}>
            <Link href={`/sre-labs/${first.id}`}>
              <span className="labs-lesson-index">01</span>
              <span className="labs-lesson-copy">
                <span className="labs-lesson-kicker">Start here</span>
                <h3>{first.title}</h3>
                <p>{LESSON_COPY[first.id]}</p>
              </span>
              <span className="labs-time">
                {first.minutes} min · {first.difficulty}
              </span>
              <span className="labs-lesson-go">Open lesson 1</span>
            </Link>
          </li>
          {rest.map((lesson, index) => (
            <li
              key={lesson.id}
              className="labs-lesson"
              style={{ animationDelay: `${(index + 1) * 50}ms` }}
            >
              <Link href={`/sre-labs/${lesson.id}`}>
                <span className="labs-lesson-index">
                  {String(index + 2).padStart(2, "0")}
                </span>
                <span className="labs-lesson-copy">
                  <h3>{lesson.title}</h3>
                  <p>{LESSON_COPY[lesson.id]}</p>
                </span>
                <span className="labs-time">
                  {lesson.minutes} min · {lesson.difficulty}
                </span>
                <span className="labs-lesson-go" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="labs-book" aria-labelledby="book-title">
        <div>
          <p className="labs-kicker">From the book</p>
          <h2 id="book-title">The book’s own incidents.</h2>
          <p>
            The recommendation pool, then a charge the client may have sent
            twice. Those labs follow the manuscript.
          </p>
        </div>
        <div className="labs-book-links">
          <Link
            className="labs-button secondary"
            href="/system-design/experience"
          >
            Open the chapter labs
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="labs-text-link" href="/play">
            Open the short drills
          </Link>
        </div>
      </section>
    </LabsShell>
  );
}
