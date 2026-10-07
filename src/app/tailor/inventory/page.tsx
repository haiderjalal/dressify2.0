import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listInventory } from "@/server/modules/inventory/service";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { InventoryForm, InventoryRow } from "@/components/tailor/inventory";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const { tailor } = await requireTailor();
  const sp = await searchParams;
  const { t } = await getI18n();
  const items = await listInventory(tailor.id);
  const editing = sp.edit ? items.find((i) => i.id === sp.edit) : undefined;
  const showForm = Boolean(sp.new) || Boolean(editing);
  const low = items.filter((i) => i.quantity <= i.lowStockAt).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium">{t("dash.inventoryTitle")}</h1>
          <p className="mt-1 text-lg text-muted">{t("dash.inventoryHint")}</p>
        </div>
        {!showForm && (
          <LinkButton href="/tailor/inventory?new=1" size="xl" variant="emerald">
            <Plus className="size-6" /> {t("dash.addItem")}
          </LinkButton>
        )}
      </div>
      {low > 0 && <Badge tone="warning" className="px-3 py-1 text-base">{t("dash.lowStock")}: {low}</Badge>}
      {showForm && (
        <div className="rounded-3xl border border-line bg-paper p-6 shadow-soft">
          <div className="mb-4 flex justify-end">
            <Link href="/tailor/inventory" className={buttonClass("ghost", "md")}>{t("common.cancel")}</Link>
          </div>
          <InventoryForm initial={editing} />
        </div>
      )}
      {items.length === 0 && !showForm ? (
        <Link href="/tailor/inventory?new=1" className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-line-strong bg-paper/60 p-12 text-center text-lg text-muted">
          <Package className="size-10 text-gold" /> {t("dash.noItems")}
        </Link>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <InventoryRow key={i.id} item={i} />
          ))}
        </div>
      )}
    </div>
  );
}
