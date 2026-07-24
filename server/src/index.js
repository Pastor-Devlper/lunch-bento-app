import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { people, events, eventResponses, DEPARTMENTS } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PASSWORD = process.env.PASSWORD;
const DELETE_PASSWORD = process.env.DELETE_PASSWORD;
// The delete password doubles as the admin password for editing the base roster.
const ADMIN_PASSWORD = DELETE_PASSWORD;

function isValidDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function personOut(p) {
  return { id: p._id.toString(), name: p.name, department: p.department };
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

// Verify the admin password (used to unlock base-roster management).
app.post('/api/roster/auth', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: '비밀번호가 틀렸습니다' });
  }
});

// Base roster — the master list new events snapshot from. Editing it only
// affects events created afterwards; existing events keep their own snapshot.
app.get('/api/people', async (req, res) => {
  const rows = await people.find().sort({ _id: 1 }).toArray();
  res.json(rows.map(personOut));
});

// Add a person to the base roster. Admin only.
app.post('/api/people', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const { department, password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸습니다' });
  }
  if (!name) {
    return res.status(400).json({ error: '이름을 입력해주세요' });
  }
  if (!DEPARTMENTS.includes(department)) {
    return res.status(400).json({ error: 'invalid department' });
  }
  const existing = await people.findOne({ name });
  if (existing) {
    return res.status(409).json({ error: '이미 등록된 이름이에요' });
  }

  const result = await people.insertOne({ name, department, reminderEnabled: true });
  res.status(201).json({ id: result.insertedId.toString(), name, department });
});

// Delete a person from the base roster. Admin only. Does NOT touch existing
// events (they keep their own participant snapshot).
app.delete('/api/people/:personId', async (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸습니다' });
  }
  const personId = toObjectId(req.params.personId);
  if (!personId) {
    return res.status(404).json({ error: 'unknown person' });
  }
  const result = await people.deleteOne({ _id: personId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'unknown person' });
  }
  res.json({ success: true });
});

// All events, with attendance/absence/pending counts over each event's own
// participant snapshot.
app.get('/api/events', async (req, res) => {
  const rows = await events.aggregate([
    {
      $lookup: {
        from: 'event_responses',
        localField: '_id',
        foreignField: 'eventId',
        as: 'responses',
      },
    },
    {
      $addFields: {
        total: { $size: { $ifNull: ['$participants', []] } },
        attendingCount: {
          $size: { $filter: { input: '$responses', cond: { $eq: ['$$this.attending', true] } } },
        },
        absentCount: {
          $size: { $filter: { input: '$responses', cond: { $eq: ['$$this.attending', false] } } },
        },
      },
    },
    { $project: { responses: 0, participants: 0 } },
    { $sort: { eventDate: -1, _id: -1 } },
  ]).toArray();

  res.json(rows.map((e) => ({
    id: e._id.toString(),
    title: e.title,
    eventDate: e.eventDate,
    description: e.description,
    createdAt: e.createdAt,
    menuEnabled: true,
    mealEnabled: false,
    multiSelect: Boolean(e.multiSelect),
    menuOptions: e.menuOptions || [],
    attendingCount: e.attendingCount || 0,
    absentCount: e.absentCount || 0,
    pendingCount: (e.total || 0) - (e.attendingCount || 0) - (e.absentCount || 0),
  })));
});

// Create a new event. Snapshots the current base roster into the event so its
// participant list is independent from then on.
app.post('/api/events', async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const { eventDate, description, multiSelect } = req.body;

  if (!title) {
    return res.status(400).json({ error: '이벤트 이름을 입력해주세요' });
  }
  if (eventDate != null && !isValidDate(eventDate)) {
    return res.status(400).json({ error: 'eventDate must be YYYY-MM-DD or null' });
  }

  const baseRoster = await people.find().sort({ _id: 1 }).toArray();
  const participants = baseRoster.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    department: p.department,
  }));

  const multiSelectValue = multiSelect !== false;
  const now = new Date().toISOString();
  const doc = {
    title,
    eventDate: eventDate || null,
    description: description || null,
    createdAt: now,
    multiSelect: multiSelectValue,
    menuOptions: [],
    participants,
  };
  const result = await events.insertOne(doc);

  res.status(201).json({
    id: result.insertedId.toString(),
    title,
    eventDate: doc.eventDate,
    description: doc.description,
    createdAt: now,
    menuEnabled: true,
    mealEnabled: false,
    multiSelect: multiSelectValue,
    menuOptions: [],
    attendingCount: 0,
    absentCount: 0,
    pendingCount: participants.length,
  });
});

// Edit an event's basic info (title/date/description). Keeps participants and
// responses untouched — this is for correcting details, not resetting the event.
app.put('/api/events/:eventId', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const { eventDate, description, multiSelect } = req.body;

  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }
  if (!title) {
    return res.status(400).json({ error: '이벤트 이름을 입력해주세요' });
  }
  if (eventDate != null && !isValidDate(eventDate)) {
    return res.status(400).json({ error: 'eventDate must be YYYY-MM-DD or null' });
  }

  const set = {
    title,
    eventDate: eventDate || null,
    description: description || null,
  };
  if (multiSelect !== undefined) {
    set.multiSelect = multiSelect !== false;
  }

  const result = await events.findOneAndUpdate(
    { _id: eventId },
    { $set: set },
    { returnDocument: 'after' },
  );
  if (!result) {
    return res.status(404).json({ error: 'unknown event' });
  }

  res.json({
    id: result._id.toString(),
    title: result.title,
    eventDate: result.eventDate,
    description: result.description,
    createdAt: result.createdAt,
    menuEnabled: true,
    mealEnabled: false,
    multiSelect: Boolean(result.multiSelect),
    menuOptions: result.menuOptions || [],
  });
});

// Add a participant to this event's roster only (a visitor for this event).
app.post('/api/events/:eventId/participants', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const { department } = req.body;

  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }
  if (!name) {
    return res.status(400).json({ error: '이름을 입력해주세요' });
  }
  if (!DEPARTMENTS.includes(department)) {
    return res.status(400).json({ error: 'invalid department' });
  }
  const event = await events.findOne({ _id: eventId });
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }
  if ((event.participants || []).some((p) => p.name === name)) {
    return res.status(409).json({ error: '이미 등록된 이름이에요' });
  }

  const participant = { id: new ObjectId().toString(), name, department };
  await events.updateOne({ _id: eventId }, { $push: { participants: participant } });
  res.status(201).json(participant);
});

// Remove a participant from this event's roster (and their response for it).
app.delete('/api/events/:eventId/participants/:participantId', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const { participantId } = req.params;
  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }
  await events.updateOne(
    { _id: eventId },
    { $pull: { participants: { id: participantId } } },
  );
  const pid = toObjectId(participantId);
  if (pid) {
    await eventResponses.deleteOne({ eventId, personId: pid });
  }
  res.json({ success: true });
});

// Add a new menu option to an event's persistent option pool (visible to everyone,
// independent of who currently has it selected).
app.post('/api/events/:eventId/menu-options', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const option = typeof req.body.option === 'string' ? req.body.option.trim() : '';

  if (!option) {
    return res.status(400).json({ error: '메뉴 이름을 입력해주세요' });
  }
  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }

  const result = await events.findOneAndUpdate(
    { _id: eventId },
    { $addToSet: { menuOptions: option } },
    { returnDocument: 'after' },
  );
  if (!result) {
    return res.status(404).json({ error: 'unknown event' });
  }

  res.json({ menuOptions: result.menuOptions || [] });
});

// Remove a menu option from an event's pool, and from anyone who had it selected.
app.delete('/api/events/:eventId/menu-options', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const option = typeof req.body.option === 'string' ? req.body.option.trim() : '';

  if (!option) {
    return res.status(400).json({ error: '메뉴 이름을 입력해주세요' });
  }
  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }

  const result = await events.findOneAndUpdate(
    { _id: eventId },
    { $pull: { menuOptions: option } },
    { returnDocument: 'after' },
  );
  if (!result) {
    return res.status(404).json({ error: 'unknown event' });
  }

  await eventResponses.updateMany(
    { eventId, menuOptions: option },
    { $pull: { menuOptions: option } },
  );

  res.json({ menuOptions: result.menuOptions || [] });
});

// Delete an event. Requires the delete password.
app.delete('/api/events/:eventId', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const { password } = req.body;
  if (password !== DELETE_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸습니다' });
  }
  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }
  const event = await events.findOne({ _id: eventId });
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }
  await eventResponses.deleteMany({ eventId });
  await events.deleteOne({ _id: eventId });
  res.json({ success: true });
});

// Everyone's attendance/note status for a given event, over its participants.
app.get('/api/events/:eventId/responses', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }
  const event = await events.findOne({ _id: eventId });
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }

  const allResponses = await eventResponses.find({ eventId }).toArray();
  const byPersonId = new Map(allResponses.map((r) => [r.personId.toString(), r]));

  const rows = (event.participants || []).map((p) => {
    const r = byPersonId.get(p.id);
    return {
      personId: p.id,
      name: p.name,
      department: p.department,
      attending: r?.attending ?? null,
      note: r?.note ?? null,
      menuOptions: r?.menuOptions ?? [],
    };
  });

  res.json(rows);
});

// Upsert one participant's attendance/note/menu choices for a given event.
app.put('/api/events/:eventId/responses/:personId', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const participantId = req.params.personId;
  const personId = toObjectId(participantId);
  const { attending, note, menuOptions } = req.body;

  const event = eventId ? await events.findOne({ _id: eventId }) : null;
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }
  if (!personId || !(event.participants || []).some((p) => p.id === participantId)) {
    return res.status(404).json({ error: 'unknown participant' });
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

  const noteValue = note || null;
  const cleanOptions = (menuOptions || []).map((o) => o.trim()).filter(Boolean);
  const now = new Date().toISOString();

  await eventResponses.updateOne(
    { eventId, personId },
    {
      $set: {
        attending: attending === undefined ? null : attending,
        note: noteValue,
        menuOptions: cleanOptions,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  res.json({
    eventId: eventId.toString(),
    personId: personId.toString(),
    attending: attending === undefined ? null : attending,
    note: noteValue,
    menuOptions: cleanOptions,
    updatedAt: now,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`lunch-bento-server listening on http://localhost:${PORT}`);
});
