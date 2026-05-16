import { createHash } from "node:crypto";

export const DEFAULT_DAILY_CAP = 80;
export const MIN_SEND_DELAY_MS = 45_000;
export const MAX_SEND_DELAY_MS = 90_000;

export function buildOutboundDedupeKey(input: { campaignId: number; contactId: number; draftHash: string }) {
  return createHash("sha256")
    .update(`${input.campaignId}:${input.contactId}:${input.draftHash}`)
    .digest("hex")
    .slice(0, 32);
}

export function canEnqueueBroadcast(input: {
  optedIn: boolean;
  optedOut: boolean;
  sentToday: number;
  dailyCap?: number;
}):
  | { ok: true }
  | { ok: false; reason: "contact_not_opted_in" | "contact_opted_out" | "daily_cap_reached" } {
  if (!input.optedIn) return { ok: false, reason: "contact_not_opted_in" };
  if (input.optedOut) return { ok: false, reason: "contact_opted_out" };
  if (input.sentToday >= (input.dailyCap ?? DEFAULT_DAILY_CAP)) return { ok: false, reason: "daily_cap_reached" };
  return { ok: true };
}

export function getRandomizedDelayMs() {
  return MIN_SEND_DELAY_MS + Math.floor(Math.random() * (MAX_SEND_DELAY_MS - MIN_SEND_DELAY_MS + 1));
}

export function isQuietHour(now = new Date()) {
  const hourText = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(now);
  const hour = Number(hourText);
  return hour >= 22 || hour < 6;
}

export function todayStartJakarta(now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${date}T00:00:00+07:00`);
}
