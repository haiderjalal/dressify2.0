import { Heart } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listFavoriteIds } from "@/server/modules/customers/service";
import { getTailorsByIds } from "@/server/modules/tailors/queries";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { TailorCard } from "@/components/site/tailor-card";

export const metadata = { title: "Saved tailors" };

export default async function SavedPage() {
  const user = await requireUser("customer");
  const i18n = await getI18n();
  const tailors = await getTailorsByIds(await listFavoriteIds(user.id));
  return (
    <>
      <PageHeader title={i18n.t("account.saved")} />
      {tailors.length === 0 ? (
        <EmptyState icon={<Heart />} title={i18n.t("account.noSaved")} action={<LinkButton href="/explore" size="sm">{i18n.t("home.ctaExplore")}</LinkButton>} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tailors.map((tl) => (
            <TailorCard key={tl.slug} t={i18n} tailor={tl} />
          ))}
        </div>
      )}
    </>
  );
}
