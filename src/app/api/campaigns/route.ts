import { z } from "zod";
import { requireApiSession, ownerFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toJsonArray, syncCampaignRecipients, updateCampaignSchedule } from "@/lib/broadcast-service";
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

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const campaigns = await prisma.campaign.findMany({
    where: {
      ...ownerFilter(session),
      ...(q ? { OR: [{ name: { contains: q } }, { draft: { contains: q } }] } : {}),
    },
    include: {
      _count: { select: { recipients: true, outboundMessages: true, inboundMessages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return Response.json({ campaigns });
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const parsed = campaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Input tidak valid." }, { status: 400 });
  }
  if (parsed.data.enabled && (!parsed.data.cronExpression || !validateCronExpression(parsed.data.cronExpression, parsed.data.timezone))) {
    return Response.json({ error: "Cron expression tidak valid." }, { status: 400 });
  }

  const contacts = await prisma.contact.findMany({
    where: { id: { in: parsed.data.contactIds }, userId: session.userId },
    select: { id: true },
  });
  const campaign = await prisma.campaign.create({
    data: {
      userId: session.userId,
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
  await writeAudit({ userId: session.userId, entityType: "campaign", entityId: campaign.id, action: "create", message: `Campaign "${campaign.name}" dibuat.` });
  return Response.json({ campaign }, { status: 201 });
}
