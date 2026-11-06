import type { ReactNode } from "react";
import scenes from "../../../../content/experience/ch01/story/scenes.json";

export type StoryBeat = (typeof scenes.beats)[number];
export type PredictionId = "a" | "b" | "c";

const prediction = scenes.predictions[0];

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={index} className="text-[#6f625a]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function StoryPanel({
  beat,
  predictionChoice,
  onPredict,
  showReveal,
  onFlagOff,
  flagOff,
  onOperate,
  onLiveLab,
  onBack,
  onNext,
  backDisabled,
  nextLabel,
}: {
  beat: StoryBeat | null;
  predictionChoice: PredictionId | null;
  onPredict: (choice: PredictionId) => void;
  showReveal: boolean;
  onFlagOff: () => void;
  flagOff: boolean;
  onOperate: () => void;
  onLiveLab: () => void;
  onBack: () => void;
  onNext: () => void;
  backDisabled: boolean;
  nextLabel: string;
}) {
  return (
    <section className="flex min-h-[28rem] flex-col rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] p-6 text-[#241c18] sm:p-7" aria-live="polite">
      {beat ? (
        <>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-[#6f625a]">{beat.label}</p>
          <h2 className="mt-3 font-serif text-[1.85rem] leading-snug tracking-[-0.02em]">{beat.title}</h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed">
            {beat.body_md.split("\n\n").map((paragraph) => {
              const trimmed = paragraph.trim();
              if (trimmed.startsWith("[button:")) {
                return (
                  <button
                    key={trimmed}
                    type="button"
                    className="rounded-lg bg-[#b4532a] px-4 py-2.5 text-[0.95rem] font-semibold text-white disabled:opacity-50"
                    onClick={onFlagOff}
                    disabled={flagOff}
                  >
                    {flagOff ? "Flag is off: watch the instances" : "Turn personalization off"}
                  </button>
                );
              }
              if (trimmed.includes("Work the pool")) {
                return (
                  <p key={trimmed} className="flex flex-wrap gap-3">
                    <button type="button" className="underline" onClick={onOperate}>
                      Work the pool
                    </button>
                    <button type="button" className="underline" onClick={onLiveLab}>
                      Open the same store
                    </button>
                  </p>
                );
              }
              return <p key={trimmed}>{inline(trimmed)}</p>;
            })}
          </div>
          {"predict" in beat && beat.predict && prediction ? (
            <fieldset className="mt-3 rounded-lg bg-[#f6f1ea] p-3">
              <legend className="mb-2 text-[1rem] font-semibold">{prediction.question}</legend>
              <div className="space-y-1" role="radiogroup" aria-label={prediction.question}>
                {(Object.entries(prediction.options) as [PredictionId, string][]).map(([id, label]) => (
                  <label key={id} className="flex items-start gap-2 text-[1rem] leading-snug">
                    <input
                      type="radio"
                      name="ch01-prediction"
                      value={id}
                      checked={predictionChoice === id}
                      onChange={() => onPredict(id)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {showReveal && prediction ? (
            <p className="mt-4 border-l-[3px] border-[#2f7d4f] bg-[#f2f7f2] px-4 py-3 text-[1rem] leading-relaxed">
              {predictionChoice
                ? predictionChoice === prediction.answer
                  ? "You predicted it. "
                  : "You predicted something else, and that's the point of looking. "
                : null}
              {prediction.reveal}
            </p>
          ) : null}
        </>
      ) : null}
      <div className="mt-auto flex gap-2 pt-4">
        <button
          type="button"
          className="rounded-lg border border-[#e6ddd2] bg-white px-4 py-2.5 text-[0.95rem] disabled:opacity-40"
          onClick={onBack}
          disabled={backDisabled}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-lg bg-[#b4532a] px-4 py-2.5 text-[0.95rem] font-semibold text-white"
          onClick={onNext}
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
