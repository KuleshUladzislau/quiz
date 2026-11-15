import { problem, publicError } from "./store";

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function fail(err) {
  const error = publicError(err);
  return json({ error: error.message }, error.status || 500);
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    throw problem("Некорректный запрос");
  }
}
