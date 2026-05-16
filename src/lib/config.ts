export function getWahaConfig() {
  const url = process.env.WAHA_URL;
  const session = process.env.WAHA_SESSION;
  const apiKey = process.env.WAHA_API_KEY;
  if (!url || !session || !apiKey) {
    throw new Error("WAHA_URL, WAHA_SESSION, and WAHA_API_KEY must be configured server-side.");
  }
  return { url: url.replace(/\/$/, ""), session, apiKey };
}

export function getWebhookToken() {
  return process.env.WAHA_WEBHOOK_TOKEN || "";
}

export function publicGuardrailConfig() {
  return {
    dailyCap: 80,
    minDelaySeconds: 30,
    maxDelaySeconds: 60,
    quietHours: "22:00-06:00 Asia/Jakarta",
    sessionMode: "single",
  };
}
