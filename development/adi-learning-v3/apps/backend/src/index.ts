import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getDb } from './db/init';
import ttsRoutes from './routes/tts';
import progressRoutes from './routes/progress';
import settingsRoutes from './routes/settings';
import { existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

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

// ─── Static frontend serving (production) ────────────
// In production, the built Vite frontend lives in ../frontend/dist/
// relative to the backend source. Serve static files using Bun.file()
// directly, and fall back to index.html for client-side routing (SPA).
const STATIC_ROOT = resolve(import.meta.dir, '../../frontend/dist');
const hasStaticBuild = existsSync(STATIC_ROOT);

// Common MIME types for static assets
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

if (hasStaticBuild) {
  console.log(`[static] Serving frontend from ${STATIC_ROOT}`);

  // Serve static files with Bun.file() — reliable and fast
  app.use('*', async (c, next) => {
    // Skip API routes
    if (c.req.path.startsWith('/api')) return next();

    // Resolve file path (sanitize to prevent path traversal)
    const reqPath = c.req.path.replace(/\.\./g, '');
    const filePath = join(STATIC_ROOT, reqPath);

    // Only serve files within STATIC_ROOT
    if (!filePath.startsWith(STATIC_ROOT)) return next();

    const file = Bun.file(filePath);
    if (await file.exists()) {
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      return new Response(file, {
        headers: { 'Content-Type': contentType },
      });
    }

    return next();
  });

  // SPA fallback: any non-API, non-file route serves index.html
  app.get('*', async (c) => {
    const indexFile = Bun.file(resolve(STATIC_ROOT, 'index.html'));
    return new Response(indexFile, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  });
} else {
  console.log('[static] No frontend build found — API-only mode (use Vite dev server for frontend)');
}

const PORT = parseInt(process.env.PORT || '3001', 10);

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`[server] Adi's Learning Adventure v3 backend running on http://localhost:${PORT}`);
