import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { OBSERVABILITY_COURSE } from "@/lib/sre/observability-course";
import { SreChrome } from "@/components/sre/SreChrome";
import { CourseSyllabus } from "@/components/sre/CourseSyllabus";
import { COURSE_TEACHING } from "@/lib/sre/course-teaching";
import { CourseWalkthrough } from "@/components/sre/CourseWalkthrough";
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
    <SreChrome>
      <div className="course-layout">
        <aside className="course-syllabus">
          <Link href="/sre-labs/observability" className="course-back">
            <ArrowLeft size={14} /> Course overview
          </Link>
          <p className="product-eyebrow">Payments stack</p>
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
            <h2 id="prediction-title">Before you run it</h2>
            <p>{teaching.prediction}</p>
          </section>
          <CourseWalkthrough key={item.slug} lesson={item} />
          <details className="course-hint">
            <summary>Need a hint or a troubleshooting path?</summary>
            <p>{item.hint}</p>
          </details>
          <details className="course-hint">
            <summary>Check a common misconception</summary>
            <p>{teaching.misconception}</p>
          </details>
          <section className="course-challenge" aria-labelledby="debrief-title">
            <h2 id="debrief-title">Before you move on</h2>
            <dl className="course-rubric">
              <div><dt>What to keep</dt><dd>{teaching.evidence}</dd></div>
              <div><dt>What to explain</dt><dd>{teaching.explanation}</dd></div>
              <div><dt>A question to take further</dt><dd>{teaching.transfer}</dd></div>
            </dl>
          </section>
          <section className="course-challenge">
            <h2>Write what you found</h2>
            <p>{item.challenge}</p>
          </section>
          <section className="course-cleanup">
            <h2>Stop the stack when you finish</h2>
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
              <Link href="/labs">
                Try an incident in a product lab <ArrowRight size={16} />
              </Link>
            )}
          </nav>
        </article>
      </div>
    </SreChrome>
  );
}
