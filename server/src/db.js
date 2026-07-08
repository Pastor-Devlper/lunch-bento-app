import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'lunch.db');

import fs from 'node:fs';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    reminder_enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    attending INTEGER,
    meal TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(person_id, date)
  );
`);

const ROSTER = [
  '김철수', '이순신', '최민지', '박민준',
  '박영희', '장민석', '정지훈',
  '정한울', '이재훈',
];

const seedCount = db.prepare('SELECT COUNT(*) AS c FROM people').get().c;
if (seedCount === 0) {
  const insert = db.prepare('INSERT INTO people (name) VALUES (?)');
  const insertMany = db.transaction((names) => {
    for (const name of names) insert.run(name);
  });
  insertMany(ROSTER);
}
