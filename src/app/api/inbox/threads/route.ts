import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/broadcast-service";

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const campaignId = Number(searchParams.get("campaignId") || 0) || undefined;
  const unreadOnly = searchParams.get("unread") === "1";

  const andFilters = [
    {
      OR: [
        { inboundMessages: { some: {} } },
        { outboundMessages: { some: {} } },
      ],
    },
    ...(q
      ? [
          {
            OR: [
              { name: { contains: q } },
              { phone: { contains: q } },
              { team: { contains: q } },
              { role: { contains: q } },
            ],
          },
        ]
      : []),
    ...(campaignId
      ? [
          {
            OR: [
              { inboundMessages: { some: { campaignId } } },
              { outboundMessages: { some: { campaignId } } },
            ],
          },
        ]
      : []),
    ...(unreadOnly ? [{ inboundMessages: { some: { readAt: null } } }] : []),
  ];

  const contacts = await prisma.contact.findMany({
    where: { ...ownerFilter(session), AND: andFilters },
    include: {
      inboundMessages: { orderBy: { receivedAt: "desc" }, take: 30, include: { campaign: { select: { id: true, name: true } } } },
      outboundMessages: { orderBy: { createdAt: "desc" }, take: 30, include: { campaign: { select: { id: true, name: true } } } },
    },
    orderBy: [{ lastInboundAt: "desc" }, { lastOutboundAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const threads = contacts.map((contact) => {
    const inbound = contact.inboundMessages.map((message) => ({
      id: `in-${message.id}`,
      direction: "inbound",
      text: message.text,
      at: message.receivedAt,
      status: "received",
      campaign: message.campaign,
      unread: !message.readAt,
    }));
    const outbound = contact.outboundMessages.map((message) => ({
      id: `out-${message.id}`,
      direction: "outbound",
      text: message.text,
      at: message.sentAt || message.createdAt,
      status: message.status,
      campaign: message.campaign,
      unread: false,
    }));
    const messages = [...inbound, ...outbound].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return {
      contact: { ...contact, tags: parseJsonArray(contact.tagsJson) },
      unreadCount: contact.inboundMessages.filter((message) => !message.readAt).length,
      lastMessage: messages[messages.length - 1] || null,
      messages,
    };
  });

  return Response.json({ threads });
}
