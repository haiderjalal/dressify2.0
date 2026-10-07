import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCurrentUser, homeFor } from "@/server/auth/session";
import { TailorJoinForm } from "@/components/site/tailor-join-form";

export const metadata: Metadata = { title: "Register your tailoring shop" };

export default async function JoinTailorPage({ searchParams }: { searchParams: Promise<{ women?: string }> }) {
  const [{ t }, user, sp] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  if (user) redirect(homeFor(user.role));
  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">{t("nav.forTailors")}</p>
        <h1 className="mt-4 font-display text-5xl font-medium tracking-tight">{t("tailorJoin.title")}</h1>
        <p className="mt-4 text-lg text-muted">{t("tailorJoin.subtitle")}</p>
        <ul className="mt-8 space-y-4">
          {[t("tailorJoin.benefits1"), t("tailorJoin.benefits2"), t("tailorJoin.benefits3"), t("tailorJoin.womenLedHint")].map((b) => (
            <li key={b} className="flex items-start gap-3 text-ink-soft">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald" /> {b}
            </li>
          ))}
        </ul>
      </div>
      <TailorJoinForm womenDefault={sp.women === "1"} />
    </div>
  );
}
