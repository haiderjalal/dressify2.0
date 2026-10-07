"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CreditCard, Minus, Package, Plus, Ruler, Scissors, Smartphone, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { placeOrderAction } from "@/server/actions/booking";
import { useI18n } from "@/i18n/client";
import { ActionForm } from "@/components/forms/action-form";
import { SubmitButton } from "@/components/forms/fields";
import { MeasurementForm } from "@/components/account/measurement-form";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { SmartImage } from "@/components/ui/smart-image";
import { priceOrder } from "@/lib/pricing";
import { addDays, cn, formatDate, formatPrice } from "@/lib/utils";

type Design = { id: string; title: string; category: string; audience: string; price: number; durationDays: number; image: string | null };
type Fabric = { id: string; name: string; material: string; colorName: string; colorHex: string; pricePerMeter: number; stockMeters: number; imageUrl: string | null };
type Slot = { day: string; capacity: number; used: number; available: number; closed: boolean };
type Profile = { id: string; name: string; gender: string; values: Record<string, number> };
type Address = { id: string; label: string; line1: string; area: string | null; city: string; isDefault: boolean };
type Line = { quantity: number; fabricId: string | null; meters: number };

const DEFAULT_METERS: Record<string, number> = { shalwar_kameez: 4.5, kurta: 3, kurti: 2.5, waistcoat: 1.5, sherwani: 4, pant_coat: 3.5, frock: 6, lehenga: 7, gharara: 6, abaya: 4, kids_wear: 2.5, alteration: 0.5 };
const METHODS = [
  { id: "easypaisa", icon: Smartphone },
  { id: "card", icon: CreditCard },
  { id: "cod", icon: Wallet },
] as const;

export function BookingWizard(props: {
  tailor: { id: string; shopName: string; slug: string };
  designs: Design[];
  fabrics: Fabric[];
  slots: Slot[];
  measurements: Profile[];
  addresses: Address[];
  user: { name: string; phone: string };
  preselect?: string;
  testMode: boolean;
}) {
  const { t, tx, locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [lines, setLines] = useState<Record<string, Line>>(() => {
    const d = props.designs.find((x) => x.id === props.preselect);
    return d ? { [d.id]: { quantity: 1, fabricId: null, meters: DEFAULT_METERS[d.category] ?? 3 } } : {};
  });
  const [fabricSource, setFabricSource] = useState<"own" | "store">("own");
  const [profileId, setProfileId] = useState<string | null>(props.measurements[0]?.id ?? null);
  const [showNewProfile, setShowNewProfile] = useState(props.measurements.length === 0);
  const [slotDate, setSlotDate] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(props.addresses.find((a) => a.isDefault)?.id ?? props.addresses[0]?.id ?? null);
  const [addr, setAddr] = useState({ name: props.user.name, phone: props.user.phone, line1: "", area: "", city: "Lahore", save: true });
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"easypaisa" | "card" | "cod">("cod");

  const selected = props.designs.filter((d) => lines[d.id]);
  const fabricById = useMemo(() => new Map(props.fabrics.map((f) => [f.id, f])), [props.fabrics]);
  const money = priceOrder(
    selected.map((d) => {
      const l = lines[d.id];
      const f = l.fabricId ? fabricById.get(l.fabricId) : undefined;
      return { price: d.price, quantity: l.quantity, fabricPricePerMeter: f?.pricePerMeter ?? null, fabricMeters: f ? l.meters : null };
    }),
    fabricSource,
  );
  const maxDays = Math.max(0, ...selected.map((d) => d.durationDays));

  const steps = [t("booking.stepDesign"), t("booking.stepFabric"), t("booking.stepMeasurements"), t("booking.stepSchedule"), t("booking.stepPayment")];

  const stepError = (s: number): string | null => {
    if (s === 0 && selected.length === 0) return t("booking.selectAtLeastOne");
    if (s === 1 && fabricSource === "store" && selected.some((d) => !lines[d.id].fabricId)) return t("errors.required");
    if (s === 2 && !profileId) return t("errors.required");
    if (s === 3) {
      if (!slotDate) return t("booking.selectDate");
      if (!addressId && (addr.line1.trim().length < 3 || addr.city.trim().length < 2 || !/^(\+92|0)3\d{9}$/.test(addr.phone.replace(/[\s-]/g, "")))) return t("errors.invalid");
    }
    return null;
  };
  const go = (to: number) => {
    for (let s = step; s < to; s++) {
      const e = stepError(s);
      if (e) {
        setStep(s);
        return toast.error(e);
      }
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleDesign = (d: Design) =>
    setLines((prev) => {
      const next = { ...prev };
      if (next[d.id]) delete next[d.id];
      else next[d.id] = { quantity: 1, fabricId: null, meters: DEFAULT_METERS[d.category] ?? 3 };
      return next;
    });
  const patch = (id: string, p: Partial<Line>) => setLines((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const payload = JSON.stringify({
    tailorId: props.tailor.id,
    fabricSource,
    items: selected.map((d) => ({ designId: d.id, quantity: lines[d.id].quantity, fabricId: fabricSource === "store" ? lines[d.id].fabricId : null, fabricMeters: fabricSource === "store" ? lines[d.id].meters : null })),
    measurementProfileId: profileId,
    slotDate,
    address: addressId ? { addressId } : { name: addr.name, phone: addr.phone, line1: addr.line1, area: addr.area || null, city: addr.city, save: addr.save },
    notes: notes || null,
    paymentMethod: method,
  });

  const input = "h-11 w-full rounded-xl border border-line-strong bg-paper px-3.5 focus:border-ink/60 focus:ring-4 focus:ring-gold/15 focus:outline-none";

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        {/* Stepper */}
        <ol className="scrollbar-none mb-6 flex gap-2 overflow-x-auto">
          {steps.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => (i < step ? setStep(i) : go(i))}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition",
                  i === step ? "border-ink bg-ink text-paper" : i < step ? "border-emerald/40 bg-emerald-soft text-emerald" : "border-line bg-paper text-muted",
                )}
              >
                <span className="grid size-5 place-items-center rounded-full bg-current/15 text-xs">{i < step ? <Check className="size-3" /> : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        {/* Step 1 — designs */}
        {step === 0 && (
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-2xl font-medium">{t("booking.chooseDesigns")}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {props.designs.map((d) => {
                const on = Boolean(lines[d.id]);
                return (
                  <div key={d.id} className={cn("flex gap-3 rounded-2xl border p-3 transition", on ? "border-ink bg-sand/40 ring-1 ring-ink" : "border-line hover:border-line-strong")}>
                    <button type="button" onClick={() => toggleDesign(d)} className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-sand" aria-pressed={on}>
                      {d.image && <SmartImage src={d.image} alt={d.title} fill sizes="96px" className="object-cover" />}
                      {on && <span className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-ink text-paper"><Check className="size-3.5" /></span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => toggleDesign(d)} className="block text-start">
                        <p className="text-xs text-gold-deep">{tx(`categories.${d.category}`)}</p>
                        <p className="line-clamp-2 font-medium">{d.title}</p>
                        <p className="mt-1 text-sm tabular-nums">
                          {formatPrice(d.price, locale)} <span className="text-xs text-muted">· {t("common.days", { n: d.durationDays })}</span>
                        </p>
                      </button>
                      {on && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-line bg-paper p-0.5">
                          <button type="button" className="grid size-7 place-items-center rounded-full hover:bg-sand" onClick={() => patch(d.id, { quantity: Math.max(1, lines[d.id].quantity - 1) })} aria-label="-">
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm tabular-nums">{lines[d.id].quantity}</span>
                          <button type="button" className="grid size-7 place-items-center rounded-full hover:bg-sand" onClick={() => patch(d.id, { quantity: Math.min(10, lines[d.id].quantity + 1) })} aria-label="+">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Step 2 — fabric */}
        {step === 1 && (
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-2xl font-medium">{t("booking.fabricTitle")}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["own", Truck, t("booking.ownFabric"), t("booking.ownFabricHint")],
                  ["store", Package, t("booking.storeFabric"), t("booking.storeFabricHint")],
                ] as const
              ).map(([id, Icon, title, hint]) => (
                <button
                  key={id}
                  type="button"
                  disabled={id === "store" && props.fabrics.length === 0}
                  onClick={() => setFabricSource(id)}
                  className={cn("rounded-2xl border p-4 text-start transition disabled:opacity-40", fabricSource === id ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong")}
                >
                  <Icon className="size-5 text-gold" />
                  <p className="mt-3 font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted">{id === "store" && props.fabrics.length === 0 ? t("booking.noFabricsInStore") : hint}</p>
                </button>
              ))}
            </div>
            {fabricSource === "store" && (
              <div className="mt-6 space-y-6">
                {selected.map((d) => (
                  <div key={d.id}>
                    <p className="text-sm font-medium">{t("booking.chooseFabric", { design: d.title })}</p>
                    <div className="scrollbar-none -mx-1 mt-2 flex gap-2.5 overflow-x-auto px-1 pb-1">
                      {props.fabrics.map((f) => {
                        const on = lines[d.id].fabricId === f.id;
                        return (
                          <button key={f.id} type="button" onClick={() => patch(d.id, { fabricId: f.id })} className={cn("w-32 shrink-0 overflow-hidden rounded-xl border text-start transition", on ? "border-ink ring-2 ring-ink/20" : "border-line")}>
                            <div className="relative h-16" style={{ background: f.colorHex }}>
                              {f.imageUrl && <SmartImage src={f.imageUrl} alt="" fill sizes="128px" className="object-cover" />}
                            </div>
                            <div className="p-2">
                              <p className="truncate text-xs font-medium">{f.name}</p>
                              <p className="truncate text-[11px] text-muted">{tx(`materials.${f.material}`)} · {f.colorName}</p>
                              <p className="text-[11px] tabular-nums">
                                {formatPrice(f.pricePerMeter, locale)}
                                {t("common.perMeter")}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-2 inline-flex items-center gap-2 text-sm">
                      {t("booking.meters")}
                      <input type="number" min={0.5} max={30} step={0.5} value={lines[d.id].meters} onChange={(e) => patch(d.id, { meters: Math.max(0.5, Math.min(30, Number(e.target.value) || 0.5)) })} className="h-9 w-20 rounded-lg border border-line-strong bg-paper px-2 tabular-nums" />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Step 3 — measurements */}
        {step === 2 && (
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-2xl font-medium">{t("booking.measurementTitle")}</h2>
            {props.measurements.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {props.measurements.map((m) => (
                  <button key={m.id} type="button" onClick={() => setProfileId(m.id)} className={cn("rounded-2xl border p-4 text-start transition", profileId === m.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong")}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{m.name}</p>
                      <Badge>{tx(`audiences.${m.gender}`)}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted">
                      {Object.entries(m.values)
                        .slice(0, 5)
                        .map(([k, v]) => `${tx(`measurements.fields.${k}`)} ${v}″`)
                        .join(" · ")}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {!showNewProfile ? (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowNewProfile(true)}>
                <Ruler /> {t("booking.newProfile")}
              </Button>
            ) : (
              <div className="mt-6 rounded-2xl border border-line bg-ivory/60 p-4 sm:p-5">
                <MeasurementForm
                  compact
                  initial={{ gender: selected[0]?.audience }}
                  onSaved={(id) => {
                    setProfileId(id);
                    setShowNewProfile(false);
                    router.refresh();
                  }}
                />
              </div>
            )}
          </Card>
        )}

        {/* Step 4 — slot + address */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-2xl font-medium">{t("booking.scheduleTitle")}</h2>
              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {props.slots.map((s) => {
                  const disabled = s.available === 0;
                  return (
                    <button
                      key={s.day}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSlotDate(s.day)}
                      className={cn(
                        "rounded-xl border px-1 py-2.5 text-center transition disabled:cursor-not-allowed",
                        slotDate === s.day ? "border-ink bg-ink text-paper" : disabled ? "border-line bg-sand/40 text-faint" : "border-line bg-paper hover:border-ink/50",
                      )}
                    >
                      <span className="block text-[10px] tracking-wide uppercase opacity-70">{formatDate(s.day, locale, { weekday: "short" })}</span>
                      <span className="block font-display text-xl font-semibold">{formatDate(s.day, "en", { day: "numeric" })}</span>
                      <span className="block text-[10px]">{s.closed ? t("tailor.closed") : s.available === 0 ? t("tailor.full") : t("tailor.slotsLeft", { n: s.available })}</span>
                    </button>
                  );
                })}
              </div>
              {slotDate && <p className="mt-4 text-sm text-emerald">{t("booking.scheduleHint", { date: formatDate(addDays(slotDate, maxDays), locale, { weekday: "long", day: "numeric", month: "long" }) })}</p>}
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-2xl font-medium">{t("booking.addressTitle")}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {props.addresses.map((a) => (
                  <button key={a.id} type="button" onClick={() => setAddressId(a.id)} className={cn("rounded-2xl border p-4 text-start transition", addressId === a.id ? "border-ink ring-1 ring-ink" : "border-line")}>
                    <p className="font-medium">{a.label}</p>
                    <p className="mt-1 text-sm text-muted">{[a.line1, a.area, a.city].filter(Boolean).join(", ")}</p>
                  </button>
                ))}
                <button type="button" onClick={() => setAddressId(null)} className={cn("rounded-2xl border border-dashed p-4 text-start transition", addressId === null ? "border-ink ring-1 ring-ink" : "border-line-strong")}>
                  <p className="font-medium">{t("booking.newAddress")}</p>
                </button>
              </div>
              {addressId === null && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    {t("booking.recipientName")}
                    <input className={cn(input, "mt-1")} value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    {t("booking.phone")}
                    <input className={cn(input, "mt-1")} dir="ltr" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} placeholder="03XX XXXXXXX" />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    {t("booking.line1")}
                    <input className={cn(input, "mt-1")} value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    {t("booking.area")}
                    <input className={cn(input, "mt-1")} value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    {t("booking.city")}
                    <input className={cn(input, "mt-1")} value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-muted sm:col-span-2">
                    <input type="checkbox" checked={addr.save} onChange={(e) => setAddr({ ...addr, save: e.target.checked })} className="accent-ink" /> {t("booking.saveAddress")}
                  </label>
                </div>
              )}
              <label className="mt-5 block text-sm">
                {t("booking.notes")} <span className="text-faint">({t("common.optional")})</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 1000))} placeholder={t("booking.notesPlaceholder")} className={cn(input, "mt-1 h-24 py-2.5")} />
              </label>
            </Card>
          </div>
        )}

        {/* Step 5 — payment */}
        {step === 4 && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-medium">{t("booking.paymentTitle")}</h2>
              {props.testMode && <Badge tone="warning">{t("common.testMode")}</Badge>}
            </div>
            <div className="mt-5 grid gap-3">
              {METHODS.map(({ id, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setMethod(id)} className={cn("flex items-center gap-4 rounded-2xl border p-4 text-start transition", method === id ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong")}>
                  <span className={cn("grid size-11 place-items-center rounded-xl", method === id ? "bg-ink text-paper" : "bg-sand text-ink")}>
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium">{t(`payment.${id}`)}</span>
                    <span className="block text-sm text-muted">{t(`payment.${id}Hint`)}</span>
                  </span>
                  <span className={cn("ms-auto size-5 rounded-full border-2", method === id ? "border-ink bg-ink shadow-[inset_0_0_0_3px_var(--color-paper)]" : "border-line-strong")} />
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">{t("booking.secureNote")}</p>
          </Card>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="rtl:rotate-180" /> {t("common.back")}
          </Button>
          {step < 4 ? (
            <Button onClick={() => go(step + 1)} size="lg">
              {t("common.continue")} <ChevronRight className="rtl:rotate-180" />
            </Button>
          ) : (
            <ActionForm action={placeOrderAction}>
              <input type="hidden" name="payload" value={payload} />
              <SubmitButton size="lg" variant="emerald" pendingText={t("booking.placing")}>
                <Scissors /> {method === "cod" ? t("booking.placeOrder") : t("booking.payAndPlace")}
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-6">
          <h3 className="font-semibold">{t("booking.summary")}</h3>
          <p className="text-sm text-muted">{props.tailor.shopName}</p>
          <ul className="mt-4 space-y-3 text-sm">
            {selected.length === 0 && <li className="text-muted">{t("booking.selectAtLeastOne")}</li>}
            {selected.map((d) => {
              const l = lines[d.id];
              const f = fabricSource === "store" && l.fabricId ? fabricById.get(l.fabricId) : undefined;
              return (
                <li key={d.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">
                      {l.quantity} × {d.title}
                    </span>
                    {f && (
                      <span className="block truncate text-xs text-muted">
                        {f.name} · {l.meters} m
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatPrice(d.price * l.quantity + (f ? Math.round(f.pricePerMeter * l.meters * l.quantity) : 0), locale)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t("booking.stitching")}</dt>
              <dd className="tabular-nums">{formatPrice(money.stitchingTotal, locale)}</dd>
            </div>
            {money.fabricTotal > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">{t("booking.fabric")}</dt>
                <dd className="tabular-nums">{formatPrice(money.fabricTotal, locale)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">{fabricSource === "own" ? t("booking.delivery") : t("booking.deliveryOnly")}</dt>
              <dd className="tabular-nums">{formatPrice(money.deliveryFee, locale)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>{t("booking.total")}</dt>
              <dd className="tabular-nums">{formatPrice(selected.length ? money.total : 0, locale)}</dd>
            </div>
          </dl>
          {slotDate && (
            <p className="mt-4 rounded-xl bg-emerald-soft px-3 py-2 text-xs text-emerald">
              {t("orders.slot")}: {formatDate(slotDate, locale, { weekday: "short", day: "numeric", month: "short" })}
            </p>
          )}
        </Card>
      </aside>
    </div>
  );
}
