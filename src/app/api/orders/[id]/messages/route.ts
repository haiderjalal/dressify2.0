import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, assertSameOrigin, handle } from "@/server/lib/api";
import { listMessages, sendMessage } from "@/server/modules/chat/service";
import { rateLimit } from "@/server/security/rate-limit";
import { AppError } from "@/server/lib/errors";

type Ctx = { params: Promise<{ id: string }> };
const uuid = z.uuid();

export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await apiUser();
    const { id } = await ctx.params;
    if (!uuid.safeParse(id).success) throw new AppError("notFound", 404);
    const after = new URL(req.url).searchParams.get("after");
    const afterOk = after && !Number.isNaN(Date.parse(after)) ? after : undefined;
    const messages = await listMessages(user, id, afterOk);
    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
  });
}

const bodySchema = z.object({ body: z.string().trim().min(1).max(2000) });

export function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    assertSameOrigin(req);
    const user = await apiUser();
    const { id } = await ctx.params;
    if (!uuid.safeParse(id).success) throw new AppError("notFound", 404);
    await rateLimit("chat", user.id, 30, 60);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new AppError("invalid", 400);
    const message = await sendMessage(user, id, parsed.data.body);
    return NextResponse.json({ message }, { status: 201 });
  });
}
