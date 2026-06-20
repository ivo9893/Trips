import { Router } from 'express';
import { db } from '../db.js';

const router = Router();
const WINDOW_MONTHS = 6;

/**
 * GET /api/trips/:tripId/wheel
 * Eligible = attending people with NO shopping duty in the last 6 months.
 * Safe = attending people who DID shop in the last 6 months (with expiry).
 */
router.get('/trips/:tripId/wheel', (req, res) => {
  const tripId = req.params.tripId;

  const attendees = db
    .prepare(
      `SELECT pe.id AS person_id, pe.name
       FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
       WHERE tp.trip_id = ? AND tp.attending = 'yes'
       ORDER BY pe.sort_order, pe.name`,
    )
    .all(tripId) as { person_id: number; name: string }[];

  // latest duty per person within the safety window
  const recent = db
    .prepare(
      `SELECT person_id, MAX(chosen_at) AS chosen_at
       FROM shopping_duty
       WHERE chosen_at > datetime('now', ?)
       GROUP BY person_id`,
    )
    .all(`-${WINDOW_MONTHS} months`) as { person_id: number; chosen_at: string }[];
  const safeMap = new Map(recent.map((r) => [r.person_id, r.chosen_at]));

  const eligible: { person_id: number; name: string }[] = [];
  const safe: { person_id: number; name: string; chosen_at: string; safe_until: string }[] = [];

  for (const a of attendees) {
    const chosen = safeMap.get(a.person_id);
    if (chosen) {
      const safe_until = db
        .prepare(`SELECT date(?, '+${WINDOW_MONTHS} months') AS d`)
        .get(chosen) as { d: string };
      safe.push({ ...a, chosen_at: chosen, safe_until: safe_until.d });
    } else {
      eligible.push(a);
    }
  }

  res.json({ eligible, safe, windowMonths: WINDOW_MONTHS });
});

/** GET /api/trips/:tripId/wheel/history -> recent picks with names */
router.get('/trips/:tripId/wheel/history', (req, res) => {
  const rows = db
    .prepare(
      `SELECT sd.id, sd.person_id, pe.name, sd.chosen_at, sd.trip_id
       FROM shopping_duty sd JOIN people pe ON pe.id = sd.person_id
       ORDER BY sd.chosen_at DESC LIMIT 50`,
    )
    .all();
  res.json(rows);
});

/** POST /api/trips/:tripId/wheel/pick { person_id } -> record a shopping duty */
router.post('/trips/:tripId/wheel/pick', (req, res) => {
  const { person_id } = req.body ?? {};
  if (!person_id) return res.status(400).json({ error: 'person_id required' });
  const info = db
    .prepare('INSERT INTO shopping_duty (person_id, trip_id) VALUES (?, ?)')
    .run(person_id, req.params.tripId);
  res.status(201).json(db.prepare('SELECT * FROM shopping_duty WHERE id = ?').get(info.lastInsertRowid));
});

/** DELETE /api/wheel/duty/:id -> undo a pick */
router.delete('/wheel/duty/:id', (req, res) => {
  db.prepare('DELETE FROM shopping_duty WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
