import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/auth-cookie";

async function clearCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function POST() {
  await clearCookie();
  return Response.json({ ok: true });
}

export async function GET() {
  await clearCookie();
  redirect("/login");
}
