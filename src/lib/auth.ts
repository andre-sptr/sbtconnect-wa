import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/auth-cookie";
import { prisma } from "@/lib/prisma";
import { verifyTokenSignature, type SessionPayload } from "@/lib/auth-utils";

export { AUTH_COOKIE };
export type { SessionPayload };

export async function verifySessionToken(token?: string): Promise<SessionPayload | null> {
  const payload = verifyTokenSignature(token);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) return null;

  return payload;
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/api/auth/logout");
  return session;
}

export async function requireApiSession(): Promise<SessionPayload | Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

export function ownerFilter(session: SessionPayload) {
  return session.role === "admin" ? {} : { userId: session.userId };
}

export function canAccessOwner(session: SessionPayload, userId: number) {
  return session.role === "admin" || session.userId === userId;
}
