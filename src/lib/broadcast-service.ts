import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { normalizeWhatsappNumber, type ContactImportRow } from "@/lib/contact-utils";
import { getNextRunAt, validateCronExpression } from "@/lib/cron-schedule";
import {
  DEFAULT_DAILY_CAP,
  buildOutboundDedupeKey,
  canEnqueueBroadcast,
  getRandomizedDelayMs,
  isQuietHour,
  todayStartJakarta,
} from "@/lib/safety";
import { renderMessageTemplate, templateHash } from "@/lib/template-utils";
import { sendWahaText } from "@/lib/waha";

export function parseJsonArray(value?: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function toJsonArray(values: string[]) {
  return JSON.stringify(Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))));
}

export async function upsertContactRows(userId: number, rows: ContactImportRow[]) {
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.contact.findUnique({
      where: { userId_phone: { userId, phone: row.phone } },
      select: { id: true },
    });
    await prisma.contact.upsert({
      where: { userId_phone: { userId, phone: row.phone } },
      create: {
        userId,
        name: row.name,
        phone: row.phone,
        team: row.team,
        role: row.role,
        tagsJson: toJsonArray(row.tags),
        optedIn: row.optedIn,
      },
      update: {
        name: row.name,
        team: row.team,
        role: row.role,
        tagsJson: toJsonArray(row.tags),
        optedIn: row.optedIn,
        optedOut: row.optedIn ? false : undefined,
      },
    });
    if (existing) updated++;
    else created++;
  }

  await writeAudit({
    userId,
    entityType: "contact",
    action: "import",
    message: `Import kontak selesai: ${created} baru, ${updated} diperbarui.`,
  });
  return { created, updated };
}

export async function syncCampaignRecipients(campaignId: number, contactIds: number[]) {
  const uniqueIds = Array.from(new Set(contactIds));
  await prisma.campaignRecipient.deleteMany({
    where: { campaignId, contactId: { notIn: uniqueIds.length > 0 ? uniqueIds : [0] } },
  });
  if (uniqueIds.length === 0) return;
  for (const contactId of uniqueIds) {
    await prisma.campaignRecipient.upsert({
      where: { campaignId_contactId: { campaignId, contactId } },
      create: { campaignId, contactId },
      update: {},
    });
  }
}

export async function updateCampaignSchedule(campaignId: number, cronExpression: string | null, timezone: string, enabled: boolean) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      nextRunAt: enabled && cronExpression && validateCronExpression(cronExpression, timezone)
        ? getNextRunAt(cronExpression, timezone)
        : null,
    },
  });
}

function runDedupeKey(campaignId: number, source: string, draftHash: string, now = new Date()) {
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  return `campaign:${campaignId}:${source}:${draftHash}:${minuteBucket}`;
}

function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function runCampaign(campaignId: number, userId: number, source: "manual" | "scheduled") {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { user: true, recipients: { include: { contact: true } } },
  });
  if (!campaign) throw new Error("Campaign tidak ditemukan.");
  if (!campaign.draft.trim()) throw new Error("Draft pesan wajib diisi.");

  const draftHash = templateHash(campaign.draft);
  const dedupeKey = runDedupeKey(campaign.id, source, draftHash);
  let run;
  try {
    run = await prisma.sendRun.create({
      data: {
        campaignId: campaign.id,
        userId,
        source,
        dedupeKey,
        status: "running",
      },
    });
  } catch (error) {
    if (!isUniqueError(error)) throw error;
    const existing = await prisma.sendRun.findUnique({ where: { dedupeKey } });
    if (existing) return existing;
    throw error;
  }

  const selectedContacts =
    campaign.recipients.length > 0
      ? campaign.recipients.map((recipient) => recipient.contact)
      : await prisma.contact.findMany({ where: { userId, optedIn: true, optedOut: false }, orderBy: { name: "asc" } });

  const sentToday = await prisma.outboundMessage.count({
    where: { status: "sent", sentAt: { gte: todayStartJakarta() } },
  });

  let queuedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let accumulatedDelay = 0;

  for (const contact of selectedContacts) {
    const safety = canEnqueueBroadcast({
      optedIn: contact.optedIn,
      optedOut: contact.optedOut,
      sentToday: sentToday + queuedCount,
      dailyCap: DEFAULT_DAILY_CAP,
    });
    if (!safety.ok) {
      skippedCount++;
      await prisma.campaignRecipient.upsert({
        where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
        create: { campaignId: campaign.id, contactId: contact.id, status: safety.reason },
        update: { status: safety.reason },
      });
      continue;
    }

    accumulatedDelay += queuedCount === 0 ? 0 : getRandomizedDelayMs();
    const text = renderMessageTemplate(campaign.draft, {
      campaignName: campaign.name,
      senderName: campaign.user.username,
      contact,
    });
    const outboundDedupeKey = buildOutboundDedupeKey({ campaignId: campaign.id, contactId: contact.id, draftHash });

    try {
      const outbound = await prisma.outboundMessage.create({
        data: {
          userId,
          contactId: contact.id,
          campaignId: campaign.id,
          runId: run.id,
          type: "broadcast",
          text,
          dedupeKey: outboundDedupeKey,
          nextAttemptAt: new Date(Date.now() + accumulatedDelay),
        },
      });
      queuedCount++;
      await prisma.campaignRecipient.upsert({
        where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
        create: { campaignId: campaign.id, contactId: contact.id, status: "queued", lastOutboundId: outbound.id },
        update: { status: "queued", lastOutboundId: outbound.id },
      });
    } catch (error) {
      if (isUniqueError(error)) {
        skippedCount++;
      } else {
        failedCount++;
      }
    }
  }

  const status = failedCount > 0 ? "partial" : "queued";
  await prisma.sendRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt: new Date(),
      totalCount: selectedContacts.length,
      queuedCount,
      skippedCount,
      failedCount,
      errorSummary: failedCount > 0 ? "Sebagian pesan gagal dibuat. Lihat log." : null,
    },
  });
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status, lastRunAt: new Date() },
  });
  await writeAudit({
    userId,
    entityType: "campaign",
    entityId: campaign.id,
    action: "run",
    message: `Campaign "${campaign.name}" enqueue ${queuedCount} pesan, skip ${skippedCount}.`,
  });

  return prisma.sendRun.findUnique({ where: { id: run.id } });
}

export async function enqueueManualReply(input: {
  userId: number;
  contactId: number;
  text: string;
  templateId?: number | null;
}) {
  const contact = await prisma.contact.findFirst({ where: { id: input.contactId, userId: input.userId } });
  if (!contact) throw new Error("Kontak tidak ditemukan.");
  const normalizedText = input.text.trim();
  if (!normalizedText) throw new Error("Pesan balasan wajib diisi.");

  const dedupeKey = `reply:${input.userId}:${input.contactId}:${Date.now()}:${templateHash(normalizedText)}`;
  const outbound = await prisma.outboundMessage.create({
    data: {
      userId: input.userId,
      contactId: input.contactId,
      templateId: input.templateId ?? null,
      type: "reply",
      text: normalizedText,
      dedupeKey,
      nextAttemptAt: new Date(),
    },
  });
  await writeAudit({
    userId: input.userId,
    entityType: "contact",
    entityId: input.contactId,
    action: "reply_queued",
    message: `Balasan manual ke ${contact.phone} masuk queue.`,
  });
  return outbound;
}

async function acquireSendLock(owner: string) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + 30_000);
  return prisma.$transaction(async (tx) => {
    const lock = await tx.wahaSendLock.findUnique({ where: { key: "global" } });
    if (lock?.lockedUntil && lock.lockedUntil > now) return false;
    await tx.wahaSendLock.upsert({
      where: { key: "global" },
      create: { key: "global", owner, lockedUntil },
      update: { owner, lockedUntil },
    });
    return true;
  });
}

async function releaseSendLock(owner: string) {
  await prisma.wahaSendLock.updateMany({
    where: { key: "global", owner },
    data: { lockedUntil: null },
  });
}

export async function recoverStaleOutboundMessages() {
  const staleBefore = new Date(Date.now() - 2 * 60_000);
  return prisma.outboundMessage.updateMany({
    where: { status: "sending", lockedAt: { lt: staleBefore } },
    data: { status: "pending", lockedAt: null, error: "Recovered from stale sending lock." },
  });
}

async function autoPauseCampaign(campaignId: number | null) {
  if (!campaignId) return;
  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: { failureStreak: { increment: 1 } },
    select: { id: true, userId: true, name: true, failureStreak: true },
  });
  if (campaign.failureStreak >= 5) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { enabled: false, status: "paused" },
    });
    await writeAudit({
      userId: campaign.userId,
      level: "warning",
      entityType: "campaign",
      entityId: campaign.id,
      action: "auto_pause",
      message: `Campaign "${campaign.name}" di-pause otomatis karena gagal beruntun.`,
    });
  }
}

export async function processOutboundQueue(limit = 1) {
  await recoverStaleOutboundMessages();
  const owner = `worker-${process.pid}-${Date.now()}`;
  const locked = await acquireSendLock(owner);
  if (!locked) return { processed: 0, skipped: "locked" };

  let processed = 0;
  try {
    if (isQuietHour()) return { processed, skipped: "quiet_hour" };

    for (let index = 0; index < limit; index++) {
      const candidate = await prisma.outboundMessage.findFirst({
        where: { status: "pending", nextAttemptAt: { lte: new Date() } },
        orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
      });
      if (!candidate) break;

      const claimed = await prisma.outboundMessage.updateMany({
        where: { id: candidate.id, status: "pending" },
        data: { status: "sending", lockedAt: new Date(), attemptCount: { increment: 1 } },
      });
      if (claimed.count === 0) continue;

      const message = await prisma.outboundMessage.findUnique({
        where: { id: candidate.id },
        include: { contact: true, campaign: true },
      });
      if (!message) continue;

      try {
        const wahaMessageId = await sendWahaText({ chatId: message.contact.phone, text: message.text });
        await prisma.outboundMessage.update({
          where: { id: message.id },
          data: { status: "sent", sentAt: new Date(), lockedAt: null, error: null, wahaMessageId },
        });
        await prisma.contact.update({
          where: { id: message.contactId },
          data: { lastOutboundAt: new Date() },
        });
        if (message.campaignId) {
          await prisma.campaign.update({
            where: { id: message.campaignId },
            data: { failureStreak: 0, status: "sent" },
          });
          await prisma.campaignRecipient.updateMany({
            where: { campaignId: message.campaignId, contactId: message.contactId },
            data: { status: "sent", lastOutboundId: message.id },
          });
        }
        await writeAudit({
          userId: message.userId,
          entityType: "outbound",
          entityId: message.id,
          action: "sent",
          message: `Pesan terkirim ke ${message.contact.phone}.`,
        });
        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown WAHA error";
        const failedPermanently = message.attemptCount >= message.maxAttempts;
        await prisma.outboundMessage.update({
          where: { id: message.id },
          data: {
            status: failedPermanently ? "failed" : "pending",
            failedAt: failedPermanently ? new Date() : null,
            nextAttemptAt: failedPermanently ? message.nextAttemptAt : new Date(Date.now() + getRandomizedDelayMs()),
            lockedAt: null,
            error: errorMessage,
          },
        });
        if (message.campaignId) {
          await prisma.campaignRecipient.updateMany({
            where: { campaignId: message.campaignId, contactId: message.contactId },
            data: { status: failedPermanently ? "failed" : "retrying" },
          });
        }
        if (failedPermanently) await autoPauseCampaign(message.campaignId);
        await writeAudit({
          userId: message.userId,
          level: failedPermanently ? "error" : "warning",
          entityType: "outbound",
          entityId: message.id,
          action: failedPermanently ? "failed" : "retry",
          message: errorMessage.slice(0, 500),
        });
      }
    }
  } finally {
    await releaseSendLock(owner);
  }

  return { processed };
}

type WahaWebhookPayload = {
  event?: string;
  payload?: {
    body?: string;
    from?: string;
    fromMe?: boolean;
    id?: {
      _serialized?: string;
      remote?: string;
      fromMe?: boolean;
    };
  };
};

function isOptOutText(text: string) {
  return /^(stop|berhenti|unsubscribe|jangan kirim|cancel)$/i.test(text.trim());
}

export async function handleWahaInbound(payload: WahaWebhookPayload) {
  if (payload.event) {
    await writeAudit({
      level: "info",
      entityType: "system",
      action: "webhook_received",
      message: `WAHA Webhook: ${payload.event} for session ${ (payload as any).session || "unknown" }`,
    });
  }
  if (!payload.event?.startsWith("message")) return { ok: true, skipped: true };
  const message = payload.payload;
  const text = message?.body?.trim();
  const chatId = message?.id?.remote || message?.from || "";
  const fromMe = message?.id?.fromMe ?? message?.fromMe ?? false;
  const wahaMessageId = message?.id?._serialized || `${chatId}:${Date.now()}`;
  if (!text || !chatId || fromMe) return { ok: true, skipped: true };

  const normalizedPhone = normalizeWhatsappNumber(chatId);
  if (!normalizedPhone) return { ok: false, error: "Invalid inbound chat id" };

  const recentOutbound = await prisma.outboundMessage.findFirst({
    where: { contact: { phone: normalizedPhone } },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    include: { contact: true },
  });
  const contact =
    recentOutbound?.contact ||
    (await prisma.contact.findFirst({ where: { phone: normalizedPhone }, orderBy: { lastOutboundAt: "desc" } }));

  if (!contact) {
    await writeAudit({
      level: "warning",
      entityType: "inbound",
      action: "unmatched",
      message: `Inbound dari ${normalizedPhone} tidak cocok dengan kontak manapun.`,
    });
    return { ok: true, skipped: true, reason: "unmatched_contact" };
  }

  const inbound = await prisma.inboundMessage.upsert({
    where: { wahaMessageId },
    create: {
      userId: contact.userId,
      contactId: contact.id,
      campaignId: recentOutbound?.campaignId ?? null,
      wahaMessageId,
      chatId: normalizedPhone,
      text,
      receivedAt: new Date(),
    },
    update: {},
  });

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      lastInboundAt: new Date(),
      optedOut: isOptOutText(text) ? true : contact.optedOut,
    },
  });
  await writeAudit({
    userId: contact.userId,
    entityType: "inbound",
    entityId: inbound.id,
    action: "received",
    message: `Balasan diterima dari ${contact.name || contact.phone}.`,
  });

  return { ok: true, inboundId: inbound.id };
}
