"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = ["", "", ""];

export default function Editor({ questions }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(EMPTY);
  const [correct, setCorrect] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [highlight, setHighlight] = useState(null);

  useEffect(() => {
    if (!highlight) return;
    document.getElementById(highlight)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [questions, highlight]);

  function updateOption(index, value) {
    setOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  function removeOption(index) {
    setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
    setCorrect((current) => {
      if (current === index) return 0;
      if (current > index) return current - 1;
      return current;
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, options, correctIndex: correct }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Не удалось добавить вопрос");
        return;
      }
      setPrompt("");
      setOptions(EMPTY);
      setCorrect(0);
      setNotice("Вопрос добавлен");
      setHighlight(data.id);
      router.refresh();
    } catch {
      setError("Нет связи");
    } finally {
      setPending(false);
    }
  }

  async function removeQuestion(id) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/questions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Не удалось удалить");
        return;
      }
      setConfirmId(null);
      router.refresh();
    } catch {
      setError("Нет связи");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1>Вопросы</h1>
      <p className="lead">Новый вопрос сразу появляется в опросе, в том порядке, как вы их добавляете.</p>
      <form className="form-block" style={{ marginTop: 16 }} onSubmit={onSubmit}>
        <textarea
          className="field"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Текст вопроса"
          aria-label="Текст вопроса"
          maxLength={500}
          required
        />
        <p className="hint">Кружок слева — верный ответ.</p>
        {options.map((option, index) => (
          <div className="opt-edit" key={index}>
            <button
              type="button"
              className={correct === index ? "mark on" : "mark"}
              aria-label={`Верный вариант ${index + 1}`}
              aria-pressed={correct === index}
              onClick={() => setCorrect(index)}
            >
              <i />
            </button>
            <input
              className="field"
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              placeholder={`Вариант ${index + 1}`}
              aria-label={`Вариант ${index + 1}`}
              maxLength={200}
              autoComplete="off"
              required
            />
            {options.length > 2 ? (
              <button type="button" className="icon-x" aria-label="Убрать вариант" onClick={() => removeOption(index)}>
                ×
              </button>
            ) : null}
          </div>
        ))}
        {options.length < 6 ? (
          <button type="button" className="btn btn-line" onClick={() => setOptions((current) => [...current, ""])}>
            Добавить вариант
          </button>
        ) : null}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Добавить вопрос"}
        </button>
        {error ? <p className="error" role="alert">{error}</p> : null}
        {notice ? <p className="notice" role="status">{notice}</p> : null}
      </form>

      <ul className="q-list">
        {questions.length === 0 ? <li className="empty">Пока пусто — вопросы появятся здесь.</li> : null}
        {questions.map((question, index) => (
          <li className="q-card" id={question.id} key={question.id}>
            <div className="q-head">
              <span className="num">{index + 1}</span>
              <p>{question.prompt}</p>
              {confirmId === question.id ? (
                <button type="button" className="btn-text" disabled={pending} onClick={() => removeQuestion(question.id)}>
                  Точно удалить
                </button>
              ) : (
                <button type="button" className="btn-text" onClick={() => setConfirmId(question.id)}>
                  Удалить
                </button>
              )}
            </div>
            <ul className="choices">
              {question.options.map((option, optionIndex) => (
                <li key={`${question.id}-${optionIndex}`} className={optionIndex === question.correctIndex ? "right" : ""}>
                  {option}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
