import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log("Database connection successful. User count:", userCount);
    const users = await prisma.user.findMany({ select: { username: true, role: true, passwordHash: true } });
    console.log("Users in DB:", users);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
