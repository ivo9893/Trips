import { Router } from 'express';
import { db } from '../db.js';

const router = Router();
const WINDOW_MONTHS = 6;

/**
 * GET /api/trips/:tripId/wheel
 * Eligible = attending people with NO shopping duty in the last 6 months.
 * Safe = attending people who DID shop in the last 6 months (with expiry).
 */
router.get('/trips/:tripId/wheel', async (req, res, next) => {
  try {
    const tripId = Number(req.params.tripId);

    const attendees = (await db`
      SELECT pe.id AS person_id, pe.name
      FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
      WHERE tp.trip_id = ${tripId} AND tp.attending = 'yes'
      ORDER BY pe.sort_order, pe.name
    `) as { person_id: number; name: string }[];

    // latest duty per person within the safety window (6 months)
    const recent = (await db`
      SELECT person_id, MAX(chosen_at) AS chosen_at
      FROM shopping_duty
      WHERE chosen_at > NOW() - INTERVAL '6 months'
      GROUP BY person_id
    `) as { person_id: number; chosen_at: Date }[];

    const safeMap = new Map(recent.map((r) => [r.person_id, r.chosen_at]));

    const eligible: { person_id: number; name: string }[] = [];
    const safe: { person_id: number; name: string; chosen_at: string; safe_until: string }[] = [];

    for (const a of attendees) {
      const chosen = safeMap.get(a.person_id);
      if (chosen) {
        const dObj = new Date(chosen);
        dObj.setMonth(dObj.getMonth() + WINDOW_MONTHS);
        const safe_until = dObj.toISOString().split('T')[0];

        safe.push({
          ...a,
          chosen_at: new Date(chosen).toISOString(),
          safe_until,
        });
      } else {
        eligible.push(a);
      }
    }

    res.json({ eligible, safe, windowMonths: WINDOW_MONTHS });
  } catch (err) {
    next(err);
  }
});

/** GET /api/trips/:tripId/wheel/history -> recent picks with names */
router.get('/trips/:tripId/wheel/history', async (req, res, next) => {
  try {
    const rows = await db`
      SELECT sd.id, sd.person_id, pe.name, sd.chosen_at, sd.trip_id
      FROM shopping_duty sd JOIN people pe ON pe.id = sd.person_id
      ORDER BY sd.chosen_at DESC LIMIT 50
    `;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** POST /api/trips/:tripId/wheel/pick { person_id } -> record a shopping duty */
router.post('/trips/:tripId/wheel/pick', async (req, res, next) => {
  try {
    const { person_id } = req.body ?? {};
    if (!person_id) return res.status(400).json({ error: 'person_id required' });
    const tripId = req.params.tripId ? Number(req.params.tripId) : null;

    const [inserted] = await db`
      INSERT INTO shopping_duty (person_id, trip_id) 
      VALUES (${Number(person_id)}, ${tripId})
      RETURNING *
    `;
    res.status(201).json(inserted);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/wheel/duty/:id -> undo a pick */
router.delete('/wheel/duty/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db`DELETE FROM shopping_duty WHERE id = ${id}`;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
