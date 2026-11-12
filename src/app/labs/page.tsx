import type { Metadata } from "next";
import Link from "next/link";
import { LabsShell } from "@/components/labs/LabsShell";
export const metadata: Metadata = {
  title: "Labs · Learn by building and operating",
  description:
    "SRE labs for a checkout you can instrument, budget, and page. Coding practice runs in the browser in Go, TypeScript, or Python.",
  alternates: { canonical: "https://labs.baodium.com/" },
};
export default function LabsPage() {
  return (
    <LabsShell>
      <section className="labs-hero">
        <div>
          <p className="labs-kicker">Labs</p>
          <h1>A checkout you can instrument, budget, and page.</h1>
          <p className="labs-intro">
            Add the missing signals, spend a 99.5% error budget, and page only
            when customers are affected. Coding practice and the book labs sit
            on the same path.
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
            <span>How the SRE path is organized</span>
            <span aria-hidden="true">↗</span>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Build the automation</strong>
                <p>
                  Parse signals, enforce policies, and test edge cases in Go,
                  TypeScript, or Python.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Operate the system</strong>
                <p>Start Express, FastAPI, Prometheus, Grafana and Jaeger.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Prove the recovery</strong>
                <p>
                  Inject a fault, trace its impact, and verify a healthy window.
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
            <h2 id="paths-title">What you can practice now, and what is still being written.</h2>
          </div>
          <p>
            Site reliability is the path with labs today. Cybersecurity and
            platform engineering are listed so the map stays honest.
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
              Build reliable automation, understand telemetry, and recover
              services with evidence.
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
              A future path for defensive analysis, secure configuration and
              incident investigation in controlled environments.
            </p>
            <div className="labs-track-topics">
              Detection · Hardening · Investigation
            </div>
            <strong>Curriculum in planning</strong>
          </article>
          <article className="labs-track planned">
            <span className="labs-badge">Planned track</span>
            <span className="labs-track-symbol" aria-hidden="true">
              ⊞
            </span>
            <h3>Platform engineering</h3>
            <p>
              A future path for delivery pipelines, infrastructure automation
              and developer platforms.
            </p>
            <div className="labs-track-topics">
              Infrastructure · Kubernetes · CI/CD
            </div>
            <strong>Curriculum in planning</strong>
          </article>
        </div>
      </section>
      <section className="labs-practice-options">
        <div>
          <p className="labs-kicker">Practice</p>
          <h2>Pick the kind of work you have time for.</h2>
        </div>
        <Link href="/sre-labs/coding">
          <span>WRITE CODE / 15–35 MIN</span>
          <h3>Practice an SRE coding problem ↗</h3>
          <p>
            An editor for Go, TypeScript, or Python, with the same checks, hints,
            and a reference you can compare after you have tried.
          </p>
        </Link>
        <Link href="/sre-labs/observability">
          <span>RUN REAL TOOLS / GUIDED COURSE</span>
          <h3>Launch an observable system ↗</h3>
          <p>
            A disposable Codespaces workspace or local Docker kit with
            verifiable telemetry.
          </p>
        </Link>
        <Link href="/sre-labs#practice-labs">
          <span>MAKE DECISIONS / BROWSER SIMULATIONS</span>
          <h3>Work through an incident ↗</h3>
          <p>
            Explore cascading failures, capacity, SLOs and deployment decisions
            without setup.
          </p>
        </Link>
      </section>
      <section className="labs-book-bridge">
        <div>
          <p className="labs-kicker">From the book</p>
          <h2>The same ideas show up in the book labs.</h2>
          <p>
            Explore the existing system-design experiments and quick reliability
            drills.
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
