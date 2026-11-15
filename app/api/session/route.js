import { cookies } from "next/headers";
import { PARTICIPANT_COOKIE, cookieBase } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getParticipant } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jar = await cookies();
    const participant = await getParticipant(jar.get(PARTICIPANT_COOKIE)?.value);
    if (!participant) return json({ error: "Нет записи" }, 401);
    return json(participant);
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.set(PARTICIPANT_COOKIE, "", { ...cookieBase(), maxAge: 0 });
  return json({ ok: true });
}
