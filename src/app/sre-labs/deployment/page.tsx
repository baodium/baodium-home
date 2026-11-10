import type { Metadata } from "next";
import { SreChrome } from "@/components/sre/SreChrome";
import { OperationsLab } from "@/components/sre/OperationsLab";
export const metadata: Metadata = {
  title: "Canary deployment lab",
  description:
    "Control release exposure, observe customer failures and recover a seeded canary deployment experiment.",
  alternates: { canonical: "/sre-labs/deployment" },
};
export default function DeploymentPage() {
  return (
    <SreChrome showSections={false}>
      <OperationsLab kind="deployment" />
    </SreChrome>
  );
}
