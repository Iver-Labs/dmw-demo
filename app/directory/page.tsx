import type { Metadata } from "next";
import { SectionPage } from "@/components/site/SectionPage";

export const metadata: Metadata = { title: "Office Directory" };

export default function Page() {
  return (
    <SectionPage
      section="directory"
      title="Office Directory"
      intro="DMW central, regional and Migrant Workers Office contacts."
    />
  );
}
