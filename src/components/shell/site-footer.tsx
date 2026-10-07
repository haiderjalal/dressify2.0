import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { Logo } from "./logo";

export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="mt-24 border-t border-line bg-paper">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted">{t("common.tagline")}</p>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="eyebrow">{t("common.appName")}</p>
          <Link href="/explore" className="block text-ink-soft hover:text-ink">{t("nav.explore")}</Link>
          <Link href="/explore?women=1" className="block text-ink-soft hover:text-ink">{t("nav.herCraft")}</Link>
          <Link href="/try-on" className="block text-ink-soft hover:text-ink">{t("tryon.title")}</Link>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="eyebrow">{t("nav.forTailors")}</p>
          <Link href="/join/tailor" className="block text-ink-soft hover:text-ink">{t("auth.joinAsTailor")}</Link>
          <Link href="/login" className="block text-ink-soft hover:text-ink">{t("common.signIn")}</Link>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-faint">© {new Date().getFullYear()} Dressify</div>
    </footer>
  );
}
