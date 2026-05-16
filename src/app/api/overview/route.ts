import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const where = ownerFilter(session);
  const [contacts, optedInContacts, campaigns, pendingMessages, failedMessages, latestInbound, nextCampaign] =
    await prisma.$transaction([
      prisma.contact.count({ where }),
      prisma.contact.count({ where: { ...where, optedIn: true, optedOut: false } }),
      prisma.campaign.count({ where }),
      prisma.outboundMessage.count({ where: { ...where, status: "pending" } }),
      prisma.outboundMessage.count({ where: { ...where, status: "failed" } }),
      prisma.inboundMessage.findMany({
        where,
        include: { contact: true, campaign: { select: { id: true, name: true } } },
        orderBy: { receivedAt: "desc" },
        take: 5,
      }),
      prisma.campaign.findFirst({
        where: { ...where, enabled: true, nextRunAt: { not: null } },
        orderBy: { nextRunAt: "asc" },
      }),
    ]);

  return Response.json({
    contacts,
    optedInContacts,
    campaigns,
    pendingMessages,
    failedMessages,
    latestInbound,
    nextCampaign,
  });
}
