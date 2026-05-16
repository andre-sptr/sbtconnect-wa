import assert from "node:assert/strict";
import test from "node:test";

const { buildCron, getNextRunAt, validateCronExpression } = await import("../src/lib/cron-schedule.ts");

test("buildCron builds daily weekly and monthly expressions", () => {
  assert.equal(buildCron("daily", 8, 15, [], 1), "15 8 * * *");
  assert.equal(buildCron("weekly", 9, 5, ["1", "3"], 1), "5 9 * * 1,3");
  assert.equal(buildCron("monthly", 7, 0, [], 12), "0 7 12 * *");
});

test("validateCronExpression accepts valid cron and rejects invalid cron", () => {
  assert.equal(validateCronExpression("15 8 * * *", "Asia/Jakarta"), true);
  assert.equal(validateCronExpression("not cron", "Asia/Jakarta"), false);
});

test("getNextRunAt returns a future date for a valid expression", () => {
  const next = getNextRunAt("15 8 * * *", "Asia/Jakarta", new Date("2026-05-16T00:00:00.000Z"));
  assert.ok(next instanceof Date);
  assert.ok(next.getTime() > new Date("2026-05-16T00:00:00.000Z").getTime());
});
