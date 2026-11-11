import Link from "next/link";
import type { ReactNode } from "react";
import "./labs.css";
export function LabsShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="labs-root">
      <header className="labs-header">
        <Link href="/labs" className="labs-brand">
          <span aria-hidden="true">[→]</span> BAODIUM <strong>LABS</strong>
        </Link>
        <nav aria-label="Labs navigation">
          <Link href="/labs">Learning paths</Link>
          <Link href="/sre-labs">SRE labs</Link>
          <Link href="/sre-labs/coding">Coding practice</Link>
        </nav>
        <a className="labs-main-site" href="https://baodium.com">
          Baodium.com ↗
        </a>
      </header>
      <main id="main" className={wide ? "labs-main labs-wide" : "labs-main"}>
        {children}
      </main>
      <footer className="labs-footer">
        <span>Build. Break. Understand. Repeat.</span>
        <span>Baodium Labs · Practical engineering</span>
      </footer>
    </div>
  );
}
