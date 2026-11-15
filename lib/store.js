import fs from "fs/promises";
import path from "path";
import { isId } from "./auth";

const FILE = path.join(process.cwd(), "data", "db.json");

export function problem(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function publicError(err) {
  if (err?.status) return err;
  console.error(err);
  const text = String(err?.message || "");
  if (/ECONNREFUSED|ENOTFOUND|28P01|3D000|password authentication|getaddrinfo|certificate/i.test(text)) {
    return problem("Не получилось подключиться к базе. Проверьте DATABASE_URL.", 503);
  }
  return problem("Не получилось сохранить данные", 500);
}

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function mode() {
  if (databaseUrl()) return "pg";
  if (process.env.VERCEL) {
    throw problem(
      "Добавьте DATABASE_URL — строку подключения Postgres (Neon, Supabase или Vercel Postgres). На Vercel локальный файл не сохраняется.",
      503
    );
  }
  return "file";
}

let pgClientPromise = null;

async function sqlClient() {
  if (!pgClientPromise) {
    pgClientPromise = (async () => {
      const postgres = (await import("postgres")).default;
      const url = databaseUrl();
      const local = /localhost|127\.0\.0\.1/.test(url);
      const sql = postgres(url, {
        max: 1,
        prepare: false,
        idle_timeout: 20,
        ssl: local ? false : "require",
      });
      await sql`
        create table if not exists participants (
          id text primary key,
          name text not null,
          created_at timestamptz not null default now()
        )`;
      await sql`
        create table if not exists questions (
          id text primary key,
          prompt text not null,
          options jsonb not null,
          correct_index integer not null,
          created_at timestamptz not null default now()
        )`;
      await sql`
        create table if not exists answers (
          participant_id text not null references participants(id) on delete cascade,
          question_id text not null references questions(id) on delete cascade,
          selected_index integer not null,
          primary key (participant_id, question_id)
        )`;
      return sql;
    })().catch((err) => {
      pgClientPromise = null;
      throw err;
    });
  }
  return pgClientPromise;
}

function emptyStore() {
  return { participants: [], questions: [], answers: [] };
}

async function readFileStore() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw);
    return {
      participants: Array.isArray(data.participants) ? data.participants : [],
      questions: Array.isArray(data.questions) ? data.questions : [],
      answers: Array.isArray(data.answers) ? data.answers : [],
    };
  } catch (err) {
    if (err.code === "ENOENT") return emptyStore();
    throw err;
  }
}

async function writeFileStore(data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  try {
    await fs.rename(tmp, FILE);
  } catch {
    await fs.rm(FILE, { force: true });
    await fs.rename(tmp, FILE);
  }
}

let queue = Promise.resolve();

function exclusive(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => {},
    () => {}
  );
  return run;
}

function mapPerson(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt || new Date(row.created_at).toISOString(),
  };
}

function mapQuestion(row) {
  const options = typeof row.options === "string" ? JSON.parse(row.options) : row.options;
  return {
    id: row.id,
    prompt: row.prompt,
    options,
    correctIndex: row.correctIndex ?? row.correct_index,
    createdAt: row.createdAt || new Date(row.created_at).toISOString(),
  };
}

function mapAnswer(row) {
  return {
    participantId: row.participantId || row.participant_id,
    questionId: row.questionId || row.question_id,
    selectedIndex: row.selectedIndex ?? row.selected_index,
  };
}

function byCreated(a, b) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

async function readAll() {
  if (mode() === "pg") {
    const sql = await sqlClient();
    const participants = await sql`select id, name, created_at from participants`;
    const questions = await sql`
      select id, prompt, options, correct_index, created_at
      from questions
      order by created_at asc, id asc`;
    const answers = await sql`select participant_id, question_id, selected_index from answers`;
    return {
      participants: participants.map(mapPerson),
      questions: questions.map(mapQuestion),
      answers: answers.map(mapAnswer),
    };
  }

  const data = await readFileStore();
  return {
    participants: data.participants.map(mapPerson),
    questions: data.questions.map(mapQuestion).sort(byCreated),
    answers: data.answers.map(mapAnswer),
  };
}

function cleanName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!name || name.length > 40 || /[\u0000-\u001F]/.test(name)) {
    throw problem("Введите имя — до 40 символов");
  }
  return name;
}

function cleanQuestion(input) {
  const prompt = String(input?.prompt || "").trim();
  if (prompt.length < 2 || prompt.length > 500) throw problem("Введите текст вопроса");
  const raw = Array.isArray(input?.options) ? input.options : [];
  if (raw.length < 2 || raw.length > 6) throw problem("Нужно от 2 до 6 вариантов");
  const options = raw.map((option) => String(option || "").trim());
  if (options.some((option) => !option || option.length > 200)) {
    throw problem("Заполните каждый вариант, до 200 символов");
  }
  if (new Set(options).size !== options.length) throw problem("Варианты не должны повторяться");
  const correctIndex = input?.correctIndex;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    throw problem("Отметьте верный вариант");
  }
  return { prompt, options, correctIndex };
}

function presentQuiz(participant, questions, answers) {
  const selected = new Map(
    answers.filter((item) => item.participantId === participant.id).map((item) => [item.questionId, item.selectedIndex])
  );
  const total = questions.length;
  const answered = questions.filter((question) => selected.has(question.id)).length;
  const completed = total > 0 && answered === total;
  let correct = 0;
  const review = completed
    ? questions.map((question) => {
        const choice = selected.get(question.id);
        const ok = choice === question.correctIndex;
        if (ok) correct += 1;
        return {
          id: question.id,
          prompt: question.prompt,
          options: question.options,
          selected: choice,
          correctIndex: question.correctIndex,
          ok,
        };
      })
    : null;

  return {
    participant: { id: participant.id, name: participant.name },
    total,
    completed,
    correct: completed ? correct : null,
    questions: questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
      selected: selected.has(question.id) ? selected.get(question.id) : null,
    })),
    review,
  };
}

function shapeResults(participants, questions, answers) {
  const people = participants.map((person) => {
    const mine = new Map(
      answers.filter((item) => item.participantId === person.id).map((item) => [item.questionId, item.selectedIndex])
    );
    let correct = 0;
    const review = questions.map((question) => {
      const has = mine.has(question.id);
      const choice = has ? mine.get(question.id) : null;
      const ok = has && choice === question.correctIndex;
      if (ok) correct += 1;
      return {
        id: question.id,
        prompt: question.prompt,
        options: question.options,
        selected: choice,
        correctIndex: question.correctIndex,
        ok,
      };
    });
    return {
      id: person.id,
      name: person.name,
      createdAt: person.createdAt,
      correct,
      answered: review.filter((item) => item.selected != null).length,
      review,
    };
  });

  people.sort((a, b) => b.correct - a.correct || a.createdAt.localeCompare(b.createdAt));
  return { totalQuestions: questions.length, people };
}

export async function createParticipant(name) {
  const row = {
    id: crypto.randomUUID(),
    name: cleanName(name),
    createdAt: new Date().toISOString(),
  };

  if (mode() === "pg") {
    const sql = await sqlClient();
    await sql`insert into participants (id, name, created_at) values (${row.id}, ${row.name}, ${row.createdAt})`;
  } else {
    await exclusive(async () => {
      const data = await readFileStore();
      data.participants.push(row);
      await writeFileStore(data);
    });
  }

  return { id: row.id, name: row.name };
}

export async function getParticipant(id) {
  if (!isId(id)) return null;
  const { participants } = await readAll();
  const person = participants.find((item) => item.id === id);
  return person ? { id: person.id, name: person.name } : null;
}

export async function getQuiz(participantId) {
  if (!isId(participantId)) return null;
  const { participants, questions, answers } = await readAll();
  const person = participants.find((item) => item.id === participantId);
  if (!person) return null;
  return presentQuiz(person, questions, answers);
}

export async function saveAnswer(participantId, questionId, selectedIndex) {
  if (!isId(participantId)) throw problem("Сначала представьтесь", 401);
  if (!isId(questionId)) throw problem("Вопрос не найден", 404);
  if (!Number.isInteger(selectedIndex)) throw problem("Выберите вариант");

  const apply = (snapshot) => {
    const person = snapshot.participants.find((item) => item.id === participantId);
    if (!person) throw problem("Сначала представьтесь", 401);
    const question = snapshot.questions.find((item) => item.id === questionId);
    if (!question) throw problem("Вопрос не найден", 404);
    if (selectedIndex < 0 || selectedIndex >= question.options.length) throw problem("Такого варианта нет");

    const own = snapshot.answers.filter((item) => item.participantId === participantId);
    const state = presentQuiz(person, snapshot.questions, own);
    const already = own.find((item) => item.questionId === questionId);
    if (already && state.completed) throw problem("Опрос уже завершён");

    const nextAnswers = already
      ? snapshot.answers.map((item) =>
          item.participantId === participantId && item.questionId === questionId
            ? { ...item, selectedIndex }
            : item
        )
      : [...snapshot.answers, { participantId, questionId, selectedIndex }];

    return { nextAnswers, state: presentQuiz(person, snapshot.questions, nextAnswers) };
  };

  if (mode() === "pg") {
    const snapshot = await readAll();
    const { nextAnswers, state } = apply(snapshot);
    const sql = await sqlClient();
    const saved = nextAnswers.find((item) => item.participantId === participantId && item.questionId === questionId);
    await sql`
      insert into answers (participant_id, question_id, selected_index)
      values (${participantId}, ${questionId}, ${saved.selectedIndex})
      on conflict (participant_id, question_id)
      do update set selected_index = excluded.selected_index`;
    return state;
  }

  return exclusive(async () => {
    const data = await readFileStore();
    const snapshot = {
      participants: data.participants.map(mapPerson),
      questions: data.questions.map(mapQuestion).sort(byCreated),
      answers: data.answers.map(mapAnswer),
    };
    const { nextAnswers, state } = apply(snapshot);
    data.answers = nextAnswers;
    await writeFileStore(data);
    return state;
  });
}

export async function listQuestions() {
  const { questions } = await readAll();
  return questions;
}

export async function addQuestion(input) {
  const clean = cleanQuestion(input);
  const row = { id: crypto.randomUUID(), ...clean, createdAt: new Date().toISOString() };

  if (mode() === "pg") {
    const sql = await sqlClient();
    await sql`
      insert into questions (id, prompt, options, correct_index, created_at)
      values (${row.id}, ${row.prompt}, ${sql.json(row.options)}, ${row.correctIndex}, ${row.createdAt})`;
  } else {
    await exclusive(async () => {
      const data = await readFileStore();
      data.questions.push(row);
      await writeFileStore(data);
    });
  }

  return row;
}

export async function deleteQuestion(id) {
  if (!isId(id)) throw problem("Вопрос не найден", 404);

  if (mode() === "pg") {
    const sql = await sqlClient();
    const rows = await sql`delete from questions where id = ${id} returning id`;
    if (!rows.length) throw problem("Вопрос не найден", 404);
    return;
  }

  await exclusive(async () => {
    const data = await readFileStore();
    const next = data.questions.filter((question) => question.id !== id);
    if (next.length === data.questions.length) throw problem("Вопрос не найден", 404);
    data.questions = next;
    data.answers = data.answers.filter((answer) => answer.questionId !== id);
    await writeFileStore(data);
  });
}

export async function listResults() {
  const { participants, questions, answers } = await readAll();
  return shapeResults(participants, questions, answers);
}
