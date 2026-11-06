"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  addBookNote,
  bookNotesServerSnapshot,
  bookNotesSnapshot,
  deleteBookNote,
  parseBookNotes,
  subscribeBookNotes,
  type BookNote,
} from "@/lib/book/notes";

const HIGHLIGHT = "baodium-notes";

function useBookNotes() {
  const raw = useSyncExternalStore(subscribeBookNotes, bookNotesSnapshot, bookNotesServerSnapshot);
  return useMemo(() => parseBookNotes(raw), [raw]);
}

function rangeForQuote(root: HTMLElement, quote: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let full = "";
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest("pre, code, script, style, button")) continue;
    nodes.push(node);
    full += node.data;
  }
  const start = full.indexOf(quote);
  if (start < 0) return null;
  const end = start + quote.length;
  let offset = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  for (const node of nodes) {
    const next = offset + node.data.length;
    if (!startNode && start < next) {
      startNode = node;
      startOffset = start - offset;
    }
    if (startNode && end <= next) {
      endNode = node;
      endOffset = end - offset;
      break;
    }
    offset = next;
  }
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function paintNotes(slug: string, notes: BookNote[]) {
  const root = document.querySelector<HTMLElement>(".book-prose");
  const api = CSS.highlights;
  if (!root || !api || typeof Highlight === "undefined") return;
  const ranges = notes
    .filter((note) => note.slug === slug)
    .map((note) => rangeForQuote(root, note.quote))
    .filter((range): range is Range => range !== null);
  if (ranges.length === 0) api.delete(HIGHLIGHT);
  else api.set(HIGHLIGHT, new Highlight(...ranges));
}

export function BookPassageNotes({ slug }: { slug: string }) {
  const notes = useBookNotes();
  const [draft, setDraft] = useState<{ quote: string; top: number; left: number } | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const id = "baodium-note-highlight";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = "::highlight(baodium-notes){background-color:rgba(184,132,58,.38);color:inherit}";
      document.head.appendChild(style);
    }
    paintNotes(slug, notes);
    return () => {
      CSS.highlights?.delete(HIGHLIGHT);
    };
  }, [notes, slug]);

  useEffect(() => {
    const onPointerUp = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-note-form]")) return;
      window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const quote = range.toString().replace(/\s+/g, " ").trim();
        if (quote.length < 2 || quote.length > 2000) return;
        const node = range.commonAncestorContainer;
        const element = node instanceof Element ? node : node.parentElement;
        if (!element?.closest(".book-prose") || element.closest("pre, code, button, a, input, textarea")) return;
        const rect = range.getBoundingClientRect();
        setText("");
        setDraft({
          quote,
          top: Math.min(rect.bottom + 8, window.innerHeight - 180),
          left: Math.min(Math.max(12, rect.left), window.innerWidth - 280),
        });
      }, 0);
    };
    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, []);

  const save = () => {
    if (!draft) return;
    addBookNote({ slug, quote: draft.quote, note: text });
    window.getSelection()?.removeAllRanges();
    setDraft(null);
  };

  if (!draft) return null;

  return (
    <form
      data-note-form=""
      className="fixed z-[80] w-[min(16.5rem,calc(100vw-1.5rem))] rounded-2xl border border-[color-mix(in_srgb,var(--reader-fg)_12%,transparent)] bg-[var(--reader-page)] p-3 text-[var(--reader-fg)] shadow-[0_18px_40px_-24px_rgba(20,16,12,0.55)]"
      style={{ top: draft.top, left: draft.left }}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
        Save on this device
      </p>
      <p className="mt-2 line-clamp-3 font-serif text-sm italic leading-snug">{draft.quote}</p>
      <label className="mt-2 block text-sm">
        <span className="sr-only">Note</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="Add a note"
          className="w-full resize-none rounded-xl border border-[color-mix(in_srgb,var(--reader-fg)_14%,transparent)] bg-transparent px-2.5 py-2 text-sm outline-none"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <button type="submit" className="rounded-full bg-[#241c18] px-3 py-1.5 text-sm text-[#f6f0e8]">
          Save note
        </button>
        <button type="button" className="rounded-full px-3 py-1.5 text-sm text-[var(--reader-muted)]" onClick={() => setDraft(null)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function BookNotesList({ slug }: { slug: string }) {
  const notes = useBookNotes().filter((note) => note.slug === slug);

  const show = (note: BookNote) => {
    const root = document.querySelector<HTMLElement>(".book-prose");
    const range = root ? rangeForQuote(root, note.quote) : null;
    const node = range?.startContainer instanceof Element ? range.startContainer : range?.startContainer.parentElement;
    node?.scrollIntoView({ block: "center" });
  };

  return (
    <div className="border-t border-[color-mix(in_srgb,var(--reader-fg)_10%,transparent)] px-3 py-3">
      <p className="px-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--reader-muted)]">
        Notes on this device
      </p>
      {notes.length === 0 ? (
        <p className="mt-2 px-1 text-[0.75rem] leading-relaxed text-[var(--reader-muted)]">
          Select a passage, then save a note. It stays in this browser.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-[color-mix(in_srgb,var(--reader-fg)_5%,transparent)] px-2 py-1.5">
              <button type="button" className="block w-full text-left" onClick={() => show(note)}>
                <span className="line-clamp-2 font-serif text-[0.78rem] italic leading-snug">{note.quote}</span>
                {note.note ? <span className="mt-1 block text-[0.72rem] leading-snug text-[var(--reader-muted)]">{note.note}</span> : null}
              </button>
              <button type="button" className="mt-1 text-[0.68rem] text-cinnabar" onClick={() => deleteBookNote(note.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
