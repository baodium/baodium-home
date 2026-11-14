import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
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
      <section className="labs-paths" aria-labelledby="paths-title">
        <div className="labs-section-heading">
          <div>
            <p className="labs-kicker">Paths</p>
            <h2 id="paths-title">Site reliability is open now. The other two paths are still being written.</h2>
          </div>
          <p>
            Cybersecurity and platform engineering are on the map so it stays
            honest about what you can open today.
          </p>
        </div>
        <div className="labs-track-grid">
          <Link className="labs-track active" href="/sre-labs">
            <span className="labs-badge">Available now</span>
            <span className="labs-track-symbol" aria-hidden="true">
              ⌁
            </span>
            <h3>Site reliability engineering</h3>
            <p>
              Write the automation, read the telemetry, and bring a service
              back with evidence from the tools.
            </p>
            <div className="labs-track-topics">
              Python · Observability · Incidents · Delivery
            </div>
            <strong>
              Explore SRE <span>→</span>
            </strong>
          </Link>
          <article className="labs-track planned">
            <span className="labs-badge">Planned track</span>
            <span className="labs-track-symbol" aria-hidden="true">
              ◇
            </span>
            <h3>Cybersecurity</h3>
            <p>
              This path is not open yet. It will cover defensive analysis,
              secure configuration, and investigation in a controlled
              environment.
            </p>
            <div className="labs-track-topics">
              Detection · Hardening · Investigation
            </div>
            <strong>Not open yet</strong>
          </article>
          <article className="labs-track planned">
            <span className="labs-badge">Planned track</span>
            <span className="labs-track-symbol" aria-hidden="true">
              ⊞
            </span>
            <h3>Platform engineering</h3>
            <p>
              This path is not open yet. It will cover delivery pipelines,
              infrastructure automation, and the platforms other engineers use.
            </p>
            <div className="labs-track-topics">
              Infrastructure · Kubernetes · CI/CD
            </div>
            <strong>Not open yet</strong>
          </article>
        </div>
      </section>
      <section className="labs-practice-options">
        <div>
          <p className="labs-kicker">Practice</p>
          <h2>Pick the kind of work you have time for.</h2>
        </div>
        <Link href="/sre-labs/coding">
          <span>About 15 to 35 minutes</span>
          <h3>Practice an SRE coding problem</h3>
          <p>
            The editor runs Go, TypeScript, or Python against the same checks.
            Hints stay closed until you ask, and the reference stays closed
            until you have tried.
          </p>
        </Link>
        <Link href="/sre-labs/observability">
          <span>A guided course</span>
          <h3>Run an observable checkout</h3>
          <p>
            A disposable Codespaces workspace, or a local Docker kit, with
            telemetry you query yourself.
          </p>
        </Link>
        <Link href="/sre-labs#practice-labs">
          <span>In the browser</span>
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
