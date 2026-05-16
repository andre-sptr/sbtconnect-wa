import assert from "node:assert/strict";
import test from "node:test";

const {
  normalizeWhatsappNumber,
  parseContactRows,
  uniqueContactRows,
} = await import("../src/lib/contact-utils.ts");

test("normalizeWhatsappNumber converts local Indonesian numbers to WAHA chat ids", () => {
  assert.equal(normalizeWhatsappNumber("0812 3456 7890"), "6281234567890@c.us");
  assert.equal(normalizeWhatsappNumber("+62-812-3456-7890"), "6281234567890@c.us");
  assert.equal(normalizeWhatsappNumber("6281234567890@c.us"), "6281234567890@c.us");
});

test("normalizeWhatsappNumber rejects empty, short, and non-numeric input", () => {
  assert.equal(normalizeWhatsappNumber(""), null);
  assert.equal(normalizeWhatsappNumber("123"), null);
  assert.equal(normalizeWhatsappNumber("nomor hrd"), null);
});

test("parseContactRows reads paste or csv rows with optional metadata", () => {
  const rows = parseContactRows(`
name,phone,team,role,tags,optIn
Ani,081234567890,People,Staff,onboarding;training,true
Budi,+62 813 1111 2222,Sales,Lead,reminder,false
081455566677
`);

  assert.deepEqual(rows.map((row) => row.phone), [
    "6281234567890@c.us",
    "6281311112222@c.us",
    "6281455566677@c.us",
  ]);
  assert.equal(rows[0].name, "Ani");
  assert.equal(rows[0].team, "People");
  assert.deepEqual(rows[0].tags, ["onboarding", "training"]);
  assert.equal(rows[0].optedIn, true);
  assert.equal(rows[1].optedIn, false);
  assert.equal(rows[2].name, "");
});

test("uniqueContactRows keeps first contact per normalized phone", () => {
  const rows = uniqueContactRows(parseContactRows("Ani,081234567890\nDuplicate,+6281234567890"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Ani");
});
