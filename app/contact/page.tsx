import type { Metadata } from "next";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = { title: "Contact & Hotlines" };

export default function Page() {
  return (
    <SectionPage
      section="contact"
      title="Contact & Hotlines"
      intro="Hotlines and contact channels published by DMW."
    />
  );
}
