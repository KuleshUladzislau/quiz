"use client";

import { useEffect, useState } from "react";
import { ruNoun } from "@/lib/plural";

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];

function readLocalId() {
  try {
    return localStorage.getItem("quiz_pid") || "";
  } catch {
    return "";
  }
}

function writeLocalId(id) {
  try {
    localStorage.setItem("quiz_pid", id);
  } catch {
    /* телефон мог запретить хранилище — запись в куке всё равно создана */
  }
}

function optionText(options, index) {
  if (index == null || index < 0 || index >= options.length) return "Нет ответа";
  return options[index];
}

export default function QuizClient() {
  const [screen, setScreen] = useState("loading");
  const [nameInput, setNameInput] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const localId = readLocalId();
      if (!localId) {
        if (!cancelled) setScreen("name");
        return;
      }
      const session = await fetch("/api/session");
      if (!session.ok) {
        if (!cancelled) setScreen("name");
        return;
      }
      const person = await session.json();
      if (person.id !== localId) {
        if (!cancelled) setScreen("name");
        return;
      }
      const quizResponse = await fetch("/api/quiz");
      const data = await quizResponse.json();
      if (cancelled) return;
      if (!quizResponse.ok) {
        setScreen("name");
        return;
      }
      openQuiz(data);
    }

    boot().catch(() => {
      if (!cancelled) {
        setError("Не удалось открыть опрос");
        setScreen("name");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen !== "quiz" || !quiz) return;
    setDraft(quiz.questions[index]?.selected ?? null);
  }, [screen, index, quiz]);

  useEffect(() => {
    if (screen === "loading") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen, index]);

  function openQuiz(data) {
    setQuiz(data);
    setError("");
    setLeaving(false);
    if (data.total === 0) setScreen("empty");
    else if (data.completed) setScreen("done");
    else {
      const open = data.questions.findIndex((question) => question.selected == null);
      setIndex(open === -1 ? 0 : open);
      setScreen("quiz");
    }
  }

  async function onName(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Не удалось сохранить имя");
        return;
      }
      writeLocalId(data.id);
      const quizResponse = await fetch("/api/quiz");
      const quizData = await quizResponse.json();
      if (!quizResponse.ok) {
        setError(quizData.error || "Не удалось открыть вопросы");
        return;
      }
      openQuiz(quizData);
    } catch {
      setError("Нет связи. Попробуйте ещё раз");
    } finally {
      setPending(false);
    }
  }

  async function submitCurrent() {
    const question = quiz.questions[index];
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: question.id, selectedIndex: draft }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Ответ не сохранился");
        if (response.status === 401) setScreen("name");
        return;
      }
      setQuiz(data);
      if (data.completed) {
        setScreen("done");
        return;
      }
      const next = data.questions.findIndex((item) => item.selected == null);
      setIndex(next === -1 ? index : next);
    } catch {
      setError("Нет связи. Ответ не сохранился");
    } finally {
      setPending(false);
    }
  }

  async function reloadQuiz() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/quiz");
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Не удалось открыть вопросы");
        if (response.status === 401) setScreen("name");
        return;
      }
      openQuiz(data);
    } catch {
      setError("Нет связи");
    } finally {
      setPending(false);
    }
  }

  async function switchName() {
    setPending(true);
    try {
      await fetch("/api/session", { method: "DELETE" });
      try {
        localStorage.removeItem("quiz_pid");
      } catch {
        /* ignore */
      }
      setQuiz(null);
      setNameInput("");
      setLeaving(false);
      setScreen("name");
    } finally {
      setPending(false);
    }
  }

  if (screen === "loading") {
    return (
      <main className="app">
        <div className="loading-wrap">
          <div className="spinner" role="status" aria-label="Загрузка" />
        </div>
      </main>
    );
  }

  if (screen === "name") {
    return (
      <main className="app">
        <section className="stage-center">
          <p className="eyebrow">Квиз</p>
          <h1>Как вас зовут?</h1>
          <p className="lead">Имя сохранится вместе с ответами. Его увидит только ведущий.</p>
          <form className="stack" onSubmit={onName}>
            <input
              className="field"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Имя"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="go"
              maxLength={40}
              aria-label="Ваше имя"
              required
            />
            <button className="btn" type="submit" disabled={pending || !nameInput.trim()}>
              {pending ? "Сохраняем…" : "Начать"}
            </button>
            {error ? <p className="error" role="alert">{error}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  if (screen === "empty") {
    return (
      <main className="app">
        <section className="stage-center">
          <p className="eyebrow">{quiz.participant.name}</p>
          <h1>Вопросов пока нет</h1>
          <p className="lead">Вы уже в списке. Зайдите позже — опрос ещё собирают.</p>
          <button type="button" className="btn" style={{ marginTop: 18 }} disabled={pending} onClick={() => reloadQuiz()}>
            {pending ? "Проверяем…" : "Проверить ещё раз"}
          </button>
          <LeaveName leaving={leaving} pending={pending} onAsk={() => setLeaving(true)} onYes={switchName} />
        </section>
      </main>
    );
  }

  if (screen === "done") {
    const caption = ruNoun(quiz.correct, "верный ответ", "верных ответа", "верных ответов");
    return (
      <main className="app">
        <p className="eyebrow">{quiz.participant.name}</p>
        <div className="score-block">
          <p className="score">
            {quiz.correct}
            <small>из {quiz.total}</small>
          </p>
          <p className="lead">{caption}</p>
        </div>
        <ul className="review">
          {quiz.review.map((item) => {
            const missed = item.selected == null;
            return (
              <li key={item.id} className={missed ? "miss" : item.ok ? "ok" : "bad"}>
                <p className="q">{item.prompt}</p>
                <p className="a">Ваш ответ: {optionText(item.options, item.selected)}</p>
                {!item.ok ? <p className="right">Правильно: {optionText(item.options, item.correctIndex)}</p> : null}
              </li>
            );
          })}
        </ul>
        <LeaveName leaving={leaving} pending={pending} onAsk={() => setLeaving(true)} onYes={switchName} />
      </main>
    );
  }

  const question = quiz.questions[index];
  const last = index === quiz.questions.length - 1 && quiz.questions.every((item, itemIndex) => itemIndex === index || item.selected != null);

  return (
    <main className="app">
      <section className="quiz">
        <header className="top">
          <span className="who-name">{quiz.participant.name}</span>
          <span className="count">{index + 1} из {quiz.total}</span>
        </header>
        <div
          className="bar"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={quiz.total}
          aria-valuenow={index + 1}
          aria-label="Прогресс опроса"
        >
          <span style={{ width: `${((index + 1) / quiz.total) * 100}%` }} />
        </div>
        <div className="rise" key={question.id}>
          <h1 className="prompt">{question.prompt}</h1>
          <div className="options">
            {question.options.map((option, optionIndex) => (
              <button
                key={`${question.id}-${optionIndex}`}
                type="button"
                className="option"
                aria-pressed={draft === optionIndex}
                onClick={() => setDraft(optionIndex)}
              >
                <span className="letter">{LETTERS[optionIndex]}</span>
                <span className="label">{option}</span>
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <div className="dock">
          {index > 0 ? (
            <button type="button" className="btn btn-ghost" aria-label="Назад" onClick={() => setIndex(index - 1)} disabled={pending}>
              ←
            </button>
          ) : null}
          <button type="button" className="btn" disabled={draft == null || pending} onClick={submitCurrent}>
            {pending ? "Сохраняем…" : last ? "Готово" : "Дальше"}
          </button>
        </div>
      </section>
    </main>
  );
}

function LeaveName({ leaving, pending, onAsk, onYes }) {
  if (leaving) {
    return (
      <button type="button" className="btn btn-line" style={{ marginTop: 18 }} disabled={pending} onClick={onYes}>
        Да, создать новую запись
      </button>
    );
  }
  return (
    <button type="button" className="btn-text" style={{ marginTop: 8 }} onClick={onAsk}>
      Сменить имя
    </button>
  );
}
