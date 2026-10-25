import fs from "node:fs";
import path from "node:path";
import type { BookChapter, BookManifest } from "@/lib/book/types";

const MANIFEST_PATH = path.join(process.cwd(), "src/generated/book/manifest.json");
const CHAPTER_DIR = path.join(process.cwd(), "src/generated/book");

export function getManifest(): BookManifest | null {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as BookManifest;
}

export function getChapter(slug: string): BookChapter | null {
  const file = path.join(CHAPTER_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const manifest = getManifest();
  const meta = manifest?.chapters.find((c) => c.slug === slug);
  if (!meta) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { html: string };
  return { ...meta, html: data.html };
}

export function getAllSlugs(): string[] {
  const manifest = getManifest();
  return manifest?.chapters.map((c) => c.slug) ?? [];
}
