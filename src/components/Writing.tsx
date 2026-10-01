"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/Reveal";
import { book, writing } from "@/data/writing";

const ease = [0.22, 1, 0.36, 1] as const;

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Entry = {
  key: string;
  kind: string;
  title: string;
  detail: string;
  href?: string;
  action: ReactNode;
  preview?: boolean;
};

function Row({ entry, index, onPreview }: { entry: Entry; index: number; onPreview: (on: boolean) => void }) {
  const external = entry.href?.startsWith("http");
  const body = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-gradient-to-r from-cinnabar/[0.16] via-cinnabar/[0.05] to-transparent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
      />
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b from-amber to-crimson transition-transform duration-500 group-hover:scale-y-100" />
      <span className="relative grid gap-x-6 gap-y-3 px-1 py-7 md:grid-cols-12 md:items-center md:px-5 md:py-9">
        <span className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.14em] text-cream/45 md:col-span-2">
          <span className="text-cinnabar">0{index + 1}</span>
          {entry.kind}
        </span>
        <span className="md:col-span-6">
          <span className="block text-[clamp(1.85rem,3.6vw,3.25rem)] font-semibold leading-[1] tracking-[-0.045em] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2">
            {entry.title}
          </span>
          <span className="mt-3 block max-w-md font-serif text-lg italic leading-snug text-cream/60 md:text-xl">
            {entry.detail}
          </span>
        </span>
        <span className="md:col-span-4 md:justify-self-end">{entry.action}</span>
      </span>
    </>
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.8, delay: index * 0.08, ease }}
      className="border-b border-white/10"
    >
      {entry.href ? (
        <a
          href={entry.href}
          onPointerEnter={(event) => entry.preview && event.pointerType === "mouse" && onPreview(true)}
          onPointerLeave={() => entry.preview && onPreview(false)}
          className="group relative block overflow-hidden"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {body}
          {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
        </a>
      ) : (
        <div className="group relative overflow-hidden">{body}</div>
      )}
    </motion.li>
  );
}

const linkAction = (label: string) => (
  <span className="inline-flex min-h-11 items-center gap-3 text-sm text-cream">
    {label}
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition-colors duration-500 group-hover:border-transparent group-hover:bg-cream group-hover:text-ink">
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} />
    </span>
  </span>
);

export function Writing() {
  const listRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 24, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 24, mass: 0.5 });
  const shown = useMotionValue(0);
  const opacity = useSpring(shown, { stiffness: 260, damping: 30 });
  const scale = useSpring(useMotionValue(0.9), { stiffness: 260, damping: 22 });

  const entries: Entry[] = [
    {
      key: "book",
      kind: "Book",
      title: book.title,
      detail: book.subtitle,
      href: book.href,
      action: linkAction("Available on Amazon"),
      preview: true,
    },
    ...(writing.length > 0
      ? writing.map((piece) => ({
          key: piece.href,
          kind: formatDate(piece.date),
          title: piece.title,
          detail: piece.description,
          href: piece.href,
          action: linkAction("Read"),
        }))
      : [
          {
            key: "essays",
            kind: "Soon",
            title: "Essays",
            detail: "Practical system design and production engineering, in shorter form.",
            action: (
              <span className="inline-flex items-center gap-2.5 rounded-full border border-amber/30 bg-amber/[0.08] px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-amber">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                Publishing here next
              </span>
            ),
          },
        ]),
  ];

  return (
    <section
      id="writing"
      aria-labelledby="writing-heading"
      className="grain relative z-10 overflow-hidden bg-night pb-28 pt-8 md:pb-40 md:pt-12"
    >
      <div className="shell relative z-[2]">
        <div aria-hidden="true" className="mb-20 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:mb-28" />
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <Reveal y={12}>
              <p className="kicker flex items-center gap-3 text-cream/55">
                <span className="text-cinnabar">(03)</span>
                <span className="h-px w-10 bg-white/20" />
                Writing
              </p>
            </Reveal>
            <SplitHeading
              id="writing-heading"
              text="Long form first. Essays next."
              accent={["next"]}
              className="mt-6 text-[clamp(2.6rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]"
            />
          </div>
          <Reveal delay={0.2} className="md:col-span-4 md:pb-2">
            <p className="max-w-sm text-lg leading-relaxed text-cream/60">
              Writing on practical system design and production engineering, starting with the book.
            </p>
          </Reveal>
        </div>

        <div
          ref={listRef}
          className="relative mt-14 md:mt-20"
          onPointerMove={(event) => {
            const rect = listRef.current?.getBoundingClientRect();
            if (!rect) return;
            x.set(event.clientX - rect.left);
            y.set(event.clientY - rect.top);
          }}
        >
          <ol className="border-t border-white/10">
            {entries.map((entry, index) => (
              <Row
                key={entry.key}
                entry={entry}
                index={index}
                onPreview={(on) => {
                  shown.set(on ? 1 : 0);
                  scale.set(on ? 1 : 0.9);
                }}
              />
            ))}
          </ol>
          <motion.div
            aria-hidden="true"
            style={{ x: sx, y: sy, opacity, scale }}
            className="pointer-events-none absolute left-0 top-0 z-10 hidden w-36 translate-x-8 -translate-y-1/2 rotate-[-6deg] md:block"
          >
            <Image
              src="/projects/practical-system-design.png"
              alt=""
              width={994}
              height={1500}
              sizes="9rem"
              className="h-auto w-full rounded-[3px] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.8),0_0_60px_-10px_rgba(236,61,32,0.6)]"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
