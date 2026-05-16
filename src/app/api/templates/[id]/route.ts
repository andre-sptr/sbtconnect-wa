import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { id } = await params;
  const templateId = Number(id);
  const template = await prisma.messageTemplate.findFirst({ where: { id: templateId, ...ownerFilter(session) } });
  if (!template) return Response.json({ error: "Template tidak ditemukan." }, { status: 404 });
  await prisma.messageTemplate.delete({ where: { id: template.id } });
  await writeAudit({ userId: session.userId, entityType: "template", entityId: template.id, action: "delete", message: `Template "${template.name}" dihapus.` });
  return Response.json({ ok: true });
}
