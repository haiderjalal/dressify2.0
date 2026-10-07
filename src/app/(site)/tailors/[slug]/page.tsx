import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, Camera, Home, MapPin, Truck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/session";
import { getPublicTailor } from "@/server/modules/tailors/queries";
import { getAvailability } from "@/server/modules/tailors/availability";
import { listFavoriteIds } from "@/server/modules/customers/service";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { Stars } from "@/components/ui/stars";
import { FavoriteButton } from "@/components/site/favorite-button";
import { AppointmentForm } from "@/components/site/appointment-form";
import { cn, formatDate, formatPrice, rating } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicTailor(slug);
  if (!data) return { title: "Tailor not found" };
  const { profile } = data;
  const description = profile.bio?.slice(0, 160) ?? `${profile.shopName} — tailor in ${profile.area ?? profile.city}. Book a stitching slot on Dressify.`;
  return {
    title: profile.shopName,
    description,
    alternates: { canonical: `/tailors/${profile.slug}` },
    openGraph: { title: profile.shopName, description, images: profile.coverUrl ? [profile.coverUrl] : undefined },
  };
}

export default async function TailorProfilePage({ params }: Params) {
  const { slug } = await params;
  const data = await getPublicTailor(slug);
  if (!data) notFound();
  const { profile, designs, fabrics, reviews } = data;
  const [{ t, tx, locale }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const [slots, favoriteIds] = await Promise.all([getAvailability(profile, 14), user?.role === "customer" ? listFavoriteIds(user.id) : Promise.resolve([] as string[])]);

  const path = `/tailors/${profile.slug}`;
  const r = rating(profile.ratingSum, profile.ratingCount);
  const canBook = designs.length > 0;
  const where = [profile.addressLine, profile.area, profile.city].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps?q=${profile.lat},${profile.lng}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.shopName,
    image: profile.coverUrl ?? profile.avatarUrl ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: profile.addressLine ?? undefined, addressLocality: profile.area ?? undefined, addressRegion: profile.city, addressCountry: "PK" },
    geo: { "@type": "GeoCoordinates", latitude: profile.lat, longitude: profile.lng },
    aggregateRating: profile.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: r.toFixed(1), reviewCount: profile.ratingCount } : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="relative h-48 bg-sand sm:h-64">
        {profile.coverUrl && <SmartImage src={profile.coverUrl} alt="" fill priority sizes="100vw" className="object-cover" />}
      </div>

      <div className="container-x">
        <div className="-mt-12 flex flex-wrap items-end gap-5 sm:-mt-14">
          <Avatar name={profile.shopName} src={profile.avatarUrl} size={104} className="border-4 border-ivory" />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{profile.shopName}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted">
              <MapPin className="size-4" /> {where}
            </p>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <FavoriteButton tailorId={profile.id} saved={favoriteIds.includes(profile.id)} signedIn={Boolean(user)} path={path} />
            {canBook && (
              <LinkButton href={`${path}/book`} size="lg">
                {t("tailor.bookNow")}
              </LinkButton>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {profile.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-gold-deep">
              <Stars value={r} /> {r.toFixed(1)} · {t("tailor.reviews", { n: profile.ratingCount })}
            </span>
          ) : (
            <Badge>{t("tailor.newTailor")}</Badge>
          )}
          {profile.isWomenLed && (
            <Badge tone="gold">
              <BadgeCheck /> {t("tailor.womenLed")}
            </Badge>
          )}
          {profile.isHomeBased && (
            <Badge>
              <Home /> {t("tailor.homeBased")}
            </Badge>
          )}
          {profile.offersHomeVisit && (
            <Badge tone="emerald">
              <Truck /> {t("tailor.homeVisit")}
            </Badge>
          )}
          {profile.yearsExperience > 0 && <Badge>{t("tailor.years", { n: profile.yearsExperience })}</Badge>}
          {profile.ordersCompleted > 0 && <Badge>{t("tailor.completedOrders", { n: profile.ordersCompleted })}</Badge>}
        </div>

        <div className="mt-10 grid gap-10 pb-20 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-12">
            {profile.bio && (
              <section>
                <h2 className="mb-3 font-display text-2xl font-medium">{t("tailor.about")}</h2>
                <p className="leading-relaxed whitespace-pre-wrap text-ink-soft">{profile.bio}</p>
                <p className="mt-3 text-sm text-muted">{profile.specialties.map((c) => tx(`categories.${c}`)).join(" · ")}</p>
              </section>
            )}

            <section>
              <h2 className="mb-4 font-display text-2xl font-medium">{t("tailor.portfolio")}</h2>
              {designs.length === 0 ? (
                <EmptyState title={t("tailor.noDesigns")} />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {designs.map((d) => (
                    <article key={d.id} className="group overflow-hidden rounded-2xl border border-line bg-paper shadow-soft">
                      <div className="relative aspect-[4/5] bg-sand">
                        {d.images[0] && <SmartImage src={d.images[0]} alt={d.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-gold-deep">{tx(`categories.${d.category}`)}</p>
                        <h3 className="mt-0.5 truncate font-medium">{d.title}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {formatPrice(d.price, locale)} · {t("tailor.readyIn", { n: d.durationDays })}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <LinkButton href={`${path}/book?design=${d.id}`} size="sm" className="flex-1">
                            {t("tailor.selectDesign")}
                          </LinkButton>
                          {d.tryOnUrl && (
                            <LinkButton href={`/try-on/${d.id}`} size="sm" variant="outline" aria-label={t("tailor.tryOn")}>
                              <Camera />
                            </LinkButton>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-medium">{t("tailor.fabricStore")}</h2>
              {fabrics.length === 0 ? (
                <p className="text-muted">{t("tailor.noFabrics")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {fabrics.map((f) => (
                    <div key={f.id} className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl" style={{ background: f.colorHex }}>
                        {f.imageUrl && <SmartImage src={f.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{f.name}</p>
                        <p className="text-sm text-muted">
                          {tx(`materials.${f.material}`)} · {f.colorName}
                        </p>
                        <p className="text-sm tabular-nums">
                          {formatPrice(f.pricePerMeter, locale)}
                          {t("common.perMeter")} · <span className={f.stockMeters > 0 ? "text-success" : "text-danger"}>{f.stockMeters > 0 ? t("tailor.inStock", { n: f.stockMeters }) : t("tailor.outOfStock")}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl font-medium">{t("tailor.reviews", { n: profile.ratingCount })}</h2>
              {reviews.length === 0 ? (
                <p className="text-muted">{t("tailor.noReviews")}</p>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((rv) => (
                    <li key={rv.id} className="rounded-2xl border border-line bg-paper p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{rv.name}</p>
                        <span className="text-xs text-muted">{formatDate(rv.createdAt, locale)}</span>
                      </div>
                      <Stars value={rv.rating} className="mt-1" />
                      {rv.comment && <p className="mt-2 text-sm text-ink-soft">{rv.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader title={t("tailor.availability")} subtitle={t("tailor.availabilityHint")} />
              <ul className="grid grid-cols-2 gap-2 p-4">
                {slots.slice(0, 8).map((d) => (
                  <li key={d.day} className={cn("rounded-xl border px-3 py-2 text-sm", d.closed ? "border-line text-faint" : d.available === 0 ? "border-danger/30 text-danger" : "border-emerald/30 bg-emerald-soft/50")}>
                    <p className="font-medium">{formatDate(d.day, locale, { weekday: "short", day: "numeric", month: "short" })}</p>
                    <p className="text-xs">{d.closed ? t("tailor.closed") : d.available === 0 ? t("tailor.full") : t("tailor.slotsLeft", { n: d.available })}</p>
                  </li>
                ))}
              </ul>
              {canBook && (
                <div className="px-4 pb-4">
                  <LinkButton href={`${path}/book`} className="w-full">
                    {t("tailor.bookNow")}
                  </LinkButton>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock className="size-4 text-gold" /> {t("tailor.bookAppointment")}
                  </span>
                }
                subtitle={t("appointments.subtitle")}
              />
              <div className="px-4 pb-4">
                <AppointmentForm tailorId={profile.id} homeVisit={profile.offersHomeVisit} signedIn={user?.role === "customer"} loginNext={path} />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold">{t("tailor.location")}</h2>
              <p className="mt-2 text-sm text-muted">{where}</p>
              <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gold-deep hover:underline">
                <MapPin className="size-4" /> Google Maps
              </Link>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
