import { cookies } from "next/headers";
import { PARTICIPANT_COOKIE } from "@/lib/auth";
import { fail, json, readBody } from "@/lib/http";
import { saveAnswer } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const jar = await cookies();
    const participantId = jar.get(PARTICIPANT_COOKIE)?.value;
    const body = await readBody(request);
    const quiz = await saveAnswer(participantId, body?.questionId, body?.selectedIndex);
    return json(quiz);
  } catch (err) {
    return fail(err);
  }
}
