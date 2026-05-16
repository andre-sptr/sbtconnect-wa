import { prisma } from "@/lib/prisma";

export async function writeAudit(input: {
  userId?: number | null;
  level?: string;
  entityType?: string;
  entityId?: number | null;
  action: string;
  message: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      level: input.level ?? "info",
      entityType: input.entityType ?? "system",
      entityId: input.entityId ?? null,
      action: input.action,
      message: input.message,
    },
  });
}
