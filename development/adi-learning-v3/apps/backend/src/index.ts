import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDb } from './db/init';
import ttsRoutes from './routes/tts';
import progressRoutes from './routes/progress';
import settingsRoutes from './routes/settings';

const app = new Hono();

// Middleware
app.use('*', cors({ origin: '*' }));
app.use('*', logger());

// Initialize database on startup
getDb();

// Routes
app.route('/api/tts', ttsRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`[server] Adi's Learning Adventure v3 backend running on http://localhost:${PORT}`);
