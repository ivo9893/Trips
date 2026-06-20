import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/trips/:tripId/tally  -> computed counts (the "Бройка" sheet, live)
router.get('/trips/:tripId/tally', (req, res) => {
  const tripId = req.params.tripId;

  const meats = db
    .prepare(
      `SELECT m.id, m.name, COUNT(*) AS count
       FROM participant_meats pm
       JOIN trip_participants tp ON tp.id = pm.participant_id
       JOIN meats m ON m.id = pm.meat_id
       WHERE tp.trip_id = ?
       GROUP BY m.id ORDER BY count DESC, m.name`,
    )
    .all(tripId);

  const drinks = db
    .prepare(
      `SELECT d.id, d.name, d.category, COUNT(*) AS count
       FROM participant_drinks pd
       JOIN trip_participants tp ON tp.id = pd.participant_id
       JOIN drinks d ON d.id = pd.drink_id
       WHERE tp.trip_id = ?
       GROUP BY d.id ORDER BY count DESC, d.name`,
    )
    .all(tripId);

  const attendance = db
    .prepare(
      `SELECT
         SUM(attending = 'yes') AS yes,
         SUM(attending = 'no') AS no,
         SUM(attending = 'unknown') AS unknown,
         SUM(CASE WHEN attending = 'yes' THEN COALESCE(nights, 0) ELSE 0 END) AS total_nights
       FROM trip_participants WHERE trip_id = ?`,
    )
    .get(tripId);

  const noResponse = db
    .prepare(
      `SELECT pe.name FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
       WHERE tp.trip_id = ? AND tp.attending = 'unknown' ORDER BY pe.sort_order, pe.name`,
    )
    .all(tripId)
    .map((r: any) => r.name);

  const bring = db
    .prepare(
      `SELECT bi.id, bi.name, COUNT(*) AS count
       FROM participant_bring pb
       JOIN trip_participants tp ON tp.id = pb.participant_id
       JOIN bring_items bi ON bi.id = pb.bring_item_id
       WHERE tp.trip_id = ?
       GROUP BY bi.id ORDER BY count DESC, bi.name`,
    )
    .all(tripId);

  const lastUpdated = (
    db.prepare('SELECT MAX(updated_at) AS t FROM trip_participants WHERE trip_id = ?').get(tripId) as { t: string }
  ).t;

  res.json({ meats, drinks, bring, attendance, noResponse, lastUpdated });
});

export default router;
