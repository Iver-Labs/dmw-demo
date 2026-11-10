import type { Metadata } from "next";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = { title: "Frequently Asked Questions" };

export default function Page() {
  return (
    <SectionPage
      section="faq"
      title="Frequently Asked Questions"
      intro="Answers to common questions from DMW's published FAQs."
    />
  );
}
