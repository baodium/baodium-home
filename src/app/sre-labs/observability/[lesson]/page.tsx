import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { OBSERVABILITY_COURSE } from "@/lib/sre/observability-course";
import { SreChrome } from "@/components/sre/SreChrome";
import { CourseSyllabus } from "@/components/sre/CourseSyllabus";
import { COURSE_TEACHING } from "@/lib/sre/course-teaching";
import { CourseCommand } from "@/components/sre/CourseCommand";
export function generateStaticParams() {
  return OBSERVABILITY_COURSE.map(({ slug }) => ({ lesson: slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson } = await params;
  const item = OBSERVABILITY_COURSE.find((row) => row.slug === lesson);
  return {
    title: item ? `${item.title} · Observability course` : "Lab not found",
    description: item?.outcome,
    alternates: { canonical: `/sre-labs/observability/${lesson}` },
  };
}
export default async function LessonPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson } = await params;
  const index = OBSERVABILITY_COURSE.findIndex((row) => row.slug === lesson);
  if (index < 0) notFound();
  const item = OBSERVABILITY_COURSE[index];
  const teaching = COURSE_TEACHING[item.slug];
  const next = OBSERVABILITY_COURSE[index + 1];
  const previous = OBSERVABILITY_COURSE[index - 1];
  return (
    <SreChrome showSections={false}>
      <div className="course-layout">
        <aside className="course-syllabus">
          <Link href="/sre-labs/observability" className="course-back">
            <ArrowLeft size={14} /> Course overview
          </Link>
          <p className="product-eyebrow">Build an observable checkout</p>
          <CourseSyllabus
            items={OBSERVABILITY_COURSE.map(({ slug, title }) => ({
              slug,
              title,
            }))}
            current={lesson}
          />
          <a
            href="/downloads/baodium-observability-lab.zip"
            download
            className="course-download"
          >
            <Download size={15} /> Download lab kit
          </a>
          <p>
            Real services in Codespaces or local Docker. Use the workspace Ports tab for hosted tool addresses.
          </p>
        </aside>
        <article className="course-lesson">
          <header>
            <p className="product-eyebrow">
              Exercise {index + 1} of {OBSERVABILITY_COURSE.length} ·{" "}
              {item.tool} · About {item.minutes} min
            </p>
            <h1>{item.title}</h1>
            <p>{item.outcome}</p>
            <div className="course-execution">
              Execute locally · inspect real tool output · verify a checkpoint
            </div>
          </header>
          <nav className="course-tool-links" aria-label="Local tool shortcuts">
            <span>Local Docker shortcuts:</span>
            <a
              href="http://localhost:9097"
              target="_blank"
              rel="noopener noreferrer"
            >
              Prometheus ↗
            </a>
            <a
              href="http://localhost:3007/d/baodium-checkout"
              target="_blank"
              rel="noopener noreferrer"
            >
              Grafana ↗
            </a>
            <a
              href="http://localhost:16697"
              target="_blank"
              rel="noopener noreferrer"
            >
              Jaeger ↗
            </a>
          </nav>
          <section className="course-objective" aria-label="Before you begin">
            <strong>Before you begin</strong>
            <p>
              {index === 0
                ? "In Codespaces, wait for Workspace ready and open a terminal in labs/observability. For local Docker, download and extract the kit, then open its baodium-observability folder."
                : "Keep your stack running. In Codespaces, use labs/observability and the Ports tab for tool URLs; locally, use the extracted baodium-observability folder. Earlier exercises establish the signals used here."}
            </p>
          </section>
          <section className="course-objective" aria-labelledby="prediction-title">
            <p className="product-eyebrow">Before the experiment</p>
            <h2 id="prediction-title">Make a prediction first</h2>
            <p>{teaching.prediction}</p>
            <p>Write your prediction in your lab notes. After the experiment, compare it with what actually happened.</p>
          </section>
          <ol className="course-steps">
            {item.steps.map((step, i) => (
              <li key={step.title}>
                <span className="course-step-number">0{i + 1}</span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.instruction}</p>
                  {step.command ? (
                    <CourseCommand command={step.command} />
                  ) : null}
                  <div className="course-expect">
                    <strong>What to look for</strong>
                    <p>{step.expect}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <section
            className="course-checkpoint"
            aria-labelledby="checkpoint-title"
          >
            <p className="product-eyebrow">Evidence checkpoint</p>
            <h2 id="checkpoint-title">The checkpoint reads the running system.</h2>
            <CourseCommand command={item.checkpoint} />
            <p>{item.checkpointMeaning}</p>
            <p>
              The command exits with a failure code when evidence is missing.
              Passing reports stay in the kit’s reports folder. This page does
              not claim to inspect your local Docker environment.
            </p>
          </section>
          <details className="course-hint">
            <summary>Need a hint or a troubleshooting path?</summary>
            <p>{item.hint}</p>
          </details>
          <details className="course-hint">
            <summary>Check a common misconception</summary>
            <p>{teaching.misconception}</p>
          </details>
          <section className="course-challenge" aria-labelledby="debrief-title">
            <p className="product-eyebrow">How to review your notes</p>
            <h2 id="debrief-title">Turn observations into an explanation</h2>
            <dl className="course-rubric">
              <div><dt>Evidence</dt><dd>{teaching.evidence}</dd></div>
              <div><dt>Reasoning</dt><dd>{teaching.explanation}</dd></div>
              <div><dt>Transfer</dt><dd>{teaching.transfer}</dd></div>
            </dl>
            <p>Use these criteria to review your notes. Automated system checks do not assess your explanation.</p>
          </section>
          <section className="course-challenge">
            <h2>Explain what you found</h2>
            <p>{item.challenge}</p>
          </section>
          <section className="course-cleanup">
            <h2>Leave the environment in a known state</h2>
            <p>
              Continue to the next exercise with the stack running. When
              finished, stop and remove only this lab’s Compose services and
              volumes.
            </p>
            <CourseCommand command="node lab.mjs down" />
            <a href={item.reference} target="_blank" rel="noopener noreferrer">
              Reference: {item.referenceTitle} ↗
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </section>
          <nav className="course-next" aria-label="Exercise navigation">
            {previous ? (
              <Link href={`/sre-labs/observability/${previous.slug}`}>
                <ArrowLeft size={16} />
                {previous.title}
              </Link>
            ) : (
              <Link href="/sre-labs/observability">Course overview</Link>
            )}
            {next ? (
              <Link href={`/sre-labs/observability/${next.slug}`}>
                Next: {next.title}
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link href="/sre-labs">
                Try an independent browser incident <ArrowRight size={16} />
              </Link>
            )}
          </nav>
        </article>
      </div>
    </SreChrome>
  );
}
