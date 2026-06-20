import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Assemble a participant with all nested selections.
function getParticipant(id: number) {
  const p = db
    .prepare(
      `SELECT tp.*, pe.name AS person_name
       FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
       WHERE tp.id = ?`,
    )
    .get(id) as any;
  if (!p) return null;

  const meats = db.prepare('SELECT slot, meat_id FROM participant_meats WHERE participant_id = ?').all(id) as {
    slot: string;
    meat_id: number;
  }[];
  p.meats = {
    night1: meats.filter((m) => m.slot === 'night1').map((m) => m.meat_id),
    night2: meats.filter((m) => m.slot === 'night2').map((m) => m.meat_id),
    other: meats.filter((m) => m.slot === 'other').map((m) => m.meat_id),
  };
  p.drink_ids = (
    db.prepare('SELECT drink_id FROM participant_drinks WHERE participant_id = ?').all(id) as {
      drink_id: number;
    }[]
  ).map((r) => r.drink_id);
  p.bring_item_ids = (
    db.prepare('SELECT bring_item_id FROM participant_bring WHERE participant_id = ?').all(id) as {
      bring_item_id: number;
    }[]
  ).map((r) => r.bring_item_id);
  return p;
}

// GET /api/trips/:tripId/participants
router.get('/trips/:tripId/participants', (req, res) => {
  const ids = db
    .prepare(
      `SELECT tp.id FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id
       WHERE tp.trip_id = ? ORDER BY pe.sort_order, pe.name`,
    )
    .all(req.params.tripId) as { id: number }[];
  res.json(ids.map((r) => getParticipant(r.id)));
});

// GET /api/participants/:id
router.get('/participants/:id', (req, res) => {
  const p = getParticipant(Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// POST /api/trips/:tripId/participants  { person_id } OR { name } (creates person)
router.post('/trips/:tripId/participants', (req, res) => {
  const tripId = Number(req.params.tripId);
  let { person_id, name } = req.body ?? {};

  const op = db.transaction(() => {
    if (!person_id && name) {
      const n = String(name).trim();
      const existing = db.prepare('SELECT id FROM people WHERE name = ?').get(n) as { id: number } | undefined;
      if (existing) person_id = existing.id;
      else {
        const sort = (db.prepare('SELECT COALESCE(MAX(sort_order),-1)+1 n FROM people').get() as { n: number }).n;
        person_id = Number(db.prepare('INSERT INTO people (name, sort_order) VALUES (?, ?)').run(n, sort).lastInsertRowid);
      }
    }
    if (!person_id) {
      const err: any = new Error('person_id or name required');
      err.status = 400;
      throw err;
    }
    const info = db
      .prepare('INSERT OR IGNORE INTO trip_participants (trip_id, person_id, attending) VALUES (?, ?, ?)')
      .run(tripId, person_id, 'unknown');
    const row = db
      .prepare('SELECT id FROM trip_participants WHERE trip_id = ? AND person_id = ?')
      .get(tripId, person_id) as { id: number };
    return row.id;
  });

  const id = op();
  res.status(201).json(getParticipant(id));
});

// PUT /api/participants/:id  -> full update of scalar fields + all selections
router.put('/participants/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM trip_participants WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const b = req.body ?? {};
  const update = db.transaction(() => {
    if (['attending', 'nights', 'bring_note', 'beer_note', 'juice_note'].some((k) => k in b)) {
      const cur = existing as any;
      db.prepare(
        `UPDATE trip_participants
         SET attending = ?, nights = ?, bring_note = ?, beer_note = ?, juice_note = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(
        b.attending ?? cur.attending,
        b.nights === undefined ? cur.nights : b.nights === '' ? null : b.nights,
        b.bring_note ?? cur.bring_note,
        b.beer_note ?? cur.beer_note,
        b.juice_note ?? cur.juice_note,
        id,
      );
    }

    if (b.meats) {
      db.prepare('DELETE FROM participant_meats WHERE participant_id = ?').run(id);
      const ins = db.prepare('INSERT OR IGNORE INTO participant_meats (participant_id, slot, meat_id) VALUES (?, ?, ?)');
      for (const slot of ['night1', 'night2', 'other'] as const) {
        for (const mid of b.meats[slot] ?? []) ins.run(id, slot, mid);
      }
    }
    if (b.drink_ids) {
      db.prepare('DELETE FROM participant_drinks WHERE participant_id = ?').run(id);
      const ins = db.prepare('INSERT OR IGNORE INTO participant_drinks (participant_id, drink_id) VALUES (?, ?)');
      for (const did of b.drink_ids) ins.run(id, did);
    }
    if (b.bring_item_ids) {
      db.prepare('DELETE FROM participant_bring WHERE participant_id = ?').run(id);
      const ins = db.prepare('INSERT OR IGNORE INTO participant_bring (participant_id, bring_item_id) VALUES (?, ?)');
      for (const bid of b.bring_item_ids) ins.run(id, bid);
    }
  });
  update();
  res.json(getParticipant(id));
});

// DELETE /api/participants/:id  -> remove person from trip
router.delete('/participants/:id', (req, res) => {
  db.prepare('DELETE FROM trip_participants WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
