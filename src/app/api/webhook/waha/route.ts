import { getWebhookToken } from "@/lib/config";
import { handleWahaInbound } from "@/lib/broadcast-service";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const configuredToken = getWebhookToken();
    const providedToken = request.headers.get("x-webhook-token") || new URL(request.url).searchParams.get("token") || "";
    if (configuredToken && providedToken !== configuredToken) {
      console.warn(`WAHA Webhook Forbidden: provided token "${providedToken}" does not match configured token.`);
      await writeAudit({
        level: "error",
        entityType: "system",
        action: "webhook_auth_failed",
        message: `WAHA Webhook Forbidden: Token mismatch.`,
      });
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

    await writeAudit({
      level: "info",
      entityType: "system",
      action: "webhook_received",
      message: `Received WAHA webhook event: ${body.event}`,
    });

    const result = await handleWahaInbound(body);
    
    if (result.skipped) {
      await writeAudit({
        level: "info",
        entityType: "system",
        action: "webhook_skipped",
        message: `Webhook skipped: ${result.reason || "no specific reason"}`,
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error("Webhook Error:", error);
    await writeAudit({
      level: "error",
      entityType: "system",
      action: "webhook_error",
      message: `Error processing webhook: ${error instanceof Error ? error.message : String(error)}`,
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
