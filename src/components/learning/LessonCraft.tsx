import Link from "next/link";
import "./lesson-craft.css";

export type LessonConcept = { name: string; body: string };
export type LessonLink = { href: string; label: string; bridge: string };

export function LessonPlace({
  course,
  index,
  total,
  minutes,
}: {
  course: string;
  index?: number;
  total?: number;
  minutes?: number;
}) {
  const parts = [
    course,
    index && total ? `Lesson ${index} of ${total}` : null,
    minutes ? `${minutes} min` : null,
  ].filter(Boolean);
  return <p className="lesson-place">{parts.join(" · ")}</p>;
}

export function LessonOutcomes({ items }: { items: string[] }) {
  return (
    <section className="lesson-outcomes" aria-label="By the end of this lesson">
      <h2>By the end of this lesson</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function LessonTeaching({
  paragraphs,
  concepts,
}: {
  paragraphs: string[];
  concepts: LessonConcept[];
}) {
  return (
    <section className="lesson-teaching" aria-label="The idea">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <ol className="lesson-concepts">
        {concepts.map((concept) => (
          <li className="lesson-concept" key={concept.name}>
            <h3>{concept.name}</h3>
            <p>{concept.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LessonExercise({
  goal,
  steps,
}: {
  goal: string;
  steps: string[];
}) {
  return (
    <section className="lesson-exercise" aria-label="Exercise">
      <h2>Exercise</h2>
      <p>{goal}</p>
      <ol>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}

export function LessonClose({
  takeaways,
  reflection,
  next,
}: {
  takeaways: string[];
  reflection: string[];
  next?: LessonLink;
}) {
  return (
    <section className="lesson-close" aria-label="After the exercise">
      <h2>Key takeaways</h2>
      <ul>
        {takeaways.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>Reflection</h2>
      <ol>
        {reflection.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      {next ? (
        <div className="lesson-next">
          <p>{next.bridge}</p>
          <Link href={next.href}>{next.label}</Link>
        </div>
      ) : null}
    </section>
  );
}
