"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { AUDIENCES, GARMENT_CATEGORIES } from "@/lib/constants";

/** Plain GET form (works without JS); selects auto-submit when JS is on. */
export function ExploreFilters(p: { q: string; category?: string; audience?: string; women: boolean; sort: string; hasGeo: boolean; hidden: Record<string, string> }) {
  const { t, tx } = useI18n();
  const router = useRouter();
  const submit = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v) params.set(k, v);
    router.push(`/explore?${params}`);
  };
  const sel = "h-11 rounded-full border border-line-strong bg-paper px-4 pe-8 text-sm text-ink focus:border-ink/50 focus:outline-none";
  return (
    <form
      action="/explore"
      className="mt-8 flex flex-wrap items-center gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      onChange={(e) => {
        const el = e.target as unknown as HTMLInputElement;
        if (el.tagName !== "INPUT" || el.type === "checkbox") submit(e.currentTarget);
      }}
    >
      {Object.entries(p.hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="relative min-w-60 flex-1">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input name="q" defaultValue={p.q} placeholder={t("explore.searchPlaceholder")} className="h-11 w-full rounded-full border border-line-strong bg-paper ps-11 pe-4 text-sm placeholder:text-faint focus:border-ink/50 focus:outline-none" />
      </label>
      <select name="category" defaultValue={p.category ?? ""} className={sel} aria-label={t("explore.category")}>
        <option value="">{t("explore.category")}: {t("common.all")}</option>
        {GARMENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {tx(`categories.${c}`)}
          </option>
        ))}
      </select>
      <select name="audience" defaultValue={p.audience ?? ""} className={sel} aria-label={t("explore.audience")}>
        <option value="">{t("explore.audience")}: {t("common.all")}</option>
        {AUDIENCES.map((a) => (
          <option key={a} value={a}>
            {tx(`audiences.${a}`)}
          </option>
        ))}
      </select>
      <select name="sort" defaultValue={p.sort} className={sel} aria-label={t("explore.sortBy")}>
        <option value="recommended">{t("explore.sortRecommended")}</option>
        <option value="rating">{t("explore.sortRating")}</option>
        {p.hasGeo && <option value="distance">{t("explore.sortDistance")}</option>}
        <option value="price">{t("explore.sortPrice")}</option>
      </select>
      <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-paper px-4 text-sm has-[:checked]:border-gold has-[:checked]:bg-gold-soft has-[:checked]:text-gold-deep">
        <input type="checkbox" name="women" value="1" defaultChecked={p.women} className="accent-gold" />
        {t("explore.womenLed")}
      </label>
    </form>
  );
}
