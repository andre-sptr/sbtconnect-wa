import { requireApiSession } from "@/lib/auth";
import { parseContactRows, uniqueContactRows } from "@/lib/contact-utils";
import { upsertContactRows } from "@/lib/broadcast-service";

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof Response) return session;
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  const rows = uniqueContactRows(parseContactRows(text));
  if (rows.length === 0) return Response.json({ error: "Tidak ada kontak valid untuk diimport." }, { status: 400 });
  const result = await upsertContactRows(session.userId, rows);
  return Response.json({ ...result, total: rows.length });
}
