import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { OperationsLab } from "@/components/sre/OperationsLab";
export const metadata: Metadata = {
  title: "The queue fills and latency climbs",
  description:
    "Operate a bounded queue through a traffic surge using worker replicas and a utilization-based autoscaler.",
  alternates: { canonical: "/sre-labs/capacity" },
};
export default function CapacityPage() {
  return (
    <SreChrome showSections={false}>
      <OperationsLab kind="capacity" />
    </SreChrome>
  );
}
