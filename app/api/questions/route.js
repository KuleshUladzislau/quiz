import { adminStatus } from "@/lib/auth";
import { fail, json, readBody } from "@/lib/http";
import { addQuestion, deleteQuestion } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function allowed(request) {
  return (await adminStatus(request)).ok;
}

export async function POST(request) {
  try {
    if (!(await allowed(request))) return json({ error: "Нет доступа" }, 401);
    const body = await readBody(request);
    const question = await addQuestion(body);
    return json(question, 201);
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(request) {
  try {
    if (!(await allowed(request))) return json({ error: "Нет доступа" }, 401);
    const id = new URL(request.url).searchParams.get("id");
    await deleteQuestion(id);
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
