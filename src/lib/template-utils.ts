import { createHash } from "node:crypto";

type TemplateContact = {
  name?: string | null;
  phone: string;
  team?: string | null;
  role?: string | null;
};

type RenderContext = {
  campaignName: string;
  senderName: string;
  contact: TemplateContact;
  now?: Date;
};

function formatDate(now: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(now);
}

function formatDateTime(now: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(now);
}

function stripWahaSuffix(phone: string) {
  return phone.replace(/@c\.us$/i, "");
}

export function renderMessageTemplate(template: string, context: RenderContext) {
  const now = context.now ?? new Date();
  const hour = now.getHours();
  let salutation = "Selamat Malam";
  if (hour >= 3 && hour < 11) salutation = "Selamat Pagi";
  else if (hour >= 11 && hour < 15) salutation = "Selamat Siang";
  else if (hour >= 15 && hour < 18) salutation = "Selamat Sore";

  const dateStr = formatDate(now);
  const timeStr = new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: "Asia/Jakarta" }).format(now);
  const dayStr = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(now);

  const name = context.contact.name?.trim() || "Rekan";
  const firstName = name.split(" ")[0];

  const values: Record<string, string> = {
    campaignName: context.campaignName,
    senderName: context.senderName,
    name: name,
    firstName: firstName,
    phone: stripWahaSuffix(context.contact.phone),
    team: context.contact.team?.trim() || "-",
    role: context.contact.role?.trim() || "-",
    date: dateStr,
    time: timeStr,
    datetime: `${dateStr} ${timeStr}`,
    day: dayStr,
    salutation: salutation,
    pagi_siang_sore: salutation,
  };

  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, key: string) => values[key] ?? match);
}

export function templateHash(template: string) {
  const normalized = template.trim().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}
