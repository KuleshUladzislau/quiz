import { adminStatus } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { clearResults } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request) {
  try {
    if (!(await adminStatus(request)).ok) return json({ error: "Нет доступа" }, 401);
    await clearResults();
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
