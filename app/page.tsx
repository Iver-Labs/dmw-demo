import Link from "next/link";
import { AskAssistantButton } from "@/components/chat/AskAssistantButton";
import { HeroArt, Icon, NewTab } from "@/components/site/Icons";
import { JOURNEYS, OFFICIAL_SITE, QUICK_SERVICES } from "@/lib/site";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <section className="wrap pt-6 md:pt-8">
        <div className="on-dark grid items-center gap-6 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,var(--color-masthead-2)_0%,var(--color-masthead)_70%)] px-6 py-8 text-white md:grid-cols-[1fr_auto] md:px-10 md:py-10">
          <div>
            <p className="eyebrow flex items-center gap-3 text-white">
              <span className="h-5 w-1 rounded bg-accent" aria-hidden="true" />
              Information for every OFW
            </p>
            <h1 className="mt-4 text-3xl leading-tight font-bold md:text-5xl">
              Your next chapter, <br className="hidden sm:inline" />
              with clearer guidance.
            </h1>
            <p className="mt-3 max-w-xl text-white/85 md:text-lg">
              Find DMW information on OEC, Balik-Manggagawa and offices, or ask the assistant in English,
              Filipino or Taglish.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#services" className="btn-primary pe-[18px]">
                Explore services
                <Icon name="arrow" className="size-5" />
              </a>
              <AskAssistantButton className="btn-on-dark" />
            </div>
          </div>
          <HeroArt className="hidden w-[300px] md:block" />
        </div>
      </section>

      <section className="wrap pt-10" aria-labelledby="journey-h">
        <p className="eyebrow">Your journey</p>
        <h2 id="journey-h" className="mt-1 text-2xl font-bold text-ink md:text-3xl">
          How can we help you today?
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEYS.map((j) => (
            <li key={j.href}>
              <Link href={j.href} className="group card flex h-full gap-3.5 p-5 hover:shadow-card-hover">
                <Icon name={j.icon} className="mt-0.5 size-6 shrink-0 text-action" />
                <span>
                  <span className="block text-lg font-bold text-ink group-hover:text-action">{j.title}</span>
                  <span className="mt-1 block text-sm text-muted">{j.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="services" className="wrap scroll-mt-4 pt-10" aria-labelledby="services-h">
        <h2 id="services-h" className="text-2xl font-bold text-ink md:text-3xl">
          Quick Access Services
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_SERVICES.map((s) => (
            <li key={s.title} className="card flex flex-col p-5">
              <div className="flex items-center gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface text-action">
                  <Icon name={s.icon} className="size-5" />
                </span>
                <h3 className="text-lg font-bold text-ink">{s.title}</h3>
              </div>
              <p className="mt-3 flex-1 text-muted">{s.body}</p>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-action hover:underline"
              >
                <span className="sr-only">{s.title}: </span>
                Open official service
                <Icon name="external" className="size-4" />
                <NewTab />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap py-10 md:pb-14">
        <div className="rounded-xl bg-wash p-6">
          <p className="eyebrow flex items-center gap-2.5">
            <Icon name="doc" className="size-5" />
            Official announcements
          </p>
          <p className="mt-2 font-bold text-ink">Read the latest DMW advisories before making plans.</p>
          <a
            href={OFFICIAL_SITE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm text-action hover:underline"
          >
            View announcements at dmw.gov.ph
            <Icon name="external" weight="regular" className="size-4" />
            <NewTab />
          </a>
        </div>
      </section>
    </main>
  );
}
