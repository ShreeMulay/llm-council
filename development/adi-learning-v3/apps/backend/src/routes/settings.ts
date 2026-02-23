import { Hono } from 'hono';
import { getDb } from '../db/init';

const settings = new Hono();

// Get all settings
settings.get('/', (c) => {
  const db = getDb();
  const rows = db.query<{ key: string; value: string }, []>('SELECT key, value FROM settings').all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return c.json({ ok: true, data: result });
});

// Update a setting
settings.put('/:key', async (c) => {
  const key = c.req.param('key');
  const { value } = await c.req.json();
  const db = getDb();

  db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, String(value)]);
  return c.json({ ok: true });
});

export default settings;
