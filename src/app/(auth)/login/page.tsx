import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getCurrentUser, homeFor } from "@/server/auth/session";
import { LoginForm } from "@/components/site/auth-forms";
import { safeNext } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

const DEMO = [
  ["Customer", "ayesha@example.com", "Customer@123"],
  ["Tailor", "masterji@dressify.pk", "Tailor@123"],
  ["Women-led tailor", "sadia@dressify.pk", "Tailor@123"],
  ["Admin", "admin@dressify.pk", "Admin@12345"],
] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t }, user, sp] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  if (user) redirect(safeNext(sp.next, homeFor(user.role)));
  const showDemo = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "1";
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-4xl font-medium tracking-tight">{t("auth.loginTitle")}</h1>
      <p className="mt-2 text-muted">{t("auth.loginSubtitle")}</p>
      <LoginForm next={sp.next} />
      <p className="mt-6 text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
          {t("common.signUp")}
        </Link>
      </p>
      <p className="mt-2 text-sm text-muted">
        {t("auth.areYouTailor")}{" "}
        <Link href="/join/tailor" className="font-medium text-gold-deep underline underline-offset-4">
          {t("auth.joinAsTailor")}
        </Link>
      </p>
      {showDemo && (
        <div className="mt-10 rounded-2xl border border-dashed border-line-strong bg-paper/60 p-4 text-xs">
          <p className="mb-2 font-semibold text-ink-soft">{t("auth.demoAccounts")}</p>
          <ul className="space-y-1 font-mono text-muted" dir="ltr">
            {DEMO.map(([role, email, pw]) => (
              <li key={email}>
                <span className="inline-block w-32 font-sans text-ink-soft">{role}</span> {email} / {pw}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
