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
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 300, 1000);
    const tripId = req.query.trip_id ? Number(req.query.trip_id) : null;
    const rows = tripId
      ? await db`SELECT * FROM activity_log WHERE trip_id = ${tripId} ORDER BY id DESC LIMIT ${limit}`
      : await db`SELECT * FROM activity_log ORDER BY id DESC LIMIT ${limit}`;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/log  { action, trip_id?, actor? }  -> client-side events (e.g. sign-in)
router.post('/', async (req, res, next) => {
  try {
    const { action, trip_id, actor } = req.body ?? {};
    if (!action || !String(action).trim()) return res.status(400).json({ error: 'action required' });
    const who = actor ?? decodeActor(req.header('X-Actor') || undefined);

    const [inserted] = await db`
      INSERT INTO activity_log (actor, method, path, action, trip_id)
      VALUES (${who ?? null}, 'EVENT', null, ${String(action).trim()}, ${trip_id ?? null})
      RETURNING *
    `;
    res.status(201).json(inserted);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/log  -> clear the whole log
router.delete('/', async (_req, res, next) => {
  try {
    await db`DELETE FROM activity_log`;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
