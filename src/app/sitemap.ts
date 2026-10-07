import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { tailorProfiles } from "@/server/db/schema";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const tailors = await db
    .select({ slug: tailorProfiles.slug, updatedAt: tailorProfiles.updatedAt })
    .from(tailorProfiles)
    .where(eq(tailorProfiles.status, "approved"))
    .limit(45000)
    .catch(() => []); // DB unreachable at build time → static entries only
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/try-on`, changeFrequency: "daily", priority: 0.6 },
    ...tailors.map((t) => ({ url: `${base}/tailors/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
