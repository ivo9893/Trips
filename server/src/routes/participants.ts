import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Assemble a participant with all nested selections.
async function getParticipant(sqlClient: any, id: number) {
  const [p] = (await sqlClient`
    SELECT tp.*, pe.name AS person_name
    FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
    WHERE tp.id = ${id}
  `) as any[];
  if (!p) return null;

  const meats = (await sqlClient`
    SELECT slot, meat_id FROM participant_meats WHERE participant_id = ${id}
  `) as { slot: string; meat_id: number }[];
  
  p.meats = {
    night1: meats.filter((m) => m.slot === 'night1').map((m) => m.meat_id),
    night2: meats.filter((m) => m.slot === 'night2').map((m) => m.meat_id),
    other: meats.filter((m) => m.slot === 'other').map((m) => m.meat_id),
  };

  const drinkRows = (await sqlClient`
    SELECT drink_id FROM participant_drinks WHERE participant_id = ${id}
  `) as { drink_id: number }[];
  p.drink_ids = drinkRows.map((r) => r.drink_id);

  const bringRows = (await sqlClient`
    SELECT bring_item_id FROM participant_bring WHERE participant_id = ${id}
  `) as { bring_item_id: number }[];
  p.bring_item_ids = bringRows.map((r) => r.bring_item_id);

  return p;
}

// GET /api/trips/:tripId/participants
router.get('/trips/:tripId/participants', async (req, res, next) => {
  try {
    const tripId = Number(req.params.tripId);
    const ids = (await db`
      SELECT tp.id FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
      WHERE tp.trip_id = ${tripId} ORDER BY pe.sort_order, pe.name
    `) as { id: number }[];
    const participants = await Promise.all(ids.map((r) => getParticipant(db, r.id)));
    res.json(participants.filter(Boolean));
  } catch (err) {
    next(err);
  }
});

// GET /api/participants/:id
router.get('/participants/:id', async (req, res, next) => {
  try {
    const p = await getParticipant(db, Number(req.params.id));
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

// POST /api/trips/:tripId/participants  { person_id } OR { name } (creates person)
router.post('/trips/:tripId/participants', async (req, res, next) => {
  try {
    const tripId = Number(req.params.tripId);
    let { person_id, name } = req.body ?? {};

    const participantId = await db.begin(async (sql) => {
      if (!person_id && name) {
        const n = String(name).trim();
        const [existing] = await sql`SELECT id FROM people WHERE name = ${n}`;
        if (existing) {
          person_id = existing.id;
        } else {
          const [sortRow] = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM people`;
          const [insRow] = await sql`
            INSERT INTO people (name, sort_order) VALUES (${n}, ${sortRow.n}) RETURNING id
          `;
          person_id = insRow.id;
        }
      }
      if (!person_id) {
        const err: any = new Error('person_id or name required');
        err.status = 400;
        throw err;
      }

      await sql`
        INSERT INTO trip_participants (trip_id, person_id, attending) 
        VALUES (${tripId}, ${person_id}, 'unknown')
        ON CONFLICT (trip_id, person_id) DO NOTHING
      `;

      const [row] = await sql`
        SELECT id FROM trip_participants WHERE trip_id = ${tripId} AND person_id = ${person_id}
      `;
      return row.id;
    });

    const p = await getParticipant(db, participantId);
    res.status(201).json(p);
  } catch (err) {
    next(err);
  }
});

// PUT /api/participants/:id  -> full update of scalar fields + all selections
router.put('/participants/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db`SELECT * FROM trip_participants WHERE id = ${id}`;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const b = req.body ?? {};
    await db.begin(async (sql) => {
      if (['attending', 'nights', 'bring_note', 'beer_note', 'juice_note'].some((k) => k in b)) {
        const cur = existing as any;
        await sql`
          UPDATE trip_participants
          SET 
            attending = ${b.attending ?? cur.attending}, 
            nights = ${b.nights === undefined ? cur.nights : b.nights === '' ? null : Number(b.nights)}, 
            bring_note = ${b.bring_note ?? cur.bring_note}, 
            beer_note = ${b.beer_note ?? cur.beer_note}, 
            juice_note = ${b.juice_note ?? cur.juice_note}, 
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `;
      }

      if (b.meats) {
        await sql`DELETE FROM participant_meats WHERE participant_id = ${id}`;
        for (const slot of ['night1', 'night2', 'other'] as const) {
          for (const mid of b.meats[slot] ?? []) {
            await sql`
              INSERT INTO participant_meats (participant_id, slot, meat_id) 
              VALUES (${id}, ${slot}, ${mid})
              ON CONFLICT (participant_id, slot, meat_id) DO NOTHING
            `;
          }
        }
      }
      if (b.drink_ids) {
        await sql`DELETE FROM participant_drinks WHERE participant_id = ${id}`;
        for (const did of b.drink_ids) {
          await sql`
            INSERT INTO participant_drinks (participant_id, drink_id) 
            VALUES (${id}, ${did})
            ON CONFLICT (participant_id, drink_id) DO NOTHING
          `;
        }
      }
      if (b.bring_item_ids) {
        await sql`DELETE FROM participant_bring WHERE participant_id = ${id}`;
        for (const bid of b.bring_item_ids) {
          await sql`
            INSERT INTO participant_bring (participant_id, bring_item_id) 
            VALUES (${id}, ${bid})
            ON CONFLICT (participant_id, bring_item_id) DO NOTHING
          `;
        }
      }
    });

    const p = await getParticipant(db, id);
    res.json(p);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/participants/:id  -> remove person from trip
router.delete('/participants/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db`DELETE FROM trip_participants WHERE id = ${id}`;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
