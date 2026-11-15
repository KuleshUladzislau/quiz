import AdminNav from "../admin-nav";
import { listResults, publicError } from "@/lib/store";
import Board from "./board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Результаты",
  robots: { index: false, follow: false },
};

export default async function ResultsPage() {
  try {
    const data = await listResults();
    return (
      <main className="app app-admin">
        <AdminNav current="results" />
        <Board data={data} />
      </main>
    );
  } catch (err) {
    const error = publicError(err);
    return (
      <main className="app app-admin">
        <AdminNav current="results" />
        <h1>Результаты</h1>
        <p className="error" role="alert">{error.message}</p>
      </main>
    );
  }
}
