import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI environment variable is required');
}

const client = new MongoClient(uri);

// The MongoDB driver hands back Db/Collection handles without waiting for a
// live connection, and buffers operations until it connects. That lets the
// HTTP server bind its port immediately (so Render's deploy health check
// passes) while the actual connection + seeding happen in the background.
export const db = client.db('lunch_bento');
export const people = db.collection('people');
export const events = db.collection('events');
export const eventResponses = db.collection('event_responses');

export const DEPARTMENTS = [
  '원장', '총무국', '출판국', '지운국', '훈련국', 'Pearl', 'YRG', 'Kids', '방문',
];

const ROSTER = [
  ['원장', '이애실'],
  ['총무국', '권준호'], ['총무국', '김효선'], ['총무국', '심태석'], ['총무국', '황시은'],
  ['출판국', '김만석'], ['출판국', '김하경'], ['출판국', '김하솜'],
  ['지운국', '한상규'],
  ['훈련국', '김해수'], ['훈련국', '유남희'],
  ['Pearl', '서영수'],
  ['YRG', '유소현'],
  ['Kids', '권은미'],
];

async function init() {
  await client.connect();
  await eventResponses.createIndex({ eventId: 1, personId: 1 }, { unique: true });
  await people.createIndex({ name: 1 }, { unique: true });
  for (const [department, name] of ROSTER) {
    await people.updateOne(
      { name },
      { $setOnInsert: { name, department, reminderEnabled: true } },
      { upsert: true },
    );
  }

  // Migrate legacy events (created before per-event rosters) by snapshotting
  // the current base roster into them, so their existing responses keep
  // mapping to a participant and their tallies don't change.
  const legacy = await events.find({ participants: { $exists: false } }).toArray();
  if (legacy.length > 0) {
    const baseRoster = await people.find().sort({ _id: 1 }).toArray();
    const snapshot = baseRoster.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      department: p.department,
    }));
    await events.updateMany(
      { participants: { $exists: false } },
      { $set: { participants: snapshot } },
    );
    console.log(`Snapshotted base roster into ${legacy.length} legacy event(s)`);
  }

  console.log('MongoDB connected and roster seeded');
}

init().catch((err) => {
  console.error('MongoDB init failed:', err);
});
