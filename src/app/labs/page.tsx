import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
import {
  LessonClose,
  LessonOutcomes,
  LessonPlace,
  LessonTeaching,
} from "@/components/learning/LessonCraft";
export const metadata: Metadata = {
  title: "Labs",
  description:
    "The labs follow one checkout. You add the signals, spend a 99.5% error budget, and decide when a page is warranted. Coding practice runs in the browser in Go, TypeScript, or Python.",
  alternates: { canonical: "https://labs.baodium.com/" },
};
export default function LabsPage() {
  return (
    <LabsShell>
      <section className="labs-hero">
        <div>
          <p className="labs-kicker">Labs</p>
          <h1>The labs follow one checkout, from the first signal to the page.</h1>
          <p className="labs-intro">
            You add the missing signals, spend a 99.5% error budget, and page
            only when customers are affected. Coding practice and the book labs
            sit on the same path.
          </p>
          <div className="labs-actions">
            <Link className="labs-button" href="/sre-labs">
              Explore the SRE path →
            </Link>
            <Link className="labs-text-link" href="/sre-labs/coding">
              Start coding practice ↗
            </Link>
          </div>
          <div className="labs-stats">
            <div>
              <strong>24</strong>
              <span>Coding exercises</span>
            </div>
            <div>
              <strong>8</strong>
              <span>Real-stack lessons</span>
            </div>
            <div>
              <strong>6</strong>
              <span>Incident simulations</span>
            </div>
          </div>
        </div>
        <aside className="labs-hero-panel">
          <div className="labs-panel-top">
            <span>Three kinds of work on this path</span>
            <span aria-hidden="true">↗</span>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Write the checks</strong>
                <p>
                  Parse signals, enforce policies, and test the edge cases in
                  Go, TypeScript, or Python.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Run the stack</strong>
                <p>
                  Start Express, FastAPI, Prometheus, Grafana, and Jaeger, then
                  read what they recorded.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Show the recovery</strong>
                <p>
                  Inject a fault, follow its effect, and check that a healthy
                  window returns.
                </p>
              </div>
            </li>
          </ol>
          <Link href="/sre-labs/observability">
            Open the hands-on course <span>→</span>
          </Link>
        </aside>
      </section>
      <section className="lesson-band" aria-labelledby="path-title">
        <LessonPlace course="Baodium labs" />
        <h2 id="path-title">Site reliability is published. The other two tracks are not.</h2>
        <LessonTeaching
          paragraphs={[
            "Everything on this page uses one checkout. You learn to see which hop held the time, to count only the checkouts that were actually good, and to wake someone only when customers are still failing. The browser lessons do that without installing anything. The coding exercises are the same decisions as functions. The book labs are the chapters those decisions come from.",
            "Cybersecurity and platform engineering are listed below so the map is honest. They are not lessons yet. If you have an hour, start with the first SRE lesson. If you have twenty minutes, start with a coding exercise and finish its suite.",
          ]}
          concepts={[
            {
              name: "Signal",
              body: "Signal means the metric, the span, or the log from one checkout. In lesson 1 you tell them apart and join them to the same request.",
            },
            {
              name: "Error budget",
              body: "The budget is the half a percent of checkouts the 99.5 percent SLO allows you to miss. A slow success spends it. Seventeen misses in a thousand is 98.3 percent, which does not meet the line.",
            },
            {
              name: "Page",
              body: "You wake someone only when the short window and the long window both show customers failing.",
            },
          ]}
        />
        <LessonOutcomes
          items={[
            "Name the hop that holds time on a slow checkout.",
            "Judge a window against a 99.5 percent SLO that counts only timely successes.",
            "Pass a coding suite in Go, TypeScript, or Python, and know why the stage did not move before that.",
          ]}
        />
        <LessonClose
          takeaways={[
            "The open course is the checkout: see the hop, spend the 99.5 percent budget, and page only when customers are still affected.",
            "The coding stage moves after the full suite passes. Green examples are not enough.",
            "The other two tracks are on the map because they are not ready, not because they are hidden.",
          ]}
          reflection={[
            "Do you have an hour for the first SRE lesson, or twenty minutes for one function?",
            "Which of signal, budget, and page is the one you could not explain to someone else yet?",
          ]}
          next={{
            href: "/sre-labs/instrument",
            label: "Start with lesson 1, instrument a service",
            bridge:
              "Lesson 1 is the slow checkout. You turn on a metric, a span, and a log, then name the hop that holds the time. In Challenge, the prompt does not name the hop.",
          }}
        />
      </section>
      <section className="labs-paths" aria-labelledby="paths-title">
        <div className="labs-section-heading">
          <div>
            <p className="labs-kicker">Paths</p>
            <h2 id="paths-title">Site reliability is ready. Cybersecurity and platform engineering are still on paper.</h2>
          </div>
          <p>
            The map lists the later tracks because the lessons are not written yet.
          </p>
        </div>
        <div className="labs-path-board">
          <Link className="labs-path-lead" href="/sre-labs">
            <span className="hint" tabIndex={0}>
              Open now
              <span className="hint-bubble" role="tooltip">
                Lessons, coding exercises, and the book labs all open from this row.
              </span>
            </span>
            <h3>Site reliability engineering</h3>
            <p>
              Six browser lessons and twenty-four functions are published. You name the slow hop, spend the 99.5 percent budget, and decide when to page.
            </p>
            <span className="labs-path-go">Open the SRE path</span>
          </Link>
          <div className="labs-path-later">
            <article>
              <span className="hint" tabIndex={0}>
                On paper
                <span className="hint-bubble" role="tooltip">
                  No exercise is published. The row stays so the map does not pretend the work exists.
                </span>
              </span>
              <h3>Cybersecurity</h3>
              <p>
                Defensive analysis, secure configuration, and investigation will be written here. There is no lesson to start.
              </p>
            </article>
            <article>
              <span className="hint" tabIndex={0}>
                On paper
                <span className="hint-bubble" role="tooltip">
                  Pipelines and infrastructure have no browser lab yet.
                </span>
              </span>
              <h3>Platform engineering</h3>
              <p>
                Delivery pipelines, infrastructure automation, and the tools other engineers use to ship are not written yet.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="labs-practice-options">
        <div>
          <p className="labs-kicker">Practice</p>
          <h2>Pick the kind of work you have time for.</h2>
        </div>
        <Link href="/sre-labs/coding">
          <span className="hint" tabIndex={0}>
            About 15 to 35 minutes
            <span className="hint-bubble" role="tooltip">
              Most functions take fifteen to thirty-five minutes. The stage moves only after the full suite passes.
            </span>
          </span>
          <h3>Practice an SRE coding problem</h3>
          <p>
            The editor runs Go, TypeScript, or Python against the same checks.
            Hints stay closed until you ask, and the reference stays closed
            until you have tried.
          </p>
        </Link>
        <Link href="/sre-labs/observability">
          <span className="hint" tabIndex={0}>
            Eight exercises on a running stack
            <span className="hint-bubble" role="tooltip">
              Plan a sitting, not a single function. You use Codespaces or local Docker, then query Prometheus, Grafana, and Jaeger yourself.
            </span>
          </span>
          <h3>Run an observable checkout</h3>
          <p>
            Open a Codespaces workspace, or the local Docker kit, and query the telemetry yourself.
          </p>
        </Link>
        <Link href="/sre-labs#practice-labs">
          <span className="hint" tabIndex={0}>
            About 10 to 20 minutes
            <span className="hint-bubble" role="tooltip">
              Each browser lesson is about ten to twenty minutes. Nothing to install.
            </span>
          </span>
          <h3>Work an incident</h3>
          <p>
            Cascading failures, capacity, error budgets, and deployment
            decisions, with nothing to install.
          </p>
        </Link>
      </section>
      <section className="labs-book-bridge">
        <div>
          <p className="labs-kicker">From the book</p>
          <h2>The book labs use the same checkout.</h2>
          <p>
            The chapter experiments and the short reliability drills are still
            here.
          </p>
        </div>
        <div>
          <Link
            className="labs-button secondary"
            href="/system-design/experience"
          >
            Book experiments →
          </Link>
          <Link className="labs-text-link" href="/play">
            Quick drills ↗
          </Link>
        </div>
      </section>
    </LabsShell>
  );
}
