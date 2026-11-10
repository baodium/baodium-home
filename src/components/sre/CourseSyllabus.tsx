"use client";
import { useState } from "react";
import Link from "next/link";
export function CourseSyllabus({
  items,
  current,
}: {
  items: { slug: string; title: string }[];
  current: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="course-syllabus-navigation" data-open={open}>
      <button
        type="button"
        className="course-contents-toggle"
        aria-expanded={open}
        aria-controls="course-contents"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide course contents" : "Show course contents"}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <ol id="course-contents">
        {items.map((item, index) => (
          <li key={item.slug}>
            <Link
              href={`/sre-labs/observability/${item.slug}`}
              onClick={() => setOpen(false)}
              aria-current={item.slug === current ? "step" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
