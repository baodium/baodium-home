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
    <section className="flex min-h-[28rem] flex-col rounded-xl border border-[#e6ddd2] bg-[#fffdf9] p-5 text-[#241c18]" aria-live="polite">
      {beat ? (
        <>
          <p className="text-[0.8rem] text-[#6f625a]">{beat.label}</p>
          <h2 className="mt-1 text-xl leading-snug">{beat.title}</h2>
          <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed">
            {beat.body_md.split("\n\n").map((paragraph) => {
              const trimmed = paragraph.trim();
              if (trimmed.startsWith("[button:")) {
                return (
                  <button
                    key={trimmed}
                    type="button"
                    className="rounded-lg bg-[#b4532a] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    onClick={onFlagOff}
                    disabled={flagOff}
                  >
                    {flagOff ? "Flag is off: watch the instances" : "Turn personalization off"}
                  </button>
                );
              }
              if (trimmed.includes("Operate this incident")) {
                return (
                  <p key={trimmed} className="flex flex-wrap gap-3">
                    <button type="button" className="underline" onClick={onOperate}>
                      Operate this incident yourself
                    </button>
                    <button type="button" className="underline" onClick={onLiveLab}>
                      Open the live lab
                    </button>
                  </p>
                );
              }
              return <p key={trimmed}>{inline(trimmed)}</p>;
            })}
          </div>
          {"predict" in beat && beat.predict && prediction ? (
            <fieldset className="mt-3 rounded-lg bg-[#f6f1ea] p-3">
              <legend className="mb-1 text-sm font-semibold">{prediction.question}</legend>
              <div className="space-y-1" role="radiogroup" aria-label={prediction.question}>
                {(Object.entries(prediction.options) as [PredictionId, string][]).map(([id, label]) => (
                  <label key={id} className="flex items-start gap-2 text-sm">
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
            <p className="mt-3 border-l-[3px] border-[#2f7d4f] bg-[#f2f7f2] px-3 py-2 text-sm">
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
          className="rounded-lg border border-[#e6ddd2] bg-white px-3.5 py-2 text-sm disabled:opacity-40"
          onClick={onBack}
          disabled={backDisabled}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-lg bg-[#b4532a] px-3.5 py-2 text-sm font-semibold text-white"
          onClick={onNext}
        >
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
