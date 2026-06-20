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
router.get('/:list', async (req, res, next) => {
  try {
    const cfg = getConfig(req.params.list);
    const onlyActive = req.query.active === '1';
    const rows = onlyActive
      ? await db`SELECT * FROM ${db(cfg.table)} WHERE active = 1 ORDER BY sort_order, name`
      : await db`SELECT * FROM ${db(cfg.table)} ORDER BY sort_order, name`;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/lists/:list  -> create
router.post('/:list', async (req, res, next) => {
  try {
    const cfg = getConfig(req.params.list);
    const { name, category, url, note } = req.body ?? {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (cfg.categories && !cfg.categories.includes(category)) {
      return res.status(400).json({ error: `category must be one of ${cfg.categories.join(', ')}` });
    }

    const sortVal = await nextSort(cfg.table);
    const insertObj: Record<string, any> = {
      name: String(name).trim(),
      sort_order: sortVal,
    };
    if (cfg.columns.includes('category')) {
      insertObj.category = category;
    }
    if (cfg.columns.includes('url')) {
      insertObj.url = url ?? null;
    }
    if (cfg.columns.includes('note')) {
      insertObj.note = note ?? null;
    }

    const [inserted] = await db`
      INSERT INTO ${db(cfg.table)} ${db(insertObj)}
      RETURNING *
    `;
    res.status(201).json(inserted);
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ error: 'Вече съществува' });
    next(e);
  }
});

// PATCH /api/lists/:list/:id -> update name/category/url/note/sort_order/active
router.patch('/:list/:id', async (req, res, next) => {
  try {
    const cfg = getConfig(req.params.list);
    const id = Number(req.params.id);
    const [existing] = await db`SELECT * FROM ${db(cfg.table)} WHERE id = ${id}`;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const allowed = ['name', 'sort_order', 'active', ...cfg.columns];
    const updateObj: Record<string, any> = {};
    for (const key of allowed) {
      if (key in (req.body ?? {})) {
        if (key === 'category' && cfg.categories && !cfg.categories.includes(req.body[key])) {
          return res.status(400).json({ error: 'invalid category' });
        }
        updateObj[key] = req.body[key];
      }
    }
    if (Object.keys(updateObj).length === 0) return res.json(existing);

    const [updated] = await db`
      UPDATE ${db(cfg.table)} 
      SET ${db(updateObj, Object.keys(updateObj))} 
      WHERE id = ${id}
      RETURNING *
    `;
    res.json(updated);
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ error: 'Вече съществува' });
    next(e);
  }
});

// DELETE /api/lists/:list/:id
router.delete('/:list/:id', async (req, res, next) => {
  try {
    const cfg = getConfig(req.params.list);
    await db`DELETE FROM ${db(cfg.table)} WHERE id = ${Number(req.params.id)}`;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

async function nextSort(table: string): Promise<number> {
  const [row] = await db`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM ${db(table)}`;
  return row.n;
}

export default router;
