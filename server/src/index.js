import express from 'express';
import cors from 'cors';
import { db } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

function isValidDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// Full roster (used for the name picker / identity screen).
app.get('/api/people', (req, res) => {
  const people = db.prepare('SELECT id, name FROM people ORDER BY id').all();
  res.json(people);
});

// Everyone's attendance/meal status for a given date.
app.get('/api/day', (req, res) => {
  const { date } = req.query;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'date query param must be YYYY-MM-DD' });
  }
  const rows = db.prepare(`
    SELECT p.id AS personId, p.name AS name, r.attending AS attending, r.meal AS meal
    FROM people p
    LEFT JOIN responses r ON r.person_id = p.id AND r.date = ?
    ORDER BY p.id
  `).all(date);

  const people = rows.map((row) => ({
    personId: row.personId,
    name: row.name,
    attending: row.attending === null ? null : Boolean(row.attending),
    meal: row.meal,
  }));

  res.json(people);
});

// Upsert one person's attendance/meal for a given date.
app.put('/api/day/:personId', (req, res) => {
  const personId = Number(req.params.personId);
  const { date, attending, meal } = req.body;

  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }
  const person = db.prepare('SELECT id FROM people WHERE id = ?').get(personId);
  if (!person) {
    return res.status(404).json({ error: 'unknown person' });
  }
  if (attending !== null && typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'attending must be boolean or null' });
  }
  if (meal !== null && meal !== '먹음' && meal !== '안먹음') {
    return res.status(400).json({ error: "meal must be '먹음', '안먹음', or null" });
  }

  const attendingValue = attending === null ? null : (attending ? 1 : 0);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO responses (person_id, date, attending, meal, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(person_id, date) DO UPDATE SET
      attending = excluded.attending,
      meal = excluded.meal,
      updated_at = excluded.updated_at
  `).run(personId, date, attendingValue, meal, now);

  res.json({ personId, date, attending, meal, updatedAt: now });
});

// Per-person reminder preference.
app.get('/api/settings/:personId', (req, res) => {
  const personId = Number(req.params.personId);
  const person = db.prepare('SELECT id, reminder_enabled AS reminderEnabled FROM people WHERE id = ?').get(personId);
  if (!person) {
    return res.status(404).json({ error: 'unknown person' });
  }
  res.json({ reminderEnabled: Boolean(person.reminderEnabled) });
});

app.put('/api/settings/:personId', (req, res) => {
  const personId = Number(req.params.personId);
  const { reminderEnabled } = req.body;
  if (typeof reminderEnabled !== 'boolean') {
    return res.status(400).json({ error: 'reminderEnabled must be boolean' });
  }
  const result = db.prepare('UPDATE people SET reminder_enabled = ? WHERE id = ?')
    .run(reminderEnabled ? 1 : 0, personId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'unknown person' });
  }
  res.json({ reminderEnabled });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`lunch-bento-server listening on http://localhost:${PORT}`);
});
