import Link from "next/link";
import { Ruler } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listMeasurements } from "@/server/modules/customers/service";
import { deleteMeasurementAction } from "@/server/actions/account";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { LinkButton, buttonClass } from "@/components/ui/button";
import { MeasurementForm } from "@/components/account/measurement-form";
import { MeasurementGrid } from "@/components/orders/order-bits";
import { DeleteButton } from "@/components/forms/delete-button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Measurements" };

export default async function MeasurementsPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const user = await requireUser("customer");
  const sp = await searchParams;
  const i18n = await getI18n();
  const { t, tx, locale } = i18n;
  const profiles = await listMeasurements(user.id);
  const editing = sp.edit ? profiles.find((p) => p.id === sp.edit) : undefined;
  const showForm = Boolean(sp.new) || Boolean(editing);

  return (
    <>
      <PageHeader title={t("measurements.title")} subtitle={t("measurements.subtitle")} action={!showForm && <LinkButton href="/account/measurements?new=1"><Ruler /> {t("measurements.add")}</LinkButton>} />
      {showForm && (
        <Card className="mb-8 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl">{editing ? t("measurements.edit") : t("measurements.add")}</h2>
            <Link href="/account/measurements" className={buttonClass("ghost", "sm")}>{t("common.cancel")}</Link>
          </div>
          <MeasurementForm initial={editing ? { id: editing.id, name: editing.name, gender: editing.gender, values: editing.values, notes: editing.notes } : undefined} />
        </Card>
      )}
      {profiles.length === 0 && !showForm ? (
        <EmptyState icon={<Ruler />} title={t("measurements.empty")} action={<LinkButton href="/account/measurements?new=1" size="sm">{t("measurements.add")}</LinkButton>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {profiles.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl">{p.name}</p>
                  <p className="text-xs text-muted">{formatDate(p.updatedAt, locale)}</p>
                </div>
                <Badge>{tx(`audiences.${p.gender}`)}</Badge>
              </div>
              <MeasurementGrid t={i18n} values={p.values} />
              {p.notes && <p className="mt-3 text-sm text-muted">{p.notes}</p>}
              <div className="mt-4 flex gap-2">
                <LinkButton href={`/account/measurements?edit=${p.id}`} variant="outline" size="sm">{t("common.edit")}</LinkButton>
                <DeleteButton action={deleteMeasurementAction} id={p.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
