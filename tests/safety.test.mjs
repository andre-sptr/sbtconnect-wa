import assert from "node:assert/strict";
import test from "node:test";

const {
  buildOutboundDedupeKey,
  canEnqueueBroadcast,
  getRandomizedDelayMs,
  isQuietHour,
} = await import("../src/lib/safety.ts");

test("buildOutboundDedupeKey changes when campaign, contact, or draft changes", () => {
  const base = buildOutboundDedupeKey({ campaignId: 1, contactId: 2, draftHash: "abc" });
  assert.equal(base, buildOutboundDedupeKey({ campaignId: 1, contactId: 2, draftHash: "abc" }));
  assert.notEqual(base, buildOutboundDedupeKey({ campaignId: 1, contactId: 3, draftHash: "abc" }));
  assert.notEqual(base, buildOutboundDedupeKey({ campaignId: 1, contactId: 2, draftHash: "def" }));
});

test("canEnqueueBroadcast requires opt-in and daily cap budget", () => {
  assert.deepEqual(canEnqueueBroadcast({ optedIn: true, optedOut: false, sentToday: 79, dailyCap: 80 }), {
    ok: true,
  });
  assert.deepEqual(canEnqueueBroadcast({ optedIn: false, optedOut: false, sentToday: 0, dailyCap: 80 }), {
    ok: false,
    reason: "contact_not_opted_in",
  });
  assert.deepEqual(canEnqueueBroadcast({ optedIn: true, optedOut: true, sentToday: 0, dailyCap: 80 }), {
    ok: false,
    reason: "contact_opted_out",
  });
  assert.deepEqual(canEnqueueBroadcast({ optedIn: true, optedOut: false, sentToday: 80, dailyCap: 80 }), {
    ok: false,
    reason: "daily_cap_reached",
  });
});

test("getRandomizedDelayMs keeps conservative 45-90 second window", () => {
  for (let index = 0; index < 50; index++) {
    const delay = getRandomizedDelayMs();
    assert.ok(delay >= 45_000, `delay too low: ${delay}`);
    assert.ok(delay <= 90_000, `delay too high: ${delay}`);
  }
});

test("isQuietHour blocks late night Asia/Jakarta sending", () => {
  assert.equal(isQuietHour(new Date("2026-05-16T16:30:00.000Z")), true); // 23:30 WIB
  assert.equal(isQuietHour(new Date("2026-05-16T03:00:00.000Z")), false); // 10:00 WIB
});
