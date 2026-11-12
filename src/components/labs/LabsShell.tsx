import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
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
      <SiteHeader />
      <main id="main" className={wide ? "labs-main labs-wide" : "labs-main"}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
