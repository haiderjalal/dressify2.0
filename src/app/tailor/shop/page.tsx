import { requireTailor } from "@/server/auth/session";
import { getI18n } from "@/i18n/server";
import { ShopForm } from "@/components/tailor/shop-form";
import { SettingsForms } from "@/components/account/settings-forms";

export const metadata = { title: "Shop settings" };

export default async function ShopPage() {
  const { user, tailor } = await requireTailor();
  const { t } = await getI18n();
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl font-medium">{t("dash.shopTitle")}</h1>
      <ShopForm
        tailor={{
          shopName: tailor.shopName,
          bio: tailor.bio,
          phone: tailor.phone ?? user.phone ?? "",
          city: tailor.city,
          area: tailor.area,
          addressLine: tailor.addressLine,
          lat: tailor.lat,
          lng: tailor.lng,
          serves: tailor.serves,
          specialties: tailor.specialties,
          yearsExperience: tailor.yearsExperience,
          isHomeBased: tailor.isHomeBased,
          isWomenLed: tailor.isWomenLed,
          offersHomeVisit: tailor.offersHomeVisit,
        }}
      />
      <SettingsForms name={user.name} email={user.email} phone={user.phone ?? ""} large />
    </div>
  );
}
