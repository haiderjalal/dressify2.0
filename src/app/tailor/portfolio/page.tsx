import { Plus, Shirt } from "lucide-react";
import Link from "next/link";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listDesigns } from "@/server/modules/catalog/service";
import { deleteDesignAction } from "@/server/actions/tailor";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { SmartImage } from "@/components/ui/smart-image";
import { DeleteButton } from "@/components/forms/delete-button";
import { cn, formatPrice } from "@/lib/utils";

export const metadata = { title: "Designs" };

export default async function PortfolioPage() {
  const { tailor } = await requireTailor();
  const { t, tx, locale } = await getI18n();
  const designs = await listDesigns(tailor.id);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-medium">{t("dash.portfolioTitle")}</h1>
        <LinkButton href="/tailor/portfolio/new" size="xl" variant="emerald">
          <Plus className="size-6" /> {t("dash.addDesign")}
        </LinkButton>
      </div>

      {designs.length === 0 ? (
        <Link href="/tailor/portfolio/new" className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line-strong bg-paper/60 p-12 text-center text-lg text-muted">
          <Shirt className="size-10 text-gold" /> {t("dash.noDesigns")}
        </Link>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {designs.map((d) => (
            <div key={d.id} className={cn("overflow-hidden rounded-3xl border border-line bg-paper shadow-soft", !d.isActive && "opacity-60")}>
              <div className="relative aspect-[4/3] bg-sand">{d.images[0] && <SmartImage src={d.images[0]} alt={d.title} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />}</div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-lg font-semibold">{d.title}</p>
                  {!d.isActive && <Badge tone="dark">{t("common.hidden")}</Badge>}
                </div>
                <p className="text-base text-muted">
                  {tx(`categories.${d.category}`)} · {tx(`audiences.${d.audience}`)}
                </p>
                <p className="text-base tabular-nums">
                  {formatPrice(d.price, locale)} · {t("tailor.readyIn", { n: d.durationDays })}
                </p>
                <div className="flex gap-2 pt-2">
                  <LinkButton href={`/tailor/portfolio/${d.id}`} variant="outline" size="md" className="flex-1">
                    {t("common.edit")}
                  </LinkButton>
                  <DeleteButton action={deleteDesignAction} id={d.id} label="" size="md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
