import { cookies } from "next/headers";
import { PARTICIPANT_COOKIE, cookieBase } from "@/lib/auth";
import { fail, json, readBody } from "@/lib/http";
import { createParticipant } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await readBody(request);
    const participant = await createParticipant(body?.name);
    const jar = await cookies();
    jar.set(PARTICIPANT_COOKIE, participant.id, {
      ...cookieBase(),
      maxAge: 60 * 60 * 24 * 180,
    });
    return json(participant, 201);
  } catch (err) {
    return fail(err);
  }
}
