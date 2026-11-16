import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import { SRE_LESSONS, type SreLabKey } from "@/lib/sre/catalog";

export const metadata: Metadata = {
  title: "Labs",
  description:
    "Hands-on SRE labs. Six browser lessons, twenty-four functions, and eight exercises on a running checkout.",
  alternates: { canonical: "https://labs.baodium.com/" },
};

const LESSON_COPY: Record<SreLabKey, string> = {
  instrument: "Checkout is slow, and the outbound call is invisible. You add the signals and name the hop.",
  slo: "You decide what counts as a good checkout, set 99.5 percent, and watch the misses spend the budget.",
  alert: "You compare a busy host, a short spike, a sustained failure, and missing telemetry.",
  cascade: "A slow provider fills its slots. You follow checkout through retries and deadlines, then bring it back.",
  capacity: "A surge fills a bounded queue. You compare extra workers with a controller keyed to utilization.",
  deployment: "You send a fraction of traffic to a bad release, watch the failures, and take the share back.",
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
      </section>

      <section className="labs-course" id="course" aria-labelledby="course-title">
        <header className="labs-course-head">
          <div>
            <p className="labs-kicker">The course</p>
            <h2 id="course-title">What you will practice first</h2>
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
              <span className="labs-time">{first.minutes} min · {first.difficulty}</span>
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
                  <p>{LESSON_COPY[lesson.id]}</p>
                </span>
                <span className="labs-time">{lesson.minutes} min · {lesson.difficulty}</span>
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
              Six browser lessons and twenty-four functions.
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
            <span className="labs-time">10 to 20 minutes</span>
            <h3>Work a checkout incident</h3>
            <p>Six lessons. Nothing to install.</p>
            <span className="labs-path-go">Open the six lessons</span>
          </Link>
          <div className="labs-practice-rest">
            <Link href="/sre-labs/coding">
              <span className="labs-time">15 to 35 minutes</span>
              <h3>Write one function</h3>
              <p>
                Go, TypeScript, and Python share the same checks. Green examples do not finish the exercise.
              </p>
              <span className="labs-path-go">Open the coding exercises</span>
            </Link>
            <Link href="/sre-labs/observability">
              <span className="labs-time">About an afternoon</span>
              <h3>Query a running checkout</h3>
              <p>
                Needs Docker or Codespaces. You read Prometheus, Grafana, and Jaeger yourself.
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
