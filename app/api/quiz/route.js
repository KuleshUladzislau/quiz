import { cookies } from "next/headers";
import { PARTICIPANT_COOKIE } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getQuiz } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jar = await cookies();
    const quiz = await getQuiz(jar.get(PARTICIPANT_COOKIE)?.value);
    if (!quiz) return json({ error: "Сначала представьтесь" }, 401);
    return json(quiz);
  } catch (err) {
    return fail(err);
  }
}
