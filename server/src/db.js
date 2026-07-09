import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'lunch.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const DEPARTMENTS = [
  '총무국', '출판국', '지운국', '훈련국', 'Pearl', 'YRG', 'Kids', '방문',
];

db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL DEFAULT '방문',
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

const columns = db.prepare('PRAGMA table_info(people)').all().map((c) => c.name);
if (!columns.includes('department')) {
  db.exec("ALTER TABLE people ADD COLUMN department TEXT NOT NULL DEFAULT '방문'");
}

const ROSTER = [
  ['총무국', '권준호'], ['총무국', '김효선'], ['총무국', '심태석'],
  ['출판국', '김만석'], ['출판국', '김하경'], ['출판국', '김하솜'],
  ['지운국', '한상규'],
  ['훈련국', '김해수'], ['훈련국', '유남희'],
  ['Pearl', '서영수'],
  ['YRG', '유소현'],
  ['Kids', '권은미'],
];

const insert = db.prepare('INSERT OR IGNORE INTO people (name, department) VALUES (?, ?)');
const insertMany = db.transaction((rows) => {
  for (const [department, name] of rows) insert.run(name, department);
});
insertMany(ROSTER);
