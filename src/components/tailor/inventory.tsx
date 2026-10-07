"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus } from "lucide-react";
import { adjustItemAction, deleteItemAction, saveItemAction } from "@/server/actions/tailor";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { Field, Input, Select, SubmitButton } from "@/components/forms/fields";
import { DeleteButton } from "@/components/forms/delete-button";
import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; category: string; unit: string; quantity: number; lowStockAt: number; costPerUnit: number };

export function InventoryRow({ item }: { item: Item }) {
  const { t, tx } = useI18n();
  const low = item.quantity <= item.lowStockAt;
  const step = item.unit === "meter" ? 0.5 : 1;
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-4 rounded-3xl border bg-paper p-4 shadow-soft", low ? "border-warning/40" : "border-line")}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-lg font-semibold">
          {item.name} {low && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-sm font-medium text-warning">{t("dash.lowStockBadge")}</span>}
        </p>
        <p className="text-base text-muted">{tx(`inventoryCategories.${item.category}`)}</p>
      </div>
      <div className="flex items-center gap-2">
        <ActionForm action={adjustItemAction} silent>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="delta" value={-step} />
          <button type="submit" className="grid size-12 place-items-center rounded-2xl border border-line-strong bg-paper active:scale-95" aria-label="-">
            <Minus className="size-5" />
          </button>
        </ActionForm>
        <div className="w-24 text-center">
          <p className={cn("text-2xl font-semibold tabular-nums", low && "text-warning")}>{item.quantity}</p>
          <p className="text-sm text-muted">{tx(`units.${item.unit}`)}</p>
        </div>
        <ActionForm action={adjustItemAction} silent>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="delta" value={step} />
          <button type="submit" className="grid size-12 place-items-center rounded-2xl bg-emerald text-paper active:scale-95" aria-label="+">
            <Plus className="size-5" />
          </button>
        </ActionForm>
      </div>
      <div className="flex gap-2">
        <Link href={`/tailor/inventory?edit=${item.id}`} className="grid size-12 place-items-center rounded-2xl border border-line hover:bg-sand" aria-label={t("common.edit")}>
          <Pencil className="size-5" />
        </Link>
        <DeleteButton action={deleteItemAction} id={item.id} label="" size="lg" />
      </div>
    </div>
  );
}

export function InventoryForm({ initial }: { initial?: Item }) {
  const { t, tx } = useI18n();
  const router = useRouter();
  return (
    <ActionForm action={saveItemAction} className="space-y-5" onDone={(s) => s.ok && router.push("/tailor/inventory")}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("dash.itemName")} name="name" className="sm:col-span-2">
          <Input name="name" size="lg" required defaultValue={initial?.name} />
        </Field>
        <Field label={t("dash.itemCategory")} name="category">
          <Select name="category" size="lg" defaultValue={initial?.category ?? "thread"}>
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{tx(`inventoryCategories.${c}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("dash.unit")} name="unit">
          <Select name="unit" size="lg" defaultValue={initial?.unit ?? "piece"}>
            {INVENTORY_UNITS.map((u) => (
              <option key={u} value={u}>{tx(`units.${u}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("dash.quantity")} name="quantity">
          <Input name="quantity" size="lg" type="number" step="0.5" min={0} required defaultValue={initial?.quantity ?? 0} dir="ltr" />
        </Field>
        <Field label={t("dash.lowStockAt")} name="lowStockAt">
          <Input name="lowStockAt" size="lg" type="number" step="0.5" min={0} required defaultValue={initial?.lowStockAt ?? 2} dir="ltr" />
        </Field>
        <Field label={t("dash.cost")} name="costPerUnit">
          <Input name="costPerUnit" size="lg" type="number" min={0} required defaultValue={initial?.costPerUnit ?? 0} dir="ltr" />
        </Field>
      </div>
      <SubmitButton size="xl" variant="emerald">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
