import { chromium } from "playwright";
import fs from "node:fs";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3010";
const envText = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].trim().replace(/^"|"$/g, "")])
);
const smokeUsername = process.env.HRD_USERNAME || env.HRD_USERNAME;
const smokePassword = process.env.HRD_PASSWORD || env.HRD_PASSWORD;

if (!smokeUsername || !smokePassword) {
  throw new Error("HRD_USERNAME and HRD_PASSWORD must be configured for smoke test.");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Username").fill(smokeUsername);
  await page.getByLabel("Password").fill(smokePassword);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await page.getByRole("link", { name: "Contacts" }).click();
  await page.waitForURL("**/dashboard/contacts", { timeout: 15_000 });
  await page.getByRole("heading", { name: "Contacts" }).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: "Campaigns" }).click();
  await page.waitForURL("**/dashboard/campaigns", { timeout: 15_000 });
  await page.getByRole("heading", { name: "Campaigns" }).waitFor({ timeout: 10_000 });
  await page.screenshot({ path: "database/smoke-dashboard.png", fullPage: true });
} finally {
  await browser.close();
}
