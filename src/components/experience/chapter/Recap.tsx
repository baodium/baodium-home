import chapter from "../../../../content/experience/ch01/chapter.json";

export function Recap({ onOperate, onLiveLab }: { onOperate: () => void; onLiveLab: () => void }) {
  return (
    <section className="mt-3 rounded-xl border border-[#e6ddd2] bg-[#fffdf9] p-4 text-[#241c18]">
      <h2 className="text-base">What you carry forward</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        {chapter.takeaways.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-[#6f625a]">
        Next, Chapter {chapter.next_teaser.chapter}: {chapter.next_teaser.text}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-[#e6ddd2] px-3 py-2 text-sm" onClick={onOperate}>
          Operate this incident
        </button>
        <button type="button" className="rounded-lg border border-[#e6ddd2] px-3 py-2 text-sm" onClick={onLiveLab}>
          Live lab
        </button>
      </div>
    </section>
  );
}
