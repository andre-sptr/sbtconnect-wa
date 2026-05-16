import { requireApiSession } from "@/lib/auth";
import { getWahaConfig, publicGuardrailConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  let wahaConfigured = true;
  let wahaUrl = "";
  let wahaSession = "";
  try {
    const config = getWahaConfig();
    wahaUrl = config.url;
    wahaSession = config.session;
  } catch {
    wahaConfigured = false;
  }
  const lock = await prisma.wahaSendLock.findUnique({ where: { key: "global" } });
  return Response.json({
    guardrails: publicGuardrailConfig(),
    waha: { configured: wahaConfigured, url: wahaUrl, session: wahaSession },
    lock,
  });
}
