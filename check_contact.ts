import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contact = await prisma.contact.findFirst();
  console.log("Sample Contact:", JSON.stringify(contact, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
