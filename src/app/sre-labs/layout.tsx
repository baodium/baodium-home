import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  metadataBase: new URL("https://labs.baodium.com"),
};
export default function SreLayout({ children }: { children: ReactNode }) {
  return children;
}
