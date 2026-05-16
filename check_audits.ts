import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const audits = await prisma.auditLog.findMany({
    where: { 
      OR: [
        { action: "webhook_auth_failed" },
        { action: "webhook_received" },
        { action: "received" }
      ]
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  console.log("Relevant Audits:", JSON.stringify(audits, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
