export type BookNote = {
  id: string;
  slug: string;
  quote: string;
  note: string;
  createdAt: number;
};

const KEY = "baodium:book:notes";
const listeners = new Set<() => void>();

export function subscribeBookNotes(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function bookNotesSnapshot() {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function bookNotesServerSnapshot() {
  return null;
}

export function parseBookNotes(raw: string | null): BookNote[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BookNote =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.slug === "string" &&
        typeof item.quote === "string" &&
        typeof item.note === "string",
    );
  } catch {
    return [];
  }
}

function publish(notes: BookNote[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

export function addBookNote(input: { slug: string; quote: string; note: string }) {
  const notes = parseBookNotes(bookNotesSnapshot());
  const next: BookNote = {
    id: crypto.randomUUID(),
    slug: input.slug,
    quote: input.quote,
    note: input.note.trim(),
    createdAt: Date.now(),
  };
  publish([next, ...notes].slice(0, 80));
  return next;
}

export function deleteBookNote(id: string) {
  const notes = parseBookNotes(bookNotesSnapshot()).filter((note) => note.id !== id);
  publish(notes);
}
