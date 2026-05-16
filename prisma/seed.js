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
        name: "Sapaan Pagi (Greeting)",
        body: "Halo {firstName}, {pagi_siang_sore}. Saya {senderName} dari HRD ingin menyapa rekan-rekan semua. Semoga hari ini menyenangkan!",
        category: "greeting",
      },
      {
        userId: hrd.id,
        name: "Reminder Absensi",
        body: "Halo {firstName}, {pagi_siang_sore}. Mohon jangan lupa lengkapi absensi {day}, {date} sebelum pukul 17.00 ya. Terima kasih.\n\n- {senderName}",
        category: "reminder",
      },
      {
        userId: hrd.id,
        name: "Permintaan Feedback",
        body: "Halo {firstName}, apakah ada kendala dalam pekerjaan hari ini? Mohon berikan feedback singkat untuk kami tindaklanjuti.",
        category: "survey",
      },
      {
        userId: hrd.id,
        name: "Quick Reply Terima Kasih",
        body: "Sama-sama {firstName}, senang bisa membantu. Have a great {day}!",
        category: "reply",
      }
    );
  }

  if (manager) {
    templates.push(
      {
        userId: manager.id,
        name: "Follow-up Tugas",
        body: "Halo {firstName}, {pagi_siang_sore}. Izin follow-up progress {campaignName}. Jika ada kendala, mohon segera kabari saya ya.\n\n- {senderName}",
        category: "follow-up",
      },
      {
        userId: manager.id,
        name: "Reminder Rapat",
        body: "Halo {firstName}, diingatkan kembali ada rapat {campaignName} pada pukul {time} hari ini. Dimohon hadir tepat waktu.",
        category: "reminder",
      },
      {
        userId: manager.id,
        name: "Quick Reply Sedang Rapat",
        body: "Halo {firstName}, maaf saya sedang ada agenda. Nanti saya hubungi kembali ya. Terima kasih.",
        category: "reply",
      }
    );
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
