import { z } from "zod";
import { requireApiSession, ownerFilter, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toJsonArray, parseJsonArray, syncCampaignRecipients, updateCampaignSchedule } from "@/lib/broadcast-service";
import { validateCronExpression } from "@/lib/cron-schedule";
import { reloadScheduler } from "@/lib/scheduler";
import { writeAudit } from "@/lib/audit";

const campaignSchema = z.object({
  name: z.string().trim().min(2),
  draft: z.string().trim().min(1),
  cronExpression: z.string().trim().optional().nullable(),
  timezone: z.string().trim().default("Asia/Jakarta"),
  enabled: z.boolean().default(false),
  audienceTags: z.array(z.string()).default([]),
  contactIds: z.array(z.number().int()).default([]),
});

async function getOwnedCampaign(id: number, session: SessionPayload) {
  return prisma.campaign.findFirst({ where: { id, ...ownerFilter(session) } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id: Number(id), ...ownerFilter(session) },
    include: { recipients: { include: { contact: true } } },
  });
  if (!campaign) return Response.json({ error: "Campaign tidak ditemukan." }, { status: 404 });
  return Response.json({
    campaign: {
      ...campaign,
      audienceTags: parseJsonArray(campaign.audienceTagsJson),
      contactIds: campaign.recipients.map((recipient) => recipient.contactId),
    },
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { id } = await params;
  const campaignId = Number(id);
  const existing = await getOwnedCampaign(campaignId, session);
  if (!existing) return Response.json({ error: "Campaign tidak ditemukan." }, { status: 404 });
  const parsed = campaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid." }, { status: 400 });
  }
  if (parsed.data.enabled && (!parsed.data.cronExpression || !validateCronExpression(parsed.data.cronExpression, parsed.data.timezone))) {
    return Response.json({ error: "Cron expression tidak valid." }, { status: 400 });
  }

  const contacts = await prisma.contact.findMany({
    where: { id: { in: parsed.data.contactIds }, userId: existing.userId },
    select: { id: true },
  });
  const campaign = await prisma.campaign.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      draft: parsed.data.draft,
      cronExpression: parsed.data.cronExpression || null,
      timezone: parsed.data.timezone,
      enabled: parsed.data.enabled,
      status: parsed.data.enabled ? "scheduled" : "draft",
      audienceTagsJson: toJsonArray(parsed.data.audienceTags),
    },
  });
  await syncCampaignRecipients(campaign.id, contacts.map((contact) => contact.id));
  await updateCampaignSchedule(campaign.id, campaign.cronExpression, campaign.timezone, campaign.enabled);
  await reloadScheduler();
  return Response.json({ campaign });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { id } = await params;
  const campaign = await getOwnedCampaign(Number(id), session);
  if (!campaign) return Response.json({ error: "Campaign tidak ditemukan." }, { status: 404 });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await reloadScheduler();
  await writeAudit({ userId: session.userId, entityType: "campaign", entityId: campaign.id, action: "delete", message: `Campaign "${campaign.name}" dihapus.` });
  return Response.json({ ok: true });
}
