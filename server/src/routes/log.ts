import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const decodeActor = (raw?: string) => {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

// GET /api/log?limit=200&trip_id=1
router.get('/', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 300, 1000);
  const tripId = req.query.trip_id ? Number(req.query.trip_id) : null;
  const rows = tripId
    ? db
        .prepare('SELECT * FROM activity_log WHERE trip_id = ? ORDER BY id DESC LIMIT ?')
        .all(tripId, limit)
    : db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?').all(limit);
  res.json(rows);
});

// POST /api/log  { action, trip_id?, actor? }  -> client-side events (e.g. sign-in)
router.post('/', (req, res) => {
  const { action, trip_id, actor } = req.body ?? {};
  if (!action || !String(action).trim()) return res.status(400).json({ error: 'action required' });
  const who = actor ?? decodeActor(req.header('X-Actor') || undefined);
  const info = db
    .prepare('INSERT INTO activity_log (actor, method, path, action, trip_id) VALUES (?, ?, ?, ?, ?)')
    .run(who ?? null, 'EVENT', null, String(action).trim(), trip_id ?? null);
  res.status(201).json(db.prepare('SELECT * FROM activity_log WHERE id = ?').get(info.lastInsertRowid));
});

// DELETE /api/log  -> clear the whole log
router.delete('/', (_req, res) => {
  db.prepare('DELETE FROM activity_log').run();
  res.status(204).end();
});

export default router;
