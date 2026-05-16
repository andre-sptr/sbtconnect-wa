import assert from "node:assert/strict";
import test from "node:test";

const { renderMessageTemplate, templateHash } = await import("../src/lib/template-utils.ts");

test("renderMessageTemplate replaces campaign and contact placeholders", () => {
  const rendered = renderMessageTemplate(
    "Halo {name}, reminder {campaignName} untuk tim {team}. Dari {senderName}. Nomor {phone}.",
    {
      campaignName: "Absensi Mei",
      senderName: "HRD",
      contact: {
        name: "Ani",
        phone: "6281234567890@c.us",
        team: "People",
        role: "Staff",
      },
      now: new Date("2026-05-16T01:30:00.000Z"),
    }
  );

  assert.equal(rendered, "Halo Ani, reminder Absensi Mei untuk tim People. Dari HRD. Nomor 6281234567890.");
});

test("renderMessageTemplate leaves unknown placeholders readable and strips @c.us for phone", () => {
  const rendered = renderMessageTemplate("Halo {name}, kode {unknown}, {date}", {
    campaignName: "Reminder",
    senderName: "Atasan",
    contact: { name: "", phone: "6281234567890@c.us", team: "", role: "" },
    now: new Date("2026-05-16T01:30:00.000Z"),
  });

  assert.match(rendered, /^Halo Rekan, kode \{unknown\}, 16 Mei 2026$/);
});

test("templateHash is stable for semantically identical draft text", () => {
  assert.equal(templateHash(" Halo Ani \n\n"), templateHash("Halo Ani"));
  assert.notEqual(templateHash("Halo Ani"), templateHash("Halo Budi"));
});
