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
  const people = data.people;
  const total = data.totalQuestions;

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
        <button type="button" className="btn-text" onClick={() => router.refresh()}>
          Обновить
        </button>
      </div>
      <p className="lead">Кто вошёл в опрос и сколько ответов совпало с верными.</p>
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
