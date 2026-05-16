const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { getSeedAccounts } = require("./seed-config.cjs");

const prisma = new PrismaClient();

async function upsertUser(username, role, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { username },
    update: { role, passwordHash, isActive: true },
    create: { username, role, passwordHash },
  });
}

async function main() {
  const seededUsers = new Map();
  for (const account of getSeedAccounts()) {
    seededUsers.set(account.key, await upsertUser(account.username, account.role, account.password));
  }

  const hrd = seededUsers.get("hrd");
  const manager = seededUsers.get("atasan");

  const templates = [];

  if (hrd) {
    templates.push(
      {
        userId: hrd.id,
        name: "Reminder Absensi",
        body: "Halo {name}, mohon lengkapi absensi hari ini sebelum pukul 17.00. Terima kasih.\n\n- {senderName}",
        category: "reminder",
      },
      {
        userId: hrd.id,
        name: "Quick Reply Terima Kasih",
        body: "Terima kasih infonya, {name}. Kami catat ya.",
        category: "reply",
      }
    );
  }

  if (manager) {
    templates.push({
      userId: manager.id,
      name: "Follow-up Tugas",
      body: "Halo {name}, reminder untuk progress {campaignName}. Jika ada kendala, mohon balas pesan ini.\n\n- {senderName}",
      category: "follow-up",
    });
  }

  for (const template of templates) {
    const existing = await prisma.messageTemplate.findFirst({
      where: { userId: template.userId, name: template.name },
    });
    if (existing) {
      await prisma.messageTemplate.update({ where: { id: existing.id }, data: template });
    } else {
      await prisma.messageTemplate.create({ data: template });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
