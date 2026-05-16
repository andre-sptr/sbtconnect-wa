import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { getNextRunAt, validateCronExpression } from "@/lib/cron-schedule";
import { runCampaign, processOutboundQueue } from "@/lib/broadcast-service";
import { writeAudit } from "@/lib/audit";

const globalForScheduler = globalThis as unknown as {
  wahaBroadcastScheduler?: {
    initialized: boolean;
    campaignTasks: Map<number, ScheduledTask>;
    queueTimer?: NodeJS.Timeout;
    queueRunning: boolean;
  };
};

function getState() {
  if (!globalForScheduler.wahaBroadcastScheduler) {
    globalForScheduler.wahaBroadcastScheduler = {
      initialized: false,
      campaignTasks: new Map(),
      queueRunning: false,
    };
  }
  return globalForScheduler.wahaBroadcastScheduler;
}

async function tickQueue() {
  const state = getState();
  if (state.queueRunning) return;
  state.queueRunning = true;
  try {
    await processOutboundQueue(1);
  } catch (error) {
    await writeAudit({
      level: "error",
      action: "queue_tick_failed",
      message: error instanceof Error ? error.message : "Queue worker gagal.",
    });
  } finally {
    state.queueRunning = false;
  }
}

export async function reloadScheduler() {
  const state = getState();
  for (const task of state.campaignTasks.values()) task.stop();
  state.campaignTasks.clear();

  if (state.queueTimer) clearInterval(state.queueTimer);
  state.queueTimer = setInterval(tickQueue, 15_000);
  state.queueTimer.unref?.();

  const campaigns = await prisma.campaign.findMany({ where: { enabled: true } });
  for (const campaign of campaigns) {
    if (!campaign.cronExpression || !validateCronExpression(campaign.cronExpression, campaign.timezone)) {
      await writeAudit({
        userId: campaign.userId,
        level: "warning",
        entityType: "campaign",
        entityId: campaign.id,
        action: "schedule_skipped",
        message: "Cron expression tidak valid, scheduler dilewati.",
      });
      continue;
    }

    const task = cron.schedule(
      campaign.cronExpression,
      async () => {
        try {
          await runCampaign(campaign.id, campaign.userId, "scheduled");
          await processOutboundQueue(1);
        } catch (error) {
          await writeAudit({
            userId: campaign.userId,
            level: "error",
            entityType: "campaign",
            entityId: campaign.id,
            action: "scheduled_run_failed",
            message: error instanceof Error ? error.message : "Scheduled run gagal.",
          });
        } finally {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { nextRunAt: getNextRunAt(campaign.cronExpression!, campaign.timezone) },
          });
        }
      },
      { timezone: campaign.timezone }
    );

    state.campaignTasks.set(campaign.id, task);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { nextRunAt: getNextRunAt(campaign.cronExpression, campaign.timezone) },
    });
  }

  state.initialized = true;
}

export async function ensureScheduler() {
  const state = getState();
  if (!state.initialized) await reloadScheduler();
}
