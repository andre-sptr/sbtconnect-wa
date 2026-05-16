import { z } from "zod";
import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsappNumber } from "@/lib/contact-utils";
import { parseJsonArray, toJsonArray } from "@/lib/broadcast-service";
import { writeAudit } from "@/lib/audit";

const contactSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().default(""),
  phone: z.string().trim().min(1),
  team: z.string().trim().default(""),
  role: z.string().trim().default(""),
  tags: z.array(z.string()).default([]),
  optedIn: z.boolean().default(true),
  optedOut: z.boolean().default(false),
});

function contactDto(contact: {
  id: number;
  name: string;
  phone: string;
  team: string;
  role: string;
  tagsJson: string;
  optedIn: boolean;
  optedOut: boolean;
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  updatedAt: Date;
}) {
  return { ...contact, tags: parseJsonArray(contact.tagsJson) };
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const where = {
    ...ownerFilter(session),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { team: { contains: q } },
            { role: { contains: q } },
            { tagsJson: { contains: q } },
          ],
        }
      : {}),
  };
  const contacts = await prisma.contact.findMany({ where, orderBy: [{ updatedAt: "desc" }], take: 300 });
  return Response.json({ contacts: contacts.map(contactDto) });
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid." }, { status: 400 });
  }
  const phone = normalizeWhatsappNumber(parsed.data.phone);
  if (!phone) return Response.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });

  if (parsed.data.id) {
    const existing = await prisma.contact.findFirst({ where: { id: parsed.data.id, ...ownerFilter(session) } });
    if (!existing) return Response.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        phone,
        team: parsed.data.team,
        role: parsed.data.role,
        tagsJson: toJsonArray(parsed.data.tags),
        optedIn: parsed.data.optedIn,
        optedOut: parsed.data.optedOut,
      },
    });
    await writeAudit({ userId: session.userId, entityType: "contact", entityId: contact.id, action: "update", message: `Kontak ${phone} diperbarui.` });
    return Response.json({ contact: contactDto(contact) });
  }

  const contact = await prisma.contact.upsert({
    where: { userId_phone: { userId: session.userId, phone } },
    create: {
      userId: session.userId,
      name: parsed.data.name,
      phone,
      team: parsed.data.team,
      role: parsed.data.role,
      tagsJson: toJsonArray(parsed.data.tags),
      optedIn: parsed.data.optedIn,
      optedOut: parsed.data.optedOut,
    },
    update: {
      name: parsed.data.name,
      team: parsed.data.team,
      role: parsed.data.role,
      tagsJson: toJsonArray(parsed.data.tags),
      optedIn: parsed.data.optedIn,
      optedOut: parsed.data.optedOut,
    },
  });
  await writeAudit({ userId: session.userId, entityType: "contact", entityId: contact.id, action: "upsert", message: `Kontak ${phone} disimpan.` });
  return Response.json({ contact: contactDto(contact) }, { status: 201 });
}
