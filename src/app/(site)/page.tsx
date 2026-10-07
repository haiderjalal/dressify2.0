import type { Metadata } from "next";
import { Bike, Camera, CalendarCheck, MessageCircle, Ruler, Search, Shirt, ShieldCheck, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getFeaturedTailors, getWomenLedTailors } from "@/server/modules/tailors/queries";
import { TailorCard } from "@/components/site/tailor-card";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: "Dressify — Bespoke tailoring, delivered" },
  description: "Find skilled tailors and women-led home ateliers near you. Choose a design, share your measurements and get your outfit delivered.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const i18n = await getI18n();
  const { t } = i18n;
  const [featured, women] = await Promise.all([getFeaturedTailors(), getWomenLedTailors()]);

  const steps = [
    { icon: Search, title: t("home.step1Title"), body: t("home.step1Body") },
    { icon: Shirt, title: t("home.step2Title"), body: t("home.step2Body") },
    { icon: Ruler, title: t("home.step3Title"), body: t("home.step3Body") },
    { icon: Bike, title: t("home.step4Title"), body: t("home.step4Body") },
  ];
  const trust = [
    { icon: ShieldCheck, title: t("home.trust1Title"), body: t("home.trust1Body") },
    { icon: Bike, title: t("home.trust2Title"), body: t("home.trust2Body") },
    { icon: MessageCircle, title: t("home.trust3Title"), body: t("home.trust3Body") },
    { icon: CalendarCheck, title: t("home.trust4Title"), body: t("home.trust4Body") },
  ];

  return (
    <>
      <section className="home-hero linen border-b border-line">
        <div className="container-x home-hero-grid py-12 sm:py-20 lg:py-24">
          <div>
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] font-medium tracking-tight sm:text-6xl lg:text-7xl">{t("home.title")}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{t("home.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/explore" size="lg">
              <Search /> {t("home.ctaExplore")}
            </LinkButton>
            <LinkButton href="/join/tailor" size="lg" variant="outline">
              {t("home.ctaTailor")}
            </LinkButton>
          </div>
          </div>
          <div className="hero-art">
            <img src="/atelier-workbench.svg" width="640" height="650" alt="" aria-hidden="true" />
            <p className="hero-art-caption">{t("common.tagline")}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="container-x grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-deep">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="container-x scroll-mt-20 py-16 sm:py-20">
        <h2 className="max-w-xl font-display text-3xl font-medium tracking-tight sm:text-4xl">{t("home.stepsTitle")}</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
              <span className="grid size-11 place-items-center rounded-full bg-ink text-paper">
                <Icon className="size-5" />
              </span>
              <p className="mt-5 text-xs font-semibold tracking-widest text-gold">0{i + 1}</p>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {featured.length > 0 && (
        <section className="border-y border-line bg-sand/40">
          <div className="container-x py-16 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{t("home.featuredTitle")}</h2>
                <p className="mt-2 text-muted">{t("home.featuredSubtitle")}</p>
              </div>
              <LinkButton href="/explore" variant="outline" size="sm">
                {t("common.viewAll")}
              </LinkButton>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((tl, i) => (
                <TailorCard key={tl.slug} t={i18n} tailor={tl} priority={i < 3} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-x py-16 sm:py-20">
        <div className="grid items-center gap-8 rounded-3xl bg-ink p-8 text-paper sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">{t("tryon.title")}</p>
            <h2 className="mt-3 font-display text-3xl font-medium sm:text-4xl">{t("home.tryOnTitle")}</h2>
            <p className="mt-4 max-w-xl text-paper/75">{t("home.tryOnBody")}</p>
            <LinkButton href="/try-on" variant="gold" size="lg" className="mt-6">
              <Camera /> {t("home.tryOnCta")}
            </LinkButton>
          </div>
          <div className="hidden justify-center lg:flex">
            <span className="grid size-40 place-items-center rounded-full bg-paper/10">
              <Sparkles className="size-16 text-gold" />
            </span>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-emerald-soft/60">
        <div className="container-x py-16 sm:py-20">
          <p className="eyebrow">{t("home.womenEyebrow")}</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-medium tracking-tight sm:text-4xl">{t("home.womenTitle")}</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{t("home.womenBody")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/explore?women=1" variant="emerald">
              {t("home.womenCta")}
            </LinkButton>
            <LinkButton href="/join/tailor" variant="outline">
              {t("home.womenJoin")}
            </LinkButton>
          </div>
          {women.length > 0 && (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {women.map((tl) => (
                <TailorCard key={tl.slug} t={i18n} tailor={tl} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
