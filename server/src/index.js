import express from 'express';
import cors from 'cors';
import { db, DEPARTMENTS } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PASSWORD = process.env.PASSWORD;

function isValidDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// menu_option is stored as a JSON array string; older rows may hold a plain string.
function parseMenuOptions(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return [raw];
  }
}

// Authentication
app.post('/api/auth/verify', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ error: '비밀번호가 틀렸습니다' });
  }
});

// Departments, in display order (used to group the name picker).
app.get('/api/departments', (req, res) => {
  res.json(DEPARTMENTS);
});

// Full roster (used for the name picker / identity screen).
app.get('/api/people', (req, res) => {
  const people = db.prepare('SELECT id, name, department FROM people ORDER BY id').all();
  res.json(people);
});

// Add a new person to a department (new hire, or a one-off visitor under '방문').
app.post('/api/people', (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const { department } = req.body;

  if (!name) {
    return res.status(400).json({ error: '이름을 입력해주세요' });
  }
  if (!DEPARTMENTS.includes(department)) {
    return res.status(400).json({ error: 'invalid department' });
  }
  const existing = db.prepare('SELECT id FROM people WHERE name = ?').get(name);
  if (existing) {
    return res.status(409).json({ error: '이미 등록된 이름이에요' });
  }

  const result = db.prepare('INSERT INTO people (name, department) VALUES (?, ?)').run(name, department);
  res.status(201).json({ id: result.lastInsertRowid, name, department });
});

// Delete a person
app.delete('/api/people/:personId', (req, res) => {
  const personId = Number(req.params.personId);
  const person = db.prepare('SELECT id FROM people WHERE id = ?').get(personId);
  if (!person) {
    return res.status(404).json({ error: 'unknown person' });
  }
  db.prepare('DELETE FROM responses WHERE person_id = ?').run(personId);
  db.prepare('DELETE FROM people WHERE id = ?').run(personId);
  res.json({ success: true });
});

// All events, with attendance/absence/pending counts across the current roster.
app.get('/api/events', (req, res) => {
  const totalPeople = db.prepare('SELECT COUNT(*) AS c FROM people').get().c;
  const events = db.prepare(`
    SELECT e.id AS id, e.title AS title, e.event_date AS eventDate, e.description AS description,
           e.created_at AS createdAt, e.menu_enabled AS menuEnabled, e.meal_enabled AS mealEnabled,
           p.name AS createdByName,
           SUM(CASE WHEN r.attending = 1 THEN 1 ELSE 0 END) AS attendingCount,
           SUM(CASE WHEN r.attending = 0 THEN 1 ELSE 0 END) AS absentCount
    FROM events e
    LEFT JOIN people p ON p.id = e.created_by
    LEFT JOIN event_responses r ON r.event_id = e.id
    GROUP BY e.id
    ORDER BY e.event_date DESC, e.id DESC
  `).all();

  res.json(events.map((e) => ({
    ...e,
    menuEnabled: Boolean(e.menuEnabled),
    mealEnabled: Boolean(e.mealEnabled),
    attendingCount: e.attendingCount || 0,
    absentCount: e.absentCount || 0,
    pendingCount: totalPeople - (e.attendingCount || 0) - (e.absentCount || 0),
  })));
});

// Create a new event.
app.post('/api/events', (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const { eventDate, description, menuEnabled, mealEnabled } = req.body;
  const createdBy = Number(req.body.createdBy);

  if (!title) {
    return res.status(400).json({ error: '이벤트 이름을 입력해주세요' });
  }
  if (eventDate != null && !isValidDate(eventDate)) {
    return res.status(400).json({ error: 'eventDate must be YYYY-MM-DD or null' });
  }
  const person = db.prepare('SELECT id FROM people WHERE id = ?').get(createdBy);
  if (!person) {
    return res.status(400).json({ error: 'unknown createdBy person' });
  }

  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO events (title, event_date, description, created_by, created_at, menu_enabled, meal_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, eventDate || null, description || null, createdBy, now, menuEnabled ? 1 : 0, mealEnabled ? 1 : 0);

  res.status(201).json({
    id: result.lastInsertRowid,
    title,
    eventDate: eventDate || null,
    description: description || null,
    createdAt: now,
    menuEnabled: Boolean(menuEnabled),
    mealEnabled: Boolean(mealEnabled),
    attendingCount: 0,
    absentCount: 0,
    pendingCount: db.prepare('SELECT COUNT(*) AS c FROM people').get().c,
  });
});

// Delete an event.
app.delete('/api/events/:eventId', (req, res) => {
  const eventId = Number(req.params.eventId);
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }
  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  res.json({ success: true });
});

// Everyone's attendance/note status for a given event.
app.get('/api/events/:eventId/responses', (req, res) => {
  const eventId = Number(req.params.eventId);
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }
  const rows = db.prepare(`
    SELECT p.id AS personId, p.name AS name, r.attending AS attending, r.note AS note,
           r.menu_option AS menuOption, r.meal AS meal
    FROM people p
    LEFT JOIN event_responses r ON r.person_id = p.id AND r.event_id = ?
    ORDER BY p.id
  `).all(eventId);

  const people = rows.map((row) => ({
    personId: row.personId,
    name: row.name,
    attending: row.attending === null ? null : Boolean(row.attending),
    note: row.note,
    menuOptions: parseMenuOptions(row.menuOption),
    meal: row.meal,
  }));

  res.json(people);
});

// Upsert one person's attendance/note/menu choices/meal status for a given event.
app.put('/api/events/:eventId/responses/:personId', (req, res) => {
  const eventId = Number(req.params.eventId);
  const personId = Number(req.params.personId);
  const { attending, note, menuOptions, meal } = req.body;

  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }
  const person = db.prepare('SELECT id FROM people WHERE id = ?').get(personId);
  if (!person) {
    return res.status(404).json({ error: 'unknown person' });
  }
  if (attending !== null && typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'attending must be boolean or null' });
  }
  if (note !== null && note !== undefined && typeof note !== 'string') {
    return res.status(400).json({ error: 'note must be a string or null' });
  }
  if (menuOptions !== null && menuOptions !== undefined
    && (!Array.isArray(menuOptions) || !menuOptions.every((o) => typeof o === 'string'))) {
    return res.status(400).json({ error: 'menuOptions must be an array of strings or null' });
  }
  if (meal !== null && meal !== undefined && meal !== '먹음' && meal !== '안먹음') {
    return res.status(400).json({ error: "meal must be '먹음', '안먹음', or null" });
  }

  const attendingValue = attending === null ? null : (attending ? 1 : 0);
  const noteValue = note || null;
  const cleanOptions = (menuOptions || []).map((o) => o.trim()).filter(Boolean);
  const menuOptionValue = cleanOptions.length > 0 ? JSON.stringify(cleanOptions) : null;
  const mealValue = meal || null;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO event_responses (event_id, person_id, attending, note, menu_option, meal, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id, person_id) DO UPDATE SET
      attending = excluded.attending,
      note = excluded.note,
      menu_option = excluded.menu_option,
      meal = excluded.meal,
      updated_at = excluded.updated_at
  `).run(eventId, personId, attendingValue, noteValue, menuOptionValue, mealValue, now);

  res.json({
    eventId, personId, attending, note: noteValue, menuOptions: cleanOptions, meal: mealValue, updatedAt: now,
  });
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
