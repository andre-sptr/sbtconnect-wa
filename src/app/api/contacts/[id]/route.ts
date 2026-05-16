import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { id } = await params;
  const contactId = Number(id);
  const contact = await prisma.contact.findFirst({ where: { id: contactId, ...ownerFilter(session) } });
  if (!contact) return Response.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
  await prisma.contact.delete({ where: { id: contact.id } });
  await writeAudit({ userId: session.userId, entityType: "contact", entityId: contact.id, action: "delete", message: `Kontak ${contact.phone} dihapus.` });
  return Response.json({ ok: true });
}
