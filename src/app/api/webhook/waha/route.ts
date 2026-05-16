import { getWebhookToken } from "@/lib/config";
import { handleWahaInbound } from "@/lib/broadcast-service";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const configuredToken = getWebhookToken();
  const providedToken = request.headers.get("x-webhook-token") || new URL(request.url).searchParams.get("token") || "";
  if (configuredToken && providedToken !== configuredToken) {
    console.warn(`WAHA Webhook Forbidden: provided token "${providedToken}" does not match configured token.`);
    await writeAudit({
      level: "error",
      entityType: "system",
      action: "webhook_auth_failed",
      message: `WAHA Webhook Forbidden: Token mismatch. Provided: ${providedToken ? "present" : "missing"}`,
    });
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const result = await handleWahaInbound(body);
  return Response.json(result);
}
