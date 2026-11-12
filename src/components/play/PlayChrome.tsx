import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { SitePill } from "@/components/Navigation";
export function PlayChrome({
  children,
}: {
  children: ReactNode;
  crumb?: { label: string; href?: string };
}) {
  return (
    <>
      <SitePill />
      <main
        id="main"
        className="bg-[#f4f7fa] pb-16 pt-28 text-ink md:pb-24"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
