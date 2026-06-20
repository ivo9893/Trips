import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/trips
router.get('/', async (_req, res, next) => {
  try {
    const trips = await db`
      SELECT t.*, l.name AS location_name, l.url AS location_url
      FROM trips t LEFT JOIN locations l ON l.id = t.location_id
      ORDER BY t.date_start DESC, t.id DESC
    `;
    res.json(trips);
  } catch (err) {
    next(err);
  }
});

// GET /api/trips/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [trip] = await db`
      SELECT t.*, l.name AS location_name, l.url AS location_url
      FROM trips t LEFT JOIN locations l ON l.id = t.location_id
      WHERE t.id = ${id}
    `;
    if (!trip) return res.status(404).json({ error: 'Not found' });
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

// POST /api/trips  { name, date_start, date_end, location_id, notes, addAllPeople? }
router.post('/', async (req, res, next) => {
  try {
    const { name, date_start, date_end, location_id, notes, addAllPeople } = req.body ?? {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });

    const tripId = await db.begin(async (sql) => {
      const [tripRow] = await sql`
        INSERT INTO trips (name, date_start, date_end, location_id, notes)
        VALUES (${String(name).trim()}, ${date_start || null}, ${date_end || null}, ${location_id || null}, ${notes || null})
        RETURNING id
      `;
      const id = tripRow.id;

      // Auto-populate roster with all active people (default on)
      if (addAllPeople !== false) {
        const people = await sql`
          SELECT id FROM people WHERE active = 1 ORDER BY sort_order
        `;
        for (const p of people) {
          await sql`
            INSERT INTO trip_participants (trip_id, person_id, attending) 
            VALUES (${id}, ${p.id}, 'unknown')
            ON CONFLICT (trip_id, person_id) DO NOTHING
          `;
        }
      }
      return id;
    });

    const [trip] = await db`
      SELECT t.*, l.name AS location_name, l.url AS location_url
      FROM trips t LEFT JOIN locations l ON l.id = t.location_id
      WHERE t.id = ${tripId}
    `;
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/trips/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db`SELECT * FROM trips WHERE id = ${id}`;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const fields = ['name', 'date_start', 'date_end', 'location_id', 'notes'];
    const updateObj: Record<string, any> = {};
    for (const f of fields) {
      if (f in (req.body ?? {})) {
        updateObj[f] = req.body[f] === '' ? null : req.body[f];
      }
    }

    if (Object.keys(updateObj).length > 0) {
      await db`
        UPDATE trips 
        SET ${db(updateObj, Object.keys(updateObj))} 
        WHERE id = ${id}
      `;
    }

    const [trip] = await db`
      SELECT t.*, l.name AS location_name, l.url AS location_url
      FROM trips t LEFT JOIN locations l ON l.id = t.location_id
      WHERE t.id = ${id}
    `;
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/trips/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db`DELETE FROM trips WHERE id = ${id}`;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
