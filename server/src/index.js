import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { people, events, eventResponses, DEPARTMENTS } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PASSWORD = process.env.PASSWORD;
const DELETE_PASSWORD = process.env.DELETE_PASSWORD;

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

// Full roster (used for the name picker / identity screen).
app.get('/api/people', async (req, res) => {
  const rows = await people.find().sort({ _id: 1 }).toArray();
  res.json(rows.map(personOut));
});

// Add a new person to a department (new hire, or a one-off visitor under '방문').
app.post('/api/people', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const { department } = req.body;

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

// Delete a person
app.delete('/api/people/:personId', async (req, res) => {
  const personId = toObjectId(req.params.personId);
  if (!personId) {
    return res.status(404).json({ error: 'unknown person' });
  }
  const person = await people.findOne({ _id: personId });
  if (!person) {
    return res.status(404).json({ error: 'unknown person' });
  }
  await eventResponses.deleteMany({ personId });
  await people.deleteOne({ _id: personId });
  res.json({ success: true });
});

// All events, with attendance/absence/pending counts across the current roster.
app.get('/api/events', async (req, res) => {
  const totalPeople = await people.countDocuments();

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
      $lookup: {
        from: 'people',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator',
      },
    },
    {
      $addFields: {
        attendingCount: {
          $size: { $filter: { input: '$responses', cond: { $eq: ['$$this.attending', true] } } },
        },
        absentCount: {
          $size: { $filter: { input: '$responses', cond: { $eq: ['$$this.attending', false] } } },
        },
        createdByName: { $arrayElemAt: ['$creator.name', 0] },
      },
    },
    { $project: { responses: 0, creator: 0 } },
    { $sort: { eventDate: -1, _id: -1 } },
  ]).toArray();

  res.json(rows.map((e) => ({
    id: e._id.toString(),
    title: e.title,
    eventDate: e.eventDate,
    description: e.description,
    createdAt: e.createdAt,
    createdByName: e.createdByName || null,
    menuEnabled: true,
    mealEnabled: false,
    multiSelect: Boolean(e.multiSelect),
    menuOptions: e.menuOptions || [],
    attendingCount: e.attendingCount || 0,
    absentCount: e.absentCount || 0,
    pendingCount: totalPeople - (e.attendingCount || 0) - (e.absentCount || 0),
  })));
});

// Create a new event. Menu selection is always on; multiSelect controls whether
// a person may pick more than one option.
app.post('/api/events', async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const { eventDate, description, multiSelect } = req.body;
  const createdBy = toObjectId(req.body.createdBy);

  if (!title) {
    return res.status(400).json({ error: '이벤트 이름을 입력해주세요' });
  }
  if (eventDate != null && !isValidDate(eventDate)) {
    return res.status(400).json({ error: 'eventDate must be YYYY-MM-DD or null' });
  }
  if (!createdBy || !(await people.findOne({ _id: createdBy }))) {
    return res.status(400).json({ error: 'unknown createdBy person' });
  }

  const multiSelectValue = multiSelect !== false;
  const now = new Date().toISOString();
  const doc = {
    title,
    eventDate: eventDate || null,
    description: description || null,
    createdBy,
    createdAt: now,
    multiSelect: multiSelectValue,
    menuOptions: [],
  };
  const result = await events.insertOne(doc);
  const totalPeople = await people.countDocuments();

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
    pendingCount: totalPeople,
  });
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

// Everyone's attendance/note status for a given event.
app.get('/api/events/:eventId/responses', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  if (!eventId) {
    return res.status(404).json({ error: 'unknown event' });
  }
  const event = await events.findOne({ _id: eventId });
  if (!event) {
    return res.status(404).json({ error: 'unknown event' });
  }

  const [allPeople, allResponses] = await Promise.all([
    people.find().sort({ _id: 1 }).toArray(),
    eventResponses.find({ eventId }).toArray(),
  ]);
  const byPersonId = new Map(allResponses.map((r) => [r.personId.toString(), r]));

  const rows = allPeople.map((p) => {
    const r = byPersonId.get(p._id.toString());
    return {
      personId: p._id.toString(),
      name: p.name,
      attending: r?.attending ?? null,
      note: r?.note ?? null,
      menuOptions: r?.menuOptions ?? [],
    };
  });

  res.json(rows);
});

// Upsert one person's attendance/note/menu choices for a given event.
app.put('/api/events/:eventId/responses/:personId', async (req, res) => {
  const eventId = toObjectId(req.params.eventId);
  const personId = toObjectId(req.params.personId);
  const { attending, note, menuOptions } = req.body;

  if (!eventId || !(await events.findOne({ _id: eventId }))) {
    return res.status(404).json({ error: 'unknown event' });
  }
  if (!personId || !(await people.findOne({ _id: personId }))) {
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

// Per-person reminder preference.
app.get('/api/settings/:personId', async (req, res) => {
  const personId = toObjectId(req.params.personId);
  if (!personId) {
    return res.status(404).json({ error: 'unknown person' });
  }
  const person = await people.findOne({ _id: personId });
  if (!person) {
    return res.status(404).json({ error: 'unknown person' });
  }
  res.json({ reminderEnabled: Boolean(person.reminderEnabled) });
});

app.put('/api/settings/:personId', async (req, res) => {
  const personId = toObjectId(req.params.personId);
  const { reminderEnabled } = req.body;
  if (typeof reminderEnabled !== 'boolean') {
    return res.status(400).json({ error: 'reminderEnabled must be boolean' });
  }
  if (!personId) {
    return res.status(404).json({ error: 'unknown person' });
  }
  const result = await people.updateOne({ _id: personId }, { $set: { reminderEnabled } });
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'unknown person' });
  }
  res.json({ reminderEnabled });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`lunch-bento-server listening on http://localhost:${PORT}`);
});
