import AdminNav from "../admin-nav";
import { listQuestions, publicError } from "@/lib/store";
import Editor from "./editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Вопросы",
  robots: { index: false, follow: false },
};

export default async function QuestionsPage() {
  try {
    const questions = await listQuestions();
    return (
      <main className="app app-admin">
        <AdminNav current="questions" />
        <Editor questions={questions} />
      </main>
    );
  } catch (err) {
    const error = publicError(err);
    return (
      <main className="app app-admin">
        <AdminNav current="questions" />
        <h1>Вопросы</h1>
        <p className="error" role="alert">{error.message}</p>
      </main>
    );
  }
}
