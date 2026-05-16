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
  const values: Record<string, string> = {
    campaignName: context.campaignName,
    senderName: context.senderName,
    name: context.contact.name?.trim() || "Rekan",
    phone: stripWahaSuffix(context.contact.phone),
    team: context.contact.team?.trim() || "-",
    role: context.contact.role?.trim() || "-",
    date: formatDate(now),
    datetime: formatDateTime(now),
  };

  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, key: string) => values[key] ?? match);
}

export function templateHash(template: string) {
  const normalized = template.trim().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}
