"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { ProblemSummary } from "@/lib/labs/coding";
import {
  codingServerSnapshot,
  loadCodingProgress,
  subscribeCodingProgress,
} from "@/lib/labs/coding-progress";
export function CodingRoadmap({
  problems,
  categories,
}: {
  problems: ProblemSummary[];
  categories: string[];
}) {
  const progress = useSyncExternalStore(
    subscribeCodingProgress,
    loadCodingProgress,
    codingServerSnapshot,
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [difficulty, setDifficulty] = useState("All levels");
  const [status, setStatus] = useState("All exercises");
  const complete = problems.filter(
    (problem) => progress[problem.id]?.status === "passed",
  ).length;
  const next =
    problems.find((problem) => progress[problem.id]?.status !== "passed") ??
    problems[0];
  const filtered = problems.filter(
    (problem) =>
      `${problem.title} ${problem.category}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All topics" || category === problem.category) &&
      (difficulty === "All levels" || difficulty === problem.difficulty) &&
      (status === "All exercises" ||
        (status === "Passed"
          ? progress[problem.id]?.status === "passed"
          : progress[problem.id]?.status !== "passed")),
  );
  return (
    <>
      <div className="coding-roadmap-summary">
        <div>
          <strong>
            {complete}
            <span> / {problems.length}</span>
          </strong>
          <p>Full suites passed on this device</p>
        </div>
        <progress
          aria-label="Coding exercises completed"
          value={complete}
          max={problems.length}
        />
        <Link className="labs-button" href={`/sre-labs/coding/${next.id}`}>
          {complete === problems.length
            ? "Review an exercise"
            : "Continue practice"}{" "}
          →
        </Link>
      </div>
      <div className="coding-filters">
        <label>
          Find an exercise
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Logs, retries, deployment…"
          />
        </label>
        <label>
          Topic
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {["All topics", ...categories].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            {["All levels", "Foundation", "Intermediate", "Advanced"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Progress
          <select
            aria-label="Progress"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {["All exercises", "To practice", "Passed"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="coding-note" role="status">
        {filtered.length} exercises shown. Passing examples alone does not
        complete an exercise. Progress is local to this browser.
      </p>
      {filtered.length === 0 ? (
        <div className="labs-empty">
          <h2>No matching exercises</h2>
          <button
            className="labs-button secondary"
            onClick={() => {
              setQuery("");
              setCategory("All topics");
              setDifficulty("All levels");
              setStatus("All exercises");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        categories.map((group, index) => {
          const rows = filtered.filter((problem) => problem.category === group);
          return rows.length ? (
            <section className="coding-roadmap-group" key={group}>
              <header>
                <span className="labs-step">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{group}</h2>
                  <p>
                    {
                      problems.filter(
                        (problem) =>
                          problem.category === group &&
                          progress[problem.id]?.status === "passed",
                      ).length
                    }{" "}
                    /{" "}
                    {
                      problems.filter((problem) => problem.category === group)
                        .length
                    }{" "}
                    completed
                  </p>
                </div>
              </header>
              <ol>
                {rows.map((problem) => (
                  <li key={problem.id}>
                    <Link href={`/sre-labs/coding/${problem.id}`}>
                      <span
                        className={`coding-status ${progress[problem.id]?.status === "passed" ? "passed" : ""}`}
                        aria-label={
                          progress[problem.id]?.status === "passed"
                            ? "Full suite passed"
                            : progress[problem.id]?.status === "attempted"
                              ? "Attempted"
                              : "Not started"
                        }
                      >
                        {progress[problem.id]?.status === "passed"
                          ? "✓"
                          : progress[problem.id]?.status === "attempted"
                            ? "◐"
                            : "○"}
                      </span>
                      <strong>{problem.title}</strong>
                      <span className="coding-row-meta">
                        {problem.difficulty} · {problem.minutes} min
                      </span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null;
        })
      )}
    </>
  );
}
