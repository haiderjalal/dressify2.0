import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, assertSameOrigin, handle } from "@/server/lib/api";
import { saveSubscription } from "@/server/modules/notifications/service";
import { AppError } from "@/server/lib/errors";

const schema = z.object({ endpoint: z.url().max(1000).startsWith("https://"), keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }) });

export function POST(req: Request) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await apiUser();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("invalid", 400);
    await saveSubscription(user.id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
