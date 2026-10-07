import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { env } from "@/server/env";
import { AppError } from "@/server/lib/errors";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

/**
 * File storage. Images are validated by their real bytes (magic numbers),
 * not by the client-supplied MIME type or extension.
 * - S3/R2 configured → uploaded to the bucket, served from S3_PUBLIC_URL/CDN.
 * - Otherwise → written to ./storage/uploads and served by app/uploads/[...key]/route.ts
 *   (single-server setups only; serverless disks are ephemeral — use S3/R2 there).
 */
type Kind = { ext: "jpg" | "png" | "webp"; mime: string };

function sniff(buf: Uint8Array): Kind | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)
    return { ext: "webp", mime: "image/webp" };
  return null;
}

let s3: AwsClient | null = null;
function s3Client() {
  s3 ??= new AwsClient({
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    region: env.S3_REGION,
    service: "s3",
  });
  return s3;
}

export const LOCAL_ROOT = path.join(process.cwd(), "storage", "uploads");

export function isFile(v: unknown): v is File {
  return typeof File !== "undefined" && v instanceof File && v.size > 0;
}

export async function saveImage(file: File, folder: "designs" | "fabrics" | "avatars" | "covers" | "chat" | "tryon", opts?: { pngOnly?: boolean }) {
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("fileTooLarge", 413);
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind || (opts?.pngOnly && kind.ext !== "png")) throw new AppError("fileType", 415);

  const now = new Date();
  const key = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${kind.ext}`;

  if (env.features.s3) {
    const endpoint = env.S3_ENDPOINT?.replace(/\/$/, "") ?? `https://s3.${env.S3_REGION}.amazonaws.com`;
    const res = await s3Client().fetch(`${endpoint}/${env.S3_BUCKET}/${key}`, {
      method: "PUT",
      body: buf,
      headers: { "Content-Type": kind.mime, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return `${(env.S3_PUBLIC_URL ?? `${endpoint}/${env.S3_BUCKET}`).replace(/\/$/, "")}/${key}`;
  }

  const dest = path.join(LOCAL_ROOT, key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return `/uploads/${key}`;
}
