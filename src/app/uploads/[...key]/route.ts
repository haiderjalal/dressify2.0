import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_ROOT } from "@/server/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves locally stored uploads (used when S3/R2 is not configured). */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const rel = key.join("/");
  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  // Only our own generated file names: folder/yyyy/mm/uuid.ext — blocks path traversal.
  if (!/^[a-z]+\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(rel) || !TYPES[ext]) return new Response("Not found", { status: 404 });
  const file = path.join(LOCAL_ROOT, rel);
  if (!file.startsWith(LOCAL_ROOT + path.sep)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": TYPES[ext], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
