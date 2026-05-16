import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const inbounds = await prisma.inboundMessage.findMany({
    take: 10,
    orderBy: { receivedAt: "desc" },
    include: { contact: true },
  });
  console.log("Recent Inbounds:", JSON.stringify(inbounds, null, 2));
  
  const audits = await prisma.auditLog.findMany({
    where: { entityType: "inbound" },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  console.log("Inbound Audits:", JSON.stringify(audits, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
