import { Hono } from 'hono';
import { getDb } from '../db/init';

const progress = new Hono();
const USER_ID = 'adi';

// ─── Letter Progress ──────────────────────────────────

progress.get('/letters', (c) => {
  const db = getDb();
  const rows = db.query('SELECT * FROM letter_progress WHERE user_id = ?').all(USER_ID);
  return c.json({ ok: true, data: rows });
});

progress.post('/letters/:letter', async (c) => {
  const letter = c.req.param('letter');
  const { correct } = await c.req.json();
  const db = getDb();

  db.run(
    `INSERT INTO letter_progress (user_id, letter, attempts, correct, last_practiced)
     VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, letter) DO UPDATE SET
       attempts = attempts + 1,
       correct = correct + ?,
       mastered = CASE WHEN (correct + ?) * 1.0 / (attempts + 1) >= 0.8 AND attempts + 1 >= 5 THEN TRUE ELSE mastered END,
       last_practiced = CURRENT_TIMESTAMP`,
    [USER_ID, letter, correct ? 1 : 0, correct ? 1 : 0, correct ? 1 : 0],
  );
  return c.json({ ok: true });
});

// ─── Number Progress ──────────────────────────────────

progress.get('/numbers', (c) => {
  const db = getDb();
  const rows = db.query('SELECT * FROM number_progress WHERE user_id = ?').all(USER_ID);
  return c.json({ ok: true, data: rows });
});

progress.post('/numbers/:number', async (c) => {
  const num = parseInt(c.req.param('number'), 10);
  const { correct } = await c.req.json();
  const db = getDb();

  db.run(
    `INSERT INTO number_progress (user_id, number, attempts, correct, last_practiced)
     VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, number) DO UPDATE SET
       attempts = attempts + 1,
       correct = correct + ?,
       mastered = CASE WHEN (correct + ?) * 1.0 / (attempts + 1) >= 0.8 AND attempts + 1 >= 3 THEN TRUE ELSE mastered END,
       last_practiced = CURRENT_TIMESTAMP`,
    [USER_ID, num, correct ? 1 : 0, correct ? 1 : 0, correct ? 1 : 0],
  );
  return c.json({ ok: true });
});

// ─── Math Progress ────────────────────────────────────

progress.get('/math', (c) => {
  const db = getDb();
  const rows = db.query('SELECT * FROM math_progress WHERE user_id = ?').all(USER_ID);
  return c.json({ ok: true, data: rows });
});

progress.post('/math/:skill', async (c) => {
  const skill = c.req.param('skill');
  if (!['more', 'less', 'equal'].includes(skill)) {
    return c.json({ ok: false, error: 'Invalid skill' }, 400);
  }
  const { correct } = await c.req.json();
  const db = getDb();

  db.run(
    `INSERT INTO math_progress (user_id, skill, attempts, correct, last_practiced)
     VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, skill) DO UPDATE SET
       attempts = attempts + 1,
       correct = correct + ?,
       mastered = CASE WHEN (correct + ?) * 1.0 / (attempts + 1) >= 0.8 AND attempts + 1 >= 5 THEN TRUE ELSE mastered END,
       last_practiced = CURRENT_TIMESTAMP`,
    [USER_ID, skill, correct ? 1 : 0, correct ? 1 : 0, correct ? 1 : 0],
  );
  return c.json({ ok: true });
});

// ─── Rhyme Progress ───────────────────────────────────

progress.get('/rhymes', (c) => {
  const db = getDb();
  const rows = db.query('SELECT * FROM rhyme_progress WHERE user_id = ?').all(USER_ID);
  return c.json({ ok: true, data: rows });
});

progress.post('/rhymes', async (c) => {
  const { wordPair, correct } = await c.req.json();
  const db = getDb();

  db.run(
    `INSERT INTO rhyme_progress (user_id, word_pair, attempts, correct, last_practiced)
     VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, word_pair) DO UPDATE SET
       attempts = attempts + 1,
       correct = correct + ?,
       mastered = CASE WHEN (correct + ?) * 1.0 / (attempts + 1) >= 0.8 AND attempts + 1 >= 3 THEN TRUE ELSE mastered END,
       last_practiced = CURRENT_TIMESTAMP`,
    [USER_ID, wordPair, correct ? 1 : 0, correct ? 1 : 0, correct ? 1 : 0],
  );
  return c.json({ ok: true });
});

// ─── Story Progress ───────────────────────────────────

progress.get('/stories', (c) => {
  const db = getDb();
  const rows = db.query('SELECT * FROM story_progress WHERE user_id = ?').all(USER_ID);
  return c.json({ ok: true, data: rows });
});

progress.post('/stories/:storyId', async (c) => {
  const storyId = c.req.param('storyId');
  const { correct } = await c.req.json();
  const db = getDb();

  db.run(
    `INSERT INTO story_progress (user_id, story_id, attempts, correct, last_practiced)
     VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, story_id) DO UPDATE SET
       attempts = attempts + 1,
       correct = correct + ?,
       mastered = CASE WHEN (correct + ?) * 1.0 / (attempts + 1) >= 0.8 AND attempts + 1 >= 3 THEN TRUE ELSE mastered END,
       last_practiced = CURRENT_TIMESTAMP`,
    [USER_ID, storyId, correct ? 1 : 0, correct ? 1 : 0, correct ? 1 : 0],
  );
  return c.json({ ok: true });
});

// ─── Writing Progress ─────────────────────────────────

progress.get('/writing', (c) => {
  const db = getDb();
  const rows = db.query('SELECT * FROM writing_progress WHERE user_id = ?').all(USER_ID);
  return c.json({ ok: true, data: rows });
});

progress.post('/writing/:letter', async (c) => {
  const letter = c.req.param('letter');
  const { accuracy } = await c.req.json();
  const db = getDb();

  db.run(
    `INSERT INTO writing_progress (user_id, letter, stroke_accuracy, trace_count, last_traced)
     VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, letter) DO UPDATE SET
       stroke_accuracy = (stroke_accuracy * trace_count + ?) / (trace_count + 1),
       trace_count = trace_count + 1,
       last_traced = CURRENT_TIMESTAMP`,
    [USER_ID, letter, accuracy, accuracy],
  );
  return c.json({ ok: true });
});

// ─── Overall Skill Summary ────────────────────────────

progress.get('/summary', (c) => {
  const db = getDb();

  const letterCount = db.query<{ total: number; mastered: number }, []>(
    'SELECT COUNT(*) as total, SUM(CASE WHEN mastered THEN 1 ELSE 0 END) as mastered FROM letter_progress WHERE user_id = ?',
  ).get(USER_ID);

  const numberCount = db.query<{ total: number; mastered: number }, []>(
    'SELECT COUNT(*) as total, SUM(CASE WHEN mastered THEN 1 ELSE 0 END) as mastered FROM number_progress WHERE user_id = ?',
  ).get(USER_ID);

  const mathCount = db.query<{ total: number; mastered: number }, []>(
    'SELECT COUNT(*) as total, SUM(CASE WHEN mastered THEN 1 ELSE 0 END) as mastered FROM math_progress WHERE user_id = ?',
  ).get(USER_ID);

  const rhymeCount = db.query<{ total: number; mastered: number }, []>(
    'SELECT COUNT(*) as total, SUM(CASE WHEN mastered THEN 1 ELSE 0 END) as mastered FROM rhyme_progress WHERE user_id = ?',
  ).get(USER_ID);

  const storyCount = db.query<{ total: number; mastered: number }, []>(
    'SELECT COUNT(*) as total, SUM(CASE WHEN mastered THEN 1 ELSE 0 END) as mastered FROM story_progress WHERE user_id = ?',
  ).get(USER_ID);

  const writingCount = db.query<{ total: number; avg_accuracy: number }, []>(
    'SELECT COUNT(*) as total, AVG(stroke_accuracy) as avg_accuracy FROM writing_progress WHERE user_id = ?',
  ).get(USER_ID);

  // Target letter set for this quarter: J, K, R, P, B, D, Q, U
  const TARGET_LETTERS = ['J', 'K', 'R', 'P', 'B', 'D', 'Q', 'U'];
  const TARGET_NUMBERS = 75;
  const TARGET_MATH = 3; // more, less, equal
  const TARGET_RHYMES = 30;
  const TARGET_STORIES = 8;
  const TARGET_NAME_LETTERS = 10; // A, d, a, l, y, n, M, u, l, a, y (unique = ~8)

  return c.json({
    ok: true,
    data: {
      'letter-sounds': {
        mastered: letterCount?.mastered || 0,
        target: TARGET_LETTERS.length,
        mastery: Math.round(((letterCount?.mastered || 0) / TARGET_LETTERS.length) * 100),
      },
      counting: {
        mastered: numberCount?.mastered || 0,
        target: TARGET_NUMBERS,
        mastery: Math.round(((numberCount?.mastered || 0) / TARGET_NUMBERS) * 100),
      },
      compare: {
        mastered: mathCount?.mastered || 0,
        target: TARGET_MATH,
        mastery: Math.round(((mathCount?.mastered || 0) / TARGET_MATH) * 100),
      },
      rhymes: {
        mastered: rhymeCount?.mastered || 0,
        target: TARGET_RHYMES,
        mastery: Math.round(((rhymeCount?.mastered || 0) / TARGET_RHYMES) * 100),
      },
      stories: {
        mastered: storyCount?.mastered || 0,
        target: TARGET_STORIES,
        mastery: Math.round(((storyCount?.mastered || 0) / TARGET_STORIES) * 100),
      },
      'name-writing': {
        traceCount: writingCount?.total || 0,
        avgAccuracy: Math.round(writingCount?.avg_accuracy || 0),
        mastery: Math.min(100, Math.round((writingCount?.avg_accuracy || 0))),
      },
    },
  });
});

export default progress;
