import { MapPin } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { listAddresses } from "@/server/modules/customers/service";
import { defaultAddressAction, deleteAddressAction } from "@/server/actions/account";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { DeleteButton } from "@/components/forms/delete-button";
import { AddressForm, SimpleActionButton } from "@/components/account/address-form";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("customer");
  const { t } = await getI18n();
  const list = await listAddresses(user.id);
  return (
    <>
      <PageHeader title={t("account.addresses")} />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-3">
          {list.length === 0 && <EmptyState icon={<MapPin />} title={t("account.noAddresses")} />}
          {list.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {a.label} {a.isDefault && <Badge tone="emerald">{t("account.default")}</Badge>}
                </p>
                <p className="mt-1 text-sm text-muted">{[a.line1, a.area, a.city].filter(Boolean).join(", ")}</p>
                {a.phone && <p className="text-sm text-muted" dir="ltr">{a.phone}</p>}
              </div>
              <div className="flex gap-2">
                {!a.isDefault && <SimpleActionButton action={defaultAddressAction} id={a.id} label={t("account.setDefault")} />}
                <DeleteButton action={deleteAddressAction} id={a.id} />
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">{t("account.addAddress")}</h2>
          <AddressForm phone={user.phone ?? ""} />
        </Card>
      </div>
    </>
  );
}
