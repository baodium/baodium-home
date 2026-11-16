import Link from "next/link";
import chapter from "../../../../content/experience/ch01/chapter.json";
import { LessonClose } from "@/components/learning/LessonCraft";

export function Recap({ onOperate, onLiveLab }: { onOperate: () => void; onLiveLab: () => void }) {
  return (
    <section className="mt-4 rounded-2xl border border-[#e6ddd2] bg-[#fffdf9] p-6 text-[#241c18] sm:p-7">
      <LessonClose
        takeaways={chapter.takeaways}
        reflection={[
          "Where did the wait show up, and where did the SQL stay fast?",
          "What did a small share of customers fail to tell you about the pool of 40?",
          "What has to be true before an optional recommendation is allowed to slow the page?",
        ]}
        next={{
          href: "/system-design/experience/chapter-3",
          label: "Chapter 3 lab",
          bridge: `Chapter ${chapter.next_teaser.chapter} stays in the book: ${chapter.next_teaser.text} The next lab you can run is chapter 3. A customer gives up before the card provider answers, and a second try can take the money again.`,
        }}
      />
      <p className="mt-4 text-[1rem] leading-relaxed text-[#6f625a]">
        <Link href="/system-design/chapter-2">Read chapter 2 in the book</Link>
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
