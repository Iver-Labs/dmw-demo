import type { Metadata } from "next";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = { title: "OEC & Balik-Manggagawa" };

export default function Page() {
  return (
    <SectionPage
      section="oec-bm"
      title="OEC & Balik-Manggagawa"
      intro="How returning workers get an Overseas Employment Certificate or an exemption."
    />
  );
}
