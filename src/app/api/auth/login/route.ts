import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE } from "@/lib/auth-cookie";
import { createSessionToken, verifyPassword } from "@/lib/auth-utils";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) {
    return Response.json({ error: "Username dan password wajib diisi." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "Username atau password salah." }, { status: 401 });
  }

  const token = createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role as "admin" | "hrd" | "manager",
  });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true });
}
