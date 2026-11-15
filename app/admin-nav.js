export default function AdminNav({ current }) {
  return (
    <nav className="tabs">
      <a href="/results" aria-current={current === "results" ? "page" : undefined}>
        Результаты
      </a>
      <a href="/questions" aria-current={current === "questions" ? "page" : undefined}>
        Вопросы
      </a>
    </nav>
  );
}
