import type { Metadata } from "next";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = { title: "Guides" };

export default function Page() {
  return (
    <SectionPage
      section="guides"
      title="Guides"
      intro="Pre-employment orientation for first-time OFWs: what to check before you sign, fees, your contract and coming home."
    />
  );
}
