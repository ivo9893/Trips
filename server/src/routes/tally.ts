import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/trips/:tripId/tally  -> computed counts (the "Бройка" sheet, live)
router.get('/trips/:tripId/tally', async (req, res, next) => {
  try {
    const tripId = Number(req.params.tripId);

    const meatsPromise = db`
      SELECT m.id, m.name, COUNT(*) AS count
      FROM participant_meats pm
      JOIN trip_participants tp ON tp.id = pm.participant_id
      JOIN meats m ON m.id = pm.meat_id
      WHERE tp.trip_id = ${tripId}
      GROUP BY m.id, m.name ORDER BY count DESC, m.name
    `;

    const drinksPromise = db`
      SELECT d.id, d.name, d.category, COUNT(*) AS count
      FROM participant_drinks pd
      JOIN trip_participants tp ON tp.id = pd.participant_id
      JOIN drinks d ON d.id = pd.drink_id
      WHERE tp.trip_id = ${tripId}
      GROUP BY d.id, d.name, d.category ORDER BY count DESC, d.name
    `;

    const attendancePromise = db`
      SELECT
        COUNT(*) FILTER (WHERE attending = 'yes') AS yes,
        COUNT(*) FILTER (WHERE attending = 'no') AS no,
        COUNT(*) FILTER (WHERE attending = 'unknown') AS unknown,
        SUM(CASE WHEN attending = 'yes' THEN COALESCE(nights, 0) ELSE 0 END) AS total_nights
      FROM trip_participants WHERE trip_id = ${tripId}
    `;

    const noResponsePromise = db`
      SELECT pe.name FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
      WHERE tp.trip_id = ${tripId} AND tp.attending = 'unknown' ORDER BY pe.sort_order, pe.name
    `;

    const bringPromise = db`
      SELECT bi.id, bi.name, COUNT(*) AS count
      FROM participant_bring pb
      JOIN trip_participants tp ON tp.id = pb.participant_id
      JOIN bring_items bi ON bi.id = pb.bring_item_id
      WHERE tp.trip_id = ${tripId}
      GROUP BY bi.id, bi.name ORDER BY count DESC, bi.name
    `;

    const lastUpdatedPromise = db`
      SELECT MAX(updated_at) AS t FROM trip_participants WHERE trip_id = ${tripId}
    `;

    const [
      meats,
      drinks,
      [attendance],
      noResponseRows,
      bring,
      [lastUpdatedRow]
    ] = await Promise.all([
      meatsPromise,
      drinksPromise,
      attendancePromise,
      noResponsePromise,
      bringPromise,
      lastUpdatedPromise
    ]);

    // Format count values to numbers as Postgres returns COUNT() as strings (int8/bigint mapping)
    const formattedMeats = meats.map((m: any) => ({ ...m, count: Number(m.count) }));
    const formattedDrinks = drinks.map((d: any) => ({ ...d, count: Number(d.count) }));
    const formattedBring = bring.map((b: any) => ({ ...b, count: Number(b.count) }));
    const formattedAttendance = {
      yes: Number(attendance?.yes || 0),
      no: Number(attendance?.no || 0),
      unknown: Number(attendance?.unknown || 0),
      total_nights: Number(attendance?.total_nights || 0),
    };
    const noResponse = noResponseRows.map((r: any) => r.name);
    const lastUpdated = lastUpdatedRow?.t || null;

    res.json({
      meats: formattedMeats,
      drinks: formattedDrinks,
      bring: formattedBring,
      attendance: formattedAttendance,
      noResponse,
      lastUpdated
    });
  } catch (err) {
    next(err);
  }
});

export default router;
