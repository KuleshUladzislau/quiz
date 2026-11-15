"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ruNoun } from "@/lib/plural";

function formatWhen(iso) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function LocalTime({ iso }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(formatWhen(iso));
  }, [iso]);
  return <time dateTime={iso}>{text || "…"}</time>;
}

function choiceText(options, index) {
  if (index == null || index < 0 || index >= options.length) return "нет ответа";
  return options[index];
}

export default function Board({ data }) {
  const router = useRouter();
  const [openId, setOpenId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const people = data.people;
  const total = data.totalQuestions;

  async function clearAll() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/results", { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || "Не удалось очистить результаты");
        return;
      }
      setOpenId(null);
      setConfirmClear(false);
      router.refresh();
    } catch {
      setError("Нет связи");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <>
      <div className="title-row">
        <h1>Результаты</h1>
        <div className="title-actions">
          {confirmClear ? (
            <>
              <button type="button" className="btn-text" onClick={() => setConfirmClear(false)} disabled={pending}>
                Отмена
              </button>
              <button type="button" className="btn-text danger" onClick={clearAll} disabled={pending}>
                {pending ? "Очищаем…" : "Точно очистить"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-text danger"
              onClick={() => setConfirmClear(true)}
              disabled={people.length === 0 || pending}
            >
              Очистить
            </button>
          )}
          <button type="button" className="btn-text" onClick={() => router.refresh()}>
            Обновить
          </button>
        </div>
      </div>
      <p className="lead">Кто вошёл в опрос и сколько ответов совпало с верными. Нажмите на человека, чтобы открыть профиль.</p>
      {confirmClear ? (
        <p className="hint">Удалятся все участники и их ответы. Вопросы останутся.</p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="stats">
        <div className="stat">
          <b>{people.length}</b>
          <span>{ruNoun(people.length, "человек", "человека", "человек")}</span>
        </div>
        <div className="stat">
          <b>{total}</b>
          <span>{ruNoun(total, "вопрос", "вопроса", "вопросов")}</span>
        </div>
      </div>
      <div className="sheet">
        {people.length === 0 ? (
          <p className="empty">Пока никто не представился.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th className="score-col">Верно</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => {
                const open = openId === person.id;
                const partial = person.answered < total;
                return (
                  <Fragment key={person.id}>
                    <tr
                      className="person"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : person.id)}
                    >
                      <td className="name-cell">
                        {person.name}
                        <LocalTime iso={person.createdAt} />
                        <span className="device-line">{person.device || "Устройство не записано"}</span>
                        <button
                          type="button"
                          className="profile-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenId(open ? null : person.id);
                          }}
                        >
                          {open ? "Скрыть профиль" : "Профиль"}
                        </button>
                      </td>
                      <td className="score-col">
                        {person.correct}
                        <span> из {total}</span>
                        {partial ? <span className="partial">сдано {person.answered}</span> : null}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="detail">
                        <td colSpan={2}>
                          <article className="profile">
                            <p className="eyebrow">Профиль</p>
                            <h2>{person.name}</h2>
                            <dl className="profile-facts">
                              <div>
                                <dt>Зашёл</dt>
                                <dd>
                                  <LocalTime iso={person.createdAt} />
                                </dd>
                              </div>
                              <div>
                                <dt>Устройство</dt>
                                <dd>{person.device || "Не записано"}</dd>
                              </div>
                              {person.userAgent ? (
                                <div>
                                  <dt>Браузер</dt>
                                  <dd className="ua">{person.userAgent}</dd>
                                </div>
                              ) : null}
                              <div>
                                <dt>Результат</dt>
                                <dd>
                                  {person.correct} из {total}
                                  {partial ? `, сдано ${person.answered}` : ""}
                                </dd>
                              </div>
                            </dl>
                          </article>
                          <ul className="mini">
                            {person.review.map((item) => {
                              const missed = item.selected == null;
                              return (
                                <li key={item.id} className={missed ? "miss" : item.ok ? "ok" : "bad"}>
                                  <strong>{item.prompt}</strong>
                                  <em>ответ: {choiceText(item.options, item.selected)}</em>
                                  {!item.ok ? <em>верно: {choiceText(item.options, item.correctIndex)}</em> : null}
                                </li>
                              );
                            })}
                            {person.review.length === 0 ? <li>Вопросов ещё нет.</li> : null}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
