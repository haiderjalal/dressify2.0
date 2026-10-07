import { getI18n } from "@/i18n/server";
import { LinkButton } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="linen grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 font-display text-8xl text-gold/70">404</p>
        <h1 className="mt-2 font-display text-3xl">{t("common.notFoundTitle")}</h1>
        <p className="mt-2 text-muted">{t("common.notFoundBody")}</p>
        <LinkButton href="/" className="mt-8">{t("common.goHome")}</LinkButton>
      </div>
    </main>
  );
}
