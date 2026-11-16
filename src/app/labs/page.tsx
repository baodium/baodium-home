import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import "@/components/learning/lesson-craft.css";
import { SRE_LESSONS, type SreLabKey } from "@/lib/sre/catalog";

export const metadata: Metadata = {
  title: "Labs",
  description:
    "Hands-on SRE labs. Six browser lessons, twenty-four functions, and eight exercises on a running checkout.",
  alternates: { canonical: "https://labs.baodium.com/" },
};

const LESSON_COPY: Record<SreLabKey, { line: string; hint: string }> = {
  instrument: {
    line: "Checkout is slow, and the outbound call is invisible. You add the signals and name the hop.",
    hint: "About ten minutes. You add a metric, a span, and a log, then name the hop holding the time.",
  },
  slo: {
    line: "You decide what counts as a good checkout, set 99.5 percent, and watch the misses spend the budget.",
    hint: "About twelve minutes. Seventeen misses in a thousand is 98.3 percent. 98.3 percent does not meet 99.5 percent.",
  },
  alert: {
    line: "You compare a busy host, a short spike, a sustained failure, and missing telemetry.",
    hint: "About fifteen minutes. You page only when the short window and the long window agree.",
  },
  cascade: {
    line: "A slow provider fills its slots. You follow checkout through retries and deadlines, then bring it back.",
    hint: "About twenty minutes. You change one limit and rerun the same seed. The prompt does not name the control.",
  },
  capacity: {
    line: "A surge fills a bounded queue. You compare extra workers with a controller keyed to utilization.",
    hint: "About fifteen minutes. You hold latency through the surge without turning traffic away.",
  },
  deployment: {
    line: "You send a fraction of traffic to a bad release, watch the failures, and take the share back.",
    hint: "About twelve minutes. You choose the share, then stop it. The prompt does not name the share.",
  },
};

export default function LabsPage() {
  const [first, ...rest] = SRE_LESSONS;
  return (
    <LabsShell>
      <section className="labs-hero">
        <p className="labs-kicker">Labs</p>
        <h1>Practice hands-on SRE labs.</h1>
        <p className="labs-intro">
          You add the signals, spend a 99.5 percent budget, and page only when
          customers are still failing. Six lessons run in the browser.
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
            <dt>
              <span className="hint hint-plain" tabIndex={0}>
                <span className="hint-label">Coding exercises</span>
                <span className="hint-bubble" role="tooltip">
                  Twenty-four functions. The stage moves after the full suite passes. Green examples are not enough.
                </span>
              </span>
            </dt>
            <dd>24</dd>
          </div>
          <div>
            <dt>
              <span className="hint hint-plain" tabIndex={0}>
                <span className="hint-label">Real-stack lessons</span>
                <span className="hint-bubble" role="tooltip">
                  Eight exercises on a running checkout. You need Docker, or a Codespaces workspace.
                </span>
              </span>
            </dt>
            <dd>8</dd>
          </div>
          <div>
            <dt>
              <span className="hint hint-plain" tabIndex={0}>
                <span className="hint-label">Browser lessons</span>
                <span className="hint-bubble" role="tooltip">
                  Six lessons in the browser. Nothing to install. Each one is about ten to twenty minutes.
                </span>
              </span>
            </dt>
            <dd>6</dd>
          </div>
        </dl>
      </section>

      <section className="labs-course" id="course" aria-labelledby="course-title">
        <header className="labs-course-head">
          <div>
            <p className="labs-kicker">The course</p>
            <h2 id="course-title">What you will practice first</h2>
          </div>
          <p>
            Lesson 1 takes about ten minutes. You turn on a metric, a span, and a log, then name the hop. In Challenge, the prompt does not name the hop.
          </p>
        </header>
        <ol className="labs-lessons">
          <li className="labs-lesson is-first" style={{ animationDelay: "0ms" }}>
            <Link href={`/sre-labs/${first.id}`}>
              <span className="labs-lesson-index">01</span>
              <span className="labs-lesson-copy">
                <span className="labs-lesson-kicker">Start here</span>
                <h3>{first.title}</h3>
                <p>{LESSON_COPY[first.id].line}</p>
              </span>
              <span className="labs-time hint hint-plain">
                <span className="hint-label">{first.minutes} min · {first.difficulty}</span>
                <span className="hint-bubble" role="tooltip">{LESSON_COPY[first.id].hint}</span>
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
                <span className="labs-lesson-index">{String(index + 2).padStart(2, "0")}</span>
                <span className="labs-lesson-copy">
                  <h3>{lesson.title}</h3>
                  <p>{LESSON_COPY[lesson.id].line}</p>
                </span>
                <span className="labs-time hint hint-plain">
                  <span className="hint-label">{lesson.minutes} min · {lesson.difficulty}</span>
                  <span className="hint-bubble" role="tooltip">{LESSON_COPY[lesson.id].hint}</span>
                </span>
                <span className="labs-lesson-go" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="labs-paths" aria-labelledby="paths-title">
        <div className="labs-section-heading">
          <div>
            <p className="labs-kicker">Paths</p>
            <h2 id="paths-title">Open the SRE path.</h2>
          </div>
        </div>
        <div className="labs-path-board">
          <Link className="labs-path-lead" href="/sre-labs">
            <span className="labs-time">Open now</span>
            <h3>Site reliability engineering</h3>
            <p>
              Six browser lessons and twenty-four functions are published. You name the slow hop, spend the 99.5 percent budget, and decide when to page.
            </p>
            <span className="labs-path-go">Open the SRE path</span>
          </Link>
          <div className="labs-path-later">
            <article>
              <span className="labs-time">No lesson yet</span>
              <h3>Cybersecurity</h3>
              <p>Defensive analysis, secure configuration, and investigation.</p>
            </article>
            <article>
              <span className="labs-time">No lesson yet</span>
              <h3>Platform engineering</h3>
              <p>Delivery pipelines and infrastructure automation.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="labs-practice" aria-labelledby="practice-title">
        <header className="labs-course-head">
          <div>
            <p className="labs-kicker">Practice</p>
            <h2 id="practice-title">Pick a practice by how long you have.</h2>
          </div>
        </header>
        <div className="labs-practice-board">
          <Link className="labs-practice-lead" href="/sre-labs#practice-labs">
            <span className="labs-time hint hint-plain">
              <span className="hint-label">10 to 20 minutes</span>
              <span className="hint-bubble" role="tooltip">
                Each lesson is about ten to twenty minutes. Nothing to install.
              </span>
            </span>
            <h3>Work a checkout incident</h3>
            <p>Slow hops, budgets, pages, cascades, queues, and bad releases.</p>
            <span className="labs-path-go">Open the six lessons</span>
          </Link>
          <div className="labs-practice-rest">
            <Link href="/sre-labs/coding">
              <span className="labs-time hint hint-plain">
                <span className="hint-label">15 to 35 minutes</span>
                <span className="hint-bubble" role="tooltip">
                  Most functions take fifteen to thirty-five minutes. The stage moves after the full suite passes.
                </span>
              </span>
              <h3>Write one function</h3>
              <p>
                Go, TypeScript, and Python share the same checks. Green examples do not finish the exercise.
              </p>
              <span className="labs-path-go">Open the coding exercises</span>
            </Link>
            <Link href="/sre-labs/observability">
              <span className="labs-time hint hint-plain">
                <span className="hint-label">Plan a sitting</span>
                <span className="hint-bubble" role="tooltip">
                  Eight exercises. You open Codespaces or local Docker, then read Prometheus, Grafana, and Jaeger.
                </span>
              </span>
              <h3>Query a running checkout</h3>
              <p>
                Express, FastAPI, Prometheus, Grafana, and Jaeger. You query the telemetry yourself.
              </p>
              <span className="labs-path-go">Open the hands-on course</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="labs-book" aria-labelledby="book-title">
        <div>
          <p className="labs-kicker">From the book</p>
          <h2 id="book-title">Practice the same checkout in the book.</h2>
        </div>
        <div className="labs-book-links">
          <Link className="labs-button secondary" href="/system-design/experience">
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
