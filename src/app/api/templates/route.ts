import { z } from "zod";
import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const templateSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2),
  body: z.string().trim().min(1),
  category: z.string().trim().default("reminder"),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const templates = await prisma.messageTemplate.findMany({
    where: ownerFilter(session),
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
  return Response.json({ templates });
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const parsed = templateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid." }, { status: 400 });
  }

  if (parsed.data.id) {
    const existing = await prisma.messageTemplate.findFirst({ where: { id: parsed.data.id, ...ownerFilter(session) } });
    if (!existing) return Response.json({ error: "Template tidak ditemukan." }, { status: 404 });
    const template = await prisma.messageTemplate.update({ where: { id: existing.id }, data: parsed.data });
    return Response.json({ template });
  }

  const template = await prisma.messageTemplate.create({ data: { ...parsed.data, userId: session.userId } });
  await writeAudit({ userId: session.userId, entityType: "template", entityId: template.id, action: "create", message: `Template "${template.name}" dibuat.` });
  return Response.json({ template }, { status: 201 });
}
