import { getI18n } from "@/i18n/server";
import { getTryOnDesigns } from "@/server/modules/tailors/queries";
import { Logo } from "@/components/shell/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { SmartImage } from "@/components/ui/smart-image";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, looks] = await Promise.all([getI18n(), getTryOnDesigns(12)]);
  const look = looks[1] ?? looks[0];
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <LanguageToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        {look?.images[0] && <SmartImage src={look.images[0]} alt="" fill sizes="50vw" className="object-cover opacity-90" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-paper">
          <p className="eyebrow text-gold">{t("home.eyebrow")}</p>
          <p className="mt-4 font-display text-4xl leading-tight">{t("home.title")}</p>
        </div>
      </div>
    </div>
  );
}
