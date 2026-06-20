import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

const tripWithLocation = `
  SELECT t.*, l.name AS location_name, l.url AS location_url
  FROM trips t LEFT JOIN locations l ON l.id = t.location_id
`;

// GET /api/trips
router.get('/', (_req, res) => {
  const trips = db.prepare(`${tripWithLocation} ORDER BY t.date_start DESC, t.id DESC`).all();
  res.json(trips);
});

// GET /api/trips/:id
router.get('/:id', (req, res) => {
  const trip = db.prepare(`${tripWithLocation} WHERE t.id = ?`).get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Not found' });
  res.json(trip);
});

// POST /api/trips  { name, date_start, date_end, location_id, notes, addAllPeople? }
router.post('/', (req, res) => {
  const { name, date_start, date_end, location_id, notes, addAllPeople } = req.body ?? {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });

  const create = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO trips (name, date_start, date_end, location_id, notes)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(String(name).trim(), date_start || null, date_end || null, location_id || null, notes || null);
    const tripId = Number(info.lastInsertRowid);

    // Auto-populate roster with all active people (default on)
    if (addAllPeople !== false) {
      const people = db.prepare('SELECT id FROM people WHERE active = 1 ORDER BY sort_order').all() as {
        id: number;
      }[];
      const ins = db.prepare(
        'INSERT OR IGNORE INTO trip_participants (trip_id, person_id, attending) VALUES (?, ?, ?)',
      );
      for (const p of people) ins.run(tripId, p.id, 'unknown');
    }
    return tripId;
  });

  const id = create();
  res.status(201).json(db.prepare(`${tripWithLocation} WHERE t.id = ?`).get(id));
});

// PATCH /api/trips/:id
router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const fields = ['name', 'date_start', 'date_end', 'location_id', 'notes'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const f of fields) {
    if (f in (req.body ?? {})) {
      sets.push(`${f} = ?`);
      vals.push(req.body[f] === '' ? null : req.body[f]);
    }
  }
  if (sets.length) {
    vals.push(req.params.id);
    db.prepare(`UPDATE trips SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }
  res.json(db.prepare(`${tripWithLocation} WHERE t.id = ?`).get(req.params.id));
});

// DELETE /api/trips/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
