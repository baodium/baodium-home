import chapter from "../../../../content/experience/ch01/chapter.json";

export function Recap({ onOperate, onLiveLab }: { onOperate: () => void; onLiveLab: () => void }) {
  return (
    <section className="mt-4 rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] p-6 text-[#241c18] sm:p-7">
      <h2 className="font-serif text-[1.45rem] leading-snug">What you carry forward</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-[1.02rem] leading-relaxed">
        {chapter.takeaways.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <p className="mt-4 text-[1rem] leading-relaxed text-[#6f625a]">
        Next, Chapter {chapter.next_teaser.chapter}: {chapter.next_teaser.text}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-[#e6ddd2] px-4 py-2.5 text-[0.95rem]" onClick={onOperate}>
          Back to the pool
        </button>
        <button type="button" className="rounded-lg border border-[#e6ddd2] px-4 py-2.5 text-[0.95rem]" onClick={onLiveLab}>
          Open the same store
        </button>
      </div>
    </section>
  );
}
