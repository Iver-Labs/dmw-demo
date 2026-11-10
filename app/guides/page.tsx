import type { Metadata } from "next";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = { title: "Guides" };

export default function Page() {
  return (
    <SectionPage
      section="guides"
      title="Guides"
      intro="The Pre-Employment Orientation Seminar (PEOS) modules for first-time OFWs. They date from before DMW replaced POEA, so some offices, fees and websites have changed: check current requirements at dmw.gov.ph."
    />
  );
}
