export function Mark({ index, title, id }: { index: string; title: string; id: string }) {
  return (
    <div className="flex items-end gap-4 md:gap-6">
      <span className="font-serif text-[3.4rem] leading-none tracking-[-0.04em] text-cinnabar md:text-[4.5rem]" aria-hidden="true">
        {index}
      </span>
      <h2 id={id} className="pb-1.5 font-sans text-[0.72rem] font-medium uppercase tracking-[0.22em]">
        {title}
      </h2>
    </div>
  );
}
