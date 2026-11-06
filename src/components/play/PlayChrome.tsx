import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
export function PlayChrome({
  children,
}: {
  children: ReactNode;
  crumb?: { label: string; href?: string };
}) {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="bg-[#f4f7fa] pb-16 pt-10 text-ink md:pb-24 md:pt-14"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
