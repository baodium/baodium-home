import { CHAPTER1_MODEL, type ChapterSimEngine } from "@/lib/experience/ch01/sim";

export function RequestTimeline({ engine }: { engine: ChapterSimEngine }) {
  const maya = engine.maya;
  if (!maya && !engine.mayaWanted) return null;
  const elapsed = maya ? (maya.total || engine.t - maya.arr) : 0.4;
  const span = Math.max(0.4, elapsed * 1.1);
  const width = (seconds: number) => `${(100 * Math.max(0, seconds)) / span}%`;
  const parts: { seconds: number; color: string; label: string }[] = [];
  if (maya) {
    const catalog = Math.min(maya.catalog, Math.max(0, engine.t - maya.arr));
    parts.push({ seconds: catalog, color: "#2e6aa8", label: "catalog" });
    const waited = maya.state === "queue" ? engine.t - maya.qAt : maya.wait || 0;
    parts.push({ seconds: waited, color: "#c98a0c", label: "waiting for a connection" });
    if (maya.state === "hold" || (maya.state === "done" && maya.outcome === "ok")) {
      const held = maya.state === "done" ? maya.hold : engine.t - (maya.release - maya.hold);
      const other = (maya.hold - maya.sql) / 2;
      parts.push({ seconds: Math.min(held, other), color: "#b9aea4", label: "other work" });
      parts.push({
        seconds: Math.max(0, Math.min(held - other, maya.sql)),
        color: "#7a4fb3",
        label: "running SQL",
      });
      parts.push({ seconds: Math.max(0, held - other - maya.sql), color: "#b9aea4", label: "other work" });
    }
  }
  let cursor = 0;
  const caption = !maya
    ? "Maya is browsing. Her page view starts in a moment."
    : maya.state === "done"
      ? maya.outcome === "ok"
        ? `Maya's page took ${Math.round(maya.total * 1000)} ms: ${Math.round(maya.wait * 1000)} ms waiting for a connection, ${Math.round(maya.sql * 1000)} ms running SQL.`
        : "Maya waited the full second for a connection and her page failed."
      : maya.state === "queue"
        ? `Maya is waiting in line for a connection. ${Math.round((engine.t - maya.qAt) * 1000)} ms so far.`
        : "Maya's page is loading.";

  return (
    <div className="mt-3" aria-live="polite">
      <div className="relative h-7 overflow-hidden rounded-md bg-[#f6f1ea]">
        {parts.map((part) => {
          const left = width(cursor);
          const size = width(part.seconds);
          cursor += part.seconds;
          if (part.seconds <= 0) return null;
          return (
            <i
              key={`${part.label}-${left}`}
              className="absolute inset-y-0"
              style={{ left, width: size, background: part.color }}
              title={part.label}
            />
          );
        })}
        <span
          className="absolute -bottom-0.5 -top-0.5 border-l-2 border-dashed border-[#b03a2e]"
          style={{ left: width(CHAPTER1_MODEL.pageObjectiveMs / 1000) }}
          title="300 ms objective"
        />
      </div>
      <p className="mt-2 flex flex-wrap gap-3 text-xs text-[#6f625a]">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 bg-[#2e6aa8]" />catalog</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 bg-[#c98a0c]" />waiting for a connection</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 bg-[#7a4fb3]" />running SQL</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 bg-[#b9aea4]" />other work</span>
        <span className="text-[#b03a2e]">300 ms objective</span>
      </p>
      <p className="mt-1 text-sm text-[#241c18]">{caption}</p>
    </div>
  );
}
