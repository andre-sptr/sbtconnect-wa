import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getSeedAccounts } = require("../prisma/seed-config.cjs");

test("getSeedAccounts reads all seed credentials from env", () => {
  const accounts = getSeedAccounts({
    ADMIN_USERNAME: "root",
    ADMIN_PASSWORD: "secret-admin",
    HRD_USERNAME: "people",
    HRD_PASSWORD: "secret-hrd",
    ATASAN_USERNAME: "leader",
    ATASAN_PASSWORD: "secret-atasan",
  });

  assert.deepEqual(accounts, [
    { key: "admin", role: "admin", username: "root", password: "secret-admin" },
    { key: "hrd", role: "hrd", username: "people", password: "secret-hrd" },
    { key: "atasan", role: "manager", username: "leader", password: "secret-atasan" },
  ]);
});

test("getSeedAccounts fails when a credential is missing", () => {
  assert.throws(
    () => getSeedAccounts({ ADMIN_USERNAME: "root" }),
    /ADMIN_PASSWORD must be configured in \.env/
  );
});
