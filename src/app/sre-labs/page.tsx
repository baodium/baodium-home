import type { Metadata } from "next";
import Link from "next/link";
import { SreChrome } from "@/components/sre/SreChrome";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "SRE Lab",
  description:
    "Diagnose a cascading checkout failure, then instrument a smaller checkout, spend its error budget, and build a burn-rate alert.",
  alternates: { canonical: `${site.url}/sre-labs` },
};

const labs = [
  {
    href: "/sre-labs/instrument",
    title: "Instrument a service",
    body: "Add HTTP metrics, an outbound span, trace context, and a structured log. Then put latency on the payment call and read it back from the trace.",
  },
  {
    href: "/sre-labs/slo",
    title: "Spend an error budget",
    body: "Choose the checkout journey, what counts as good, and a 99.5% target. Traffic and failures move the budget. 98.3% does not meet 99.5%.",
  },
  {
    href: "/sre-labs/alert",
    title: "Page on the customer",
    body: "A CPU alert pages on a busy host and stays quiet through checkout timeouts. A burn-rate alert pages only when the failure lasts, and it refuses to invent a healthy hour when the metrics stop.",
  },
];

export default function SreLabsPage() {
  return (
    <SreChrome>
      <p className="exp-kicker">SRE Lab</p>
      <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-[color:var(--exp-fg)] sm:text-5xl">
        Operate checkout
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--exp-muted)]">
        The laboratory is a gateway, checkout, payment, and an external provider on one clock. Provider work, retries, and the mitigations change the same checkouts you see in the graph, the chart, the trace, and the log.
      </p>
      <Link href="/sre-labs/cascade" className="exp-panel mt-6 block transition-colors hover:border-[color:var(--exp-line-strong)]">
        <p className="font-mono text-[0.72rem] text-[color:var(--exp-faint)]">Laboratory</p>
        <h2 className="mt-2 font-serif text-3xl text-[color:var(--exp-fg)]">Diagnose a cascading checkout failure</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
          Guided walks a healthy checkout into the failure and back out. Practice asks you to cause it and repair it. Challenge opens on the failing checkout.
        </p>
      </Link>
      <h2 className="mt-10 font-serif text-2xl text-[color:var(--exp-fg)]">Signals on a smaller checkout</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
        These three stay on a checkout that calls payment. They teach instrumentation, the error budget, and which alert deserves a page.
      </p>
      <ol className="mt-8 grid gap-4 lg:grid-cols-3">
        {labs.map((lab, index) => (
          <li key={lab.href}>
            <Link href={lab.href} className="exp-panel flex h-full flex-col transition-colors hover:border-[color:var(--exp-line-strong)]">
              <p className="font-mono text-[0.72rem] text-[color:var(--exp-faint)]">0{index + 1}</p>
              <h2 className="mt-2 font-serif text-2xl text-[color:var(--exp-fg)]">{lab.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--exp-muted)]">{lab.body}</p>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[color:var(--exp-muted)]">
        Guided walks the checkout once. Practice asks you to set the signals yourself. Challenge hides the cause. The book labs stay with the chapters, and the drills stay on their own page.
      </p>
    </SreChrome>
  );
}
