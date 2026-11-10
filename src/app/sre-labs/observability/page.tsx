import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { OBSERVABILITY_COURSE } from "@/lib/sre/observability-course";
import { SreChrome } from "@/components/sre/SreChrome";
export const metadata: Metadata = {
  title: "Hands-on observability course",
  description:
    "Run Express and FastAPI services with Prometheus, Grafana, OpenTelemetry and Jaeger. Eight actionable labs with evidence checkpoints.",
  alternates: { canonical: "/sre-labs/observability" },
};
export default function CourseOverview() {
  return (
    <SreChrome showSections={false}>
      <section className="course-overview">
        <header>
          <p className="product-eyebrow">
            Baodium SRE / Real tools, local execution
          </p>
          <h1>
            Build an observable checkout.
            <br />
            <em>Prove what happened.</em>
          </h1>
          <p>
            Eight exercises around the same two services. Generate requests,
            inspect the signals, introduce a fault, then verify recovery with
            measured evidence.
          </p>
          <div className="product-actions">
            <Link
              href="/sre-labs/observability/setup"
              className="product-button"
            >
              Start with setup <ArrowRight size={16} />
            </Link>
            <a
              href="/downloads/baodium-observability-lab.zip"
              download
              className="product-text-link"
            >
              <Download size={16} /> Download the complete lab kit
            </a>
          </div>
        </header>
        <div className="course-overview-facts">
          <div>
            <strong>What runs</strong>
            <p>
              Express checkout → FastAPI payment. Prometheus scrapes metrics.
              Grafana queries them. OpenTelemetry exports spans to Jaeger. Both
              services write structured JSON logs.
            </p>
          </div>
          <div>
            <strong>What you need</strong>
            <p>
              Docker with Compose and Node.js 20+. The kit contains the
              application source, pinned dependencies, tool configurations and a
              dependency-free verification CLI.
            </p>
          </div>
          <div>
            <strong>How you prove it</strong>
            <p>
              Each exercise states the expected artifact and a checkpoint
              command. Verifiers query the actual services and tools; they fail
              when the required evidence is absent.
            </p>
          </div>
        </div>
        <ol className="course-index">
          {OBSERVABILITY_COURSE.map((item, index) => (
            <li key={item.slug}>
              <Link href={`/sre-labs/observability/${item.slug}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="product-eyebrow">
                    {item.tool} · {item.minutes} min
                  </p>
                  <h2>{item.title}</h2>
                  <p>{item.outcome}</p>
                </div>
                <ArrowRight size={18} />
              </Link>
            </li>
          ))}
        </ol>
        <aside className="course-boundary">
          <h2>Two different kinds of practice</h2>
          <p>
            This course runs real tools in your local Docker environment.
            Baodium’s browser exercises remain available when you want a quick,
            guided simulation without setup.
          </p>
          <Link href="/sre-labs#practice-labs" className="product-text-link">
            Explore the six browser exercises <ArrowRight size={16} />
          </Link>
        </aside>
      </section>
    </SreChrome>
  );
}
