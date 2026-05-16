import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runCampaign, processOutboundQueue } from "@/lib/broadcast-service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id: Number(id), ...ownerFilter(session) } });
  if (!campaign) return Response.json({ error: "Campaign tidak ditemukan." }, { status: 404 });
  const run = await runCampaign(campaign.id, campaign.userId, "manual");
  await processOutboundQueue(1);
  return Response.json({ run });
}
