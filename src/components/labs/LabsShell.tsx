import type { ReactNode } from "react";
import { SitePill } from "@/components/Navigation";
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
    <div className="labs-root pt-[5.5rem]">
      <SitePill />
      <main id="main" className={wide ? "labs-main labs-wide" : "labs-main"}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
