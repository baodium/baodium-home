import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LabsShell } from "@/components/labs/LabsShell";
import { ProductShowcase } from "@/components/labs/ProductShowcase";
import { SRE_LESSONS } from "@/lib/sre/catalog";
import "@/components/labs/labs-hub.css";

export const metadata: Metadata = {
  title: "Labs",
  description:
    "Practice production engineering on three working products: a pantry shop, a film streaming service, and a neighborhood network, each with logs, traces, code, and releases.",
  alternates: { canonical: "https://labs.baodium.com/" },
};

const MORE = [
  {
    href: "/sre-labs",
    title: "Guided lessons",
    body: `${SRE_LESSONS.length} short browser lessons, each on one reliability idea, from instrumenting a slow request to writing an alert and taking back a bad release.`,
    action: "Browse the lessons",
  },
  {
    href: "/sre-labs/coding",
    title: "Coding exercises",
    body: "Functions for fleet health, retries, rate limits, and delivery, written in Go, TypeScript, or Python and checked in the browser.",
    action: "Open coding practice",
  },
  {
    href: "/sre-labs/observability/setup",
    title: "The payments stack",
    body: "Express and FastAPI services with Prometheus, Grafana, and Jaeger, running in Codespaces or on your own machine with Docker. You query real signals, inject faults, and confirm recovery.",
    action: "Set up the stack",
  },
  {
    href: "/system-design/experience",
    title: "Labs from the book",
    body: "The recommendation pool and the charge that may have been sent twice, following the chapters of the book.",
    action: "Open the chapter labs",
  },
];

export default function LabsPage() {
  return (
    <LabsShell>
      <section className="hub-hero">
        <p className="labs-kicker">Baodium Labs</p>
        <h1>Practice production engineering on three working products.</h1>
        <p className="hub-intro">
          Larder sells pantry goods, Northlight streams films, and Porch is a neighborhood network in Chicago. Each one runs in your browser with its own logs, traces, metrics, code, and release
          history, and each has an incident open. You use the product until you see the problem, find the cause, ship a fix, and confirm the recovery in the product and in the numbers.
        </p>
      </section>

      <section className="hub-section" aria-labelledby="products-title">
        <h2 id="products-title" className="hub-section-title">
          Products
        </h2>
        <ProductShowcase />
      </section>

      <section className="hub-section" aria-labelledby="more-title">
        <h2 id="more-title" className="hub-section-title">
          More practice
        </h2>
        <ul className="hub-more">
          {MORE.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span>
                  {item.action} <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </LabsShell>
  );
}
