"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { book, writing } from "@/data/writing";
import { usePrefersReducedMotion } from "@/lib/motion-prefs";

/** Clear product nav: Home / Book / Labs / Drills / Projects / About */
const links = [
  { id: "home", label: "Home", href: "/" },
  { id: "book", label: "Book", href: "/system-design" },
  { id: "labs", label: "Labs", href: "/system-design/experience" },
  { id: "play", label: "Drills", href: "/play" },
  { id: "projects", label: "Projects", href: "/projects" },
  ...(writing.length > 0 ? [{ id: "writing", label: "Writing", href: "/#writing" }] : []),
  { id: "about", label: "About", href: "/about" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Navigation() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onProjects = pathname === "/projects";
  const onAbout = pathname === "/about";
  const onPlay = pathname === "/play" || pathname.startsWith("/play/");
  const onLabs =
    pathname === "/system-design/experience" ||
    pathname.startsWith("/system-design/experience/");
  const onBook =
    pathname === "/system-design" ||
    (pathname.startsWith("/system-design/") && !onLabs);
  const reduce = usePrefersReducedMotion();
  const [sectionActive, setSectionActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [entered, setEntered] = useState(false);
  const active = onAbout
    ? "about"
    : onProjects
      ? "projects"
      : onLabs
        ? "labs"
        : onPlay
          ? "play"
          : onBook
            ? "book"
            : onHome
              ? sectionActive ?? "home"
              : sectionActive;

  /** The bar steps out of the way while reading downward and returns on any upward scroll. */
  useEffect(() => {
    if (reduce) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      if (Math.abs(delta) < 6) return;
      setTucked(delta > 0 && y > window.innerHeight * 0.6);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduce]);

  const barHidden = !reduce && tucked && !open;

  useEffect(() => {
    if (!onHome) return;

    const sectionIds = ["book", "play", "projects"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setSectionActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.5) setSectionActive(null);
    };

    sections.forEach((section) => observer.observe(section));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [onHome]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const coolChrome = onProjects || onAbout || onPlay || onLabs || onBook;

  return (
    <motion.header
      id="top"
      initial={reduce ? false : { y: -24, opacity: 0 }}
      animate={barHidden ? { y: -96, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={
        reduce
          ? { duration: 0 }
          : entered
            ? { duration: 0.45, ease }
            : {
                duration: 0.9,
                delay: coolChrome ? 0.15 : 1.4,
                ease,
              }
      }
      onAnimationComplete={() => setEntered(true)}
      className="fixed inset-x-0 top-3 z-50 px-3 md:top-5"
    >
      <div
        className={`mx-auto flex max-w-[62rem] items-center justify-between gap-2 rounded-full border border-white/[0.09] p-1.5 pl-4 shadow-[0_12px_40px_-14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl ${
          coolChrome ? "bg-[#1a2330]/[0.92]" : "bg-[#2a211c]/[0.92]"
        }`}
      >
        <Link
          href="/"
          className="group inline-flex min-h-10 items-center gap-2.5 font-mono text-[0.72rem] tracking-[0.28em] text-cream"
          aria-label="Baodium, back to home"
        >
          <span aria-hidden="true" className="relative h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-[3px] bg-cinnabar transition-transform duration-500 group-hover:rotate-45" />
          </span>
          BAODIUM
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center text-[0.84rem] text-cream/65">
            {links.map((link) => (
              <li key={link.id} className="relative">
                {active === link.id ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-white/[0.09]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <Link
                  href={link.href}
                  aria-current={active === link.id ? "page" : undefined}
                  className="relative inline-flex min-h-10 items-center px-3 transition-colors hover:text-cream aria-[current]:text-cream xl:px-3.5"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={book.readPath}
            className="group inline-flex min-h-10 max-w-[11.5rem] items-center gap-1.5 rounded-full bg-cream px-3.5 text-[0.72rem] font-medium leading-tight text-ink transition-colors hover:bg-white sm:max-w-none sm:px-4 sm:text-[0.82rem] sm:leading-none"
          >
            Read the book for free
            <ArrowUpRight
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] lg:hidden"
          >
            <span
              aria-hidden="true"
              className={`absolute h-px w-4 bg-cream transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[3px]"}`}
            />
            <span
              aria-hidden="true"
              className={`absolute h-px w-4 bg-cream transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[3px]"}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            id="mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.35, ease }}
            className={`mx-auto mt-2 max-w-[62rem] overflow-hidden rounded-[1.75rem] border border-white/10 p-3 backdrop-blur-xl lg:hidden ${
              coolChrome ? "bg-[#1a2330]/[0.96]" : "bg-[#2a211c]/[0.96]"
            }`}
          >
            <ul>
              {links.map((link, index) => (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.05, duration: 0.4, ease }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-14 items-center justify-between rounded-2xl px-4 text-2xl tracking-[-0.02em] text-cream active:bg-white/5"
                  >
                    {link.label}
                    <span className="font-mono text-xs text-cream/55">0{index + 1}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
