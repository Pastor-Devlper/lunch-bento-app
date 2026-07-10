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

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    event_date TEXT,
    description TEXT,
    created_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    menu_enabled INTEGER NOT NULL DEFAULT 0,
    meal_enabled INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS event_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    attending INTEGER,
    note TEXT,
    menu_option TEXT,
    meal TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(event_id, person_id)
  );
`);

const columns = db.prepare('PRAGMA table_info(people)').all().map((c) => c.name);
if (!columns.includes('department')) {
  db.exec("ALTER TABLE people ADD COLUMN department TEXT NOT NULL DEFAULT '방문'");
}

const eventColumns = db.prepare('PRAGMA table_info(events)').all().map((c) => c.name);
if (!eventColumns.includes('menu_enabled')) {
  db.exec('ALTER TABLE events ADD COLUMN menu_enabled INTEGER NOT NULL DEFAULT 0');
}
if (!eventColumns.includes('meal_enabled')) {
  db.exec('ALTER TABLE events ADD COLUMN meal_enabled INTEGER NOT NULL DEFAULT 0');
}

const eventResponseColumns = db.prepare('PRAGMA table_info(event_responses)').all().map((c) => c.name);
if (!eventResponseColumns.includes('menu_option')) {
  db.exec('ALTER TABLE event_responses ADD COLUMN menu_option TEXT');
}
if (!eventResponseColumns.includes('meal')) {
  db.exec('ALTER TABLE event_responses ADD COLUMN meal TEXT');
}

const ROSTER = [
  ['총무국', '권준호'], ['총무국', '김효선'], ['총무국', '심태석'], ['총무국', '황시은'],
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

// One-time migration: fold the legacy single-date "responses" table into the
// first event, so past "화요일 점심" attendance isn't lost when moving to
// the multi-event model.
const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
const legacyResponses = db.prepare('SELECT COUNT(*) AS c FROM responses').get().c;
if (eventCount === 0 && legacyResponses > 0) {
  const migrateLegacyResponses = db.transaction(() => {
    const latestDate = db.prepare('SELECT MAX(date) AS date FROM responses').get().date;
    const now = new Date().toISOString();
    const eventId = db.prepare(`
      INSERT INTO events (title, event_date, description, created_by, created_at, meal_enabled)
      VALUES (?, ?, ?, NULL, ?, 1)
    `).run('화요일 점심', latestDate, null, now).lastInsertRowid;

    const latestPerPerson = db.prepare(`
      SELECT r.person_id AS personId, r.attending AS attending, r.meal AS meal
      FROM responses r
      INNER JOIN (
        SELECT person_id, MAX(date) AS maxDate FROM responses GROUP BY person_id
      ) latest ON latest.person_id = r.person_id AND latest.maxDate = r.date
    `).all();

    const insertResponse = db.prepare(`
      INSERT INTO event_responses (event_id, person_id, attending, meal, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const row of latestPerPerson) {
      insertResponse.run(eventId, row.personId, row.attending, row.meal, now);
    }
  });
  migrateLegacyResponses();
}
