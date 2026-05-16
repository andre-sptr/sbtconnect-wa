import { getWebhookToken } from "@/lib/config";
import { handleWahaInbound } from "@/lib/broadcast-service";

export async function POST(request: Request) {
  const configuredToken = getWebhookToken();
  const providedToken = request.headers.get("x-webhook-token") || new URL(request.url).searchParams.get("token") || "";
  if (configuredToken && providedToken !== configuredToken) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const result = await handleWahaInbound(body);
  return Response.json(result);
}
