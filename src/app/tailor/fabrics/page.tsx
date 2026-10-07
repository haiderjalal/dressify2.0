import Link from "next/link";
import { Palette, Plus } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listFabrics } from "@/server/modules/catalog/service";
import { deleteFabricAction } from "@/server/actions/tailor";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { SmartImage } from "@/components/ui/smart-image";
import { FabricForm } from "@/components/tailor/fabric-form";
import { DeleteButton } from "@/components/forms/delete-button";
import { cn, formatPrice } from "@/lib/utils";

export const metadata = { title: "Fabric store" };

export default async function FabricsPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { tailor } = await requireTailor();
  const sp = await searchParams;
  const { t, tx, locale } = await getI18n();
  const fabrics = await listFabrics(tailor.id);
  const editing = sp.edit ? fabrics.find((f) => f.id === sp.edit) : undefined;
  const showForm = Boolean(sp.new) || Boolean(editing);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-medium">{t("dash.fabricsTitle")}</h1>
        {!showForm && (
          <LinkButton href="/tailor/fabrics?new=1" size="xl" variant="emerald">
            <Plus className="size-6" /> {t("dash.addFabric")}
          </LinkButton>
        )}
      </div>
      {showForm && (
        <div className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{editing ? t("dash.editFabric") : t("dash.addFabric")}</h2>
            <Link href="/tailor/fabrics" className={buttonClass("ghost", "md")}>{t("common.cancel")}</Link>
          </div>
          <FabricForm initial={editing} />
        </div>
      )}
      {fabrics.length === 0 && !showForm ? (
        <Link href="/tailor/fabrics?new=1" className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line-strong bg-paper/60 p-12 text-center text-lg text-muted">
          <Palette className="size-10 text-gold" /> {t("dash.noFabrics")}
        </Link>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fabrics.map((f) => (
            <div key={f.id} className={cn("flex min-w-0 items-center gap-4 rounded-3xl border border-line bg-paper p-4 shadow-soft", !f.isActive && "opacity-60")}>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl" style={{ background: f.colorHex }}>
                {f.imageUrl && <SmartImage src={f.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{f.name}</p>
                <p className="text-base text-muted">
                  {tx(`materials.${f.material}`)} · {f.colorName}
                </p>
                <p className="text-base tabular-nums">
                  {formatPrice(f.pricePerMeter, locale)}
                  {t("common.perMeter")} · <span className={f.stockMeters <= 5 ? "font-semibold text-danger" : "text-success"}>{t("tailor.inStock", { n: f.stockMeters })}</span>
                </p>
                {!f.isActive && <Badge tone="dark">{t("common.hidden")}</Badge>}
              </div>
              <div className="flex flex-col gap-2">
                <LinkButton href={`/tailor/fabrics?edit=${f.id}`} variant="outline" size="md">{t("common.edit")}</LinkButton>
                <DeleteButton action={deleteFabricAction} id={f.id} label="" size="md" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
