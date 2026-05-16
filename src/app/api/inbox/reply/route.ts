import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { enqueueManualReply, processOutboundQueue } from "@/lib/broadcast-service";

const replySchema = z.object({
  contactId: z.number().int(),
  text: z.string().trim().min(1),
  templateId: z.number().int().nullable().optional(),
});

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid." }, { status: 400 });
  }
  const outbound = await enqueueManualReply({
    userId: session.userId,
    contactId: parsed.data.contactId,
    text: parsed.data.text,
    templateId: parsed.data.templateId,
  });
  await processOutboundQueue(1);
  return Response.json({ outbound });
}
