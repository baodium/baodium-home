import { useRef, type ReactNode } from "react";
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
        <em key={index} className="text-[#3e342c]">
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
  onJump,
  index,
  total,
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
  onJump: (index: number) => void;
  index: number;
  total: number;
  backDisabled: boolean;
  nextLabel: string;
}) {
  const startX = useRef<number | null>(null);
  return (
    <section className="book-story lesson-steps" aria-label="Lesson">
      <div
        className="lesson-step"
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current == null) return;
          const delta = event.clientX - startX.current;
          startX.current = null;
          if (delta <= -56) onNext();
          if (delta >= 56 && !backDisabled) onBack();
        }}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
      {beat ? (
        <>
          <p className="lesson-step-count">{index + 1} of {total}</p>
          <p className="book-story-label">{beat.label}</p>
          <h2 className="lab-title">{beat.title}</h2>
          <div className="book-story-body">
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
      </div>
      <div className="lesson-step-nav">
        <div className="lesson-step-dots" role="tablist" aria-label="Lesson">
          {Array.from({ length: total }, (_, itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              role="tab"
              aria-selected={itemIndex === index}
              aria-label={`Step ${itemIndex + 1}`}
              onClick={() => onJump(itemIndex)}
            />
          ))}
        </div>
        <button type="button" onClick={onBack} disabled={backDisabled}>
          Back
        </button>
        <button type="button" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
