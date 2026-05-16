import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level")?.trim();
  const q = searchParams.get("q")?.trim();
  const logs = await prisma.auditLog.findMany({
    where: {
      ...ownerFilter(session),
      ...(level ? { level } : {}),
      ...(q ? { OR: [{ message: { contains: q } }, { action: { contains: q } }, { entityType: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return Response.json({ logs });
}
