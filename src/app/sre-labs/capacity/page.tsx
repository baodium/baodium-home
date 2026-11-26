import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { OperationsLab } from "@/components/sre/OperationsLab";
export const metadata: Metadata = {
  title: "Origin misses fill the edge queue",
  description:
    "Operate an edge POP through an origin surge using worker replicas and a utilization-based autoscaler.",
  alternates: { canonical: "/sre-labs/capacity" },
};
export default function CapacityPage() {
  return (
    <SreChrome showSections={false}>
      <OperationsLab kind="capacity" />
    </SreChrome>
  );
}
