"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
export function CourseCommand({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  return (
    <div className="course-command">
      <pre tabIndex={0}>
        <code>{command}</code>
      </pre>
      <button
        type="button"
        aria-label="Copy command"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setState("copied");
          } catch {
            setState("error");
          }
        }}
      >
        {state === "copied" ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <span role="status">
        {state === "copied"
          ? "Copied"
          : state === "error"
            ? "Select the command and copy it manually."
            : ""}
      </span>
    </div>
  );
}
