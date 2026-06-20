import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/**
 * Generic CRUD for the dynamic lookup lists.
 * Each list config declares which columns are writable.
 */
type ListConfig = {
  table: string;
  columns: string[]; // writable columns besides name/sort_order/active
  categories?: string[]; // allowed category values, if any
};

const LISTS: Record<string, ListConfig> = {
  people: { table: 'people', columns: [] },
  meats: { table: 'meats', columns: [] },
  drinks: { table: 'drinks', columns: ['category'], categories: ['alcohol', 'carbonated', 'noncarbonated'] },
  locations: { table: 'locations', columns: ['url'] },
  'bring-items': { table: 'bring_items', columns: [] },
  'gear-items': {
    table: 'gear_items',
    columns: ['category', 'note'],
    categories: ['mandatory', 'recommended', 'optional'],
  },
};

function getConfig(name: string): ListConfig {
  const cfg = LISTS[name];
  if (!cfg) {
    const err: any = new Error(`Unknown list: ${name}`);
    err.status = 404;
    throw err;
  }
  return cfg;
}

// GET /api/lists/:list  -> all rows (optionally ?active=1)
router.get('/:list', (req, res) => {
  const cfg = getConfig(req.params.list);
  const onlyActive = req.query.active === '1';
  const rows = db
    .prepare(`SELECT * FROM ${cfg.table} ${onlyActive ? 'WHERE active = 1' : ''} ORDER BY sort_order, name`)
    .all();
  res.json(rows);
});

// POST /api/lists/:list  -> create
router.post('/:list', (req, res) => {
  const cfg = getConfig(req.params.list);
  const { name, category, url, note } = req.body ?? {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (cfg.categories && !cfg.categories.includes(category)) {
    return res.status(400).json({ error: `category must be one of ${cfg.categories.join(', ')}` });
  }
  const cols = ['name', 'sort_order'];
  const vals: any[] = [String(name).trim(), nextSort(cfg.table)];
  if (cfg.columns.includes('category')) {
    cols.push('category');
    vals.push(category);
  }
  if (cfg.columns.includes('url')) {
    cols.push('url');
    vals.push(url ?? null);
  }
  if (cfg.columns.includes('note')) {
    cols.push('note');
    vals.push(note ?? null);
  }
  try {
    const info = db
      .prepare(`INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .run(...vals);
    res.status(201).json(db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(info.lastInsertRowid));
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Вече съществува' });
    throw e;
  }
});

// PATCH /api/lists/:list/:id -> update name/category/url/note/sort_order/active
router.patch('/:list/:id', (req, res) => {
  const cfg = getConfig(req.params.list);
  const existing = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const allowed = ['name', 'sort_order', 'active', ...cfg.columns];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (key in (req.body ?? {})) {
      if (key === 'category' && cfg.categories && !cfg.categories.includes(req.body[key])) {
        return res.status(400).json({ error: 'invalid category' });
      }
      sets.push(`${key} = ?`);
      vals.push(req.body[key]);
    }
  }
  if (!sets.length) return res.json(existing);
  vals.push(req.params.id);
  try {
    db.prepare(`UPDATE ${cfg.table} SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    res.json(db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(req.params.id));
  } catch (e: any) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Вече съществува' });
    throw e;
  }
});

// DELETE /api/lists/:list/:id
router.delete('/:list/:id', (req, res) => {
  const cfg = getConfig(req.params.list);
  db.prepare(`DELETE FROM ${cfg.table} WHERE id = ?`).run(req.params.id);
  res.status(204).end();
});

function nextSort(table: string): number {
  const row = db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM ${table}`).get() as { n: number };
  return row.n;
}

export default router;
