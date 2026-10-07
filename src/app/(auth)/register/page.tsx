import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCurrentUser, homeFor } from "@/server/auth/session";
import { RegisterForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t }, user, sp] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  if (user) redirect(homeFor(user.role));
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-4xl font-medium tracking-tight">{t("auth.registerTitle")}</h1>
      <p className="mt-2 text-muted">{t("auth.registerSubtitle")}</p>
      <RegisterForm next={sp.next} />
      <p className="mt-6 text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href={`/login${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
          {t("common.signIn")}
        </Link>
      </p>
      <p className="mt-2 text-sm text-muted">
        {t("auth.areYouTailor")}{" "}
        <Link href="/join/tailor" className="font-medium text-gold-deep underline underline-offset-4">
          {t("auth.joinAsTailor")}
        </Link>
      </p>
    </div>
  );
}
