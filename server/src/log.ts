import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

const ATT: Record<string, string> = { yes: 'Да', no: 'Не', unknown: 'Без отговор' };
const STATUS: Record<string, string> = { active: 'Активно', taken: 'Взето', discuss: 'За обсъждане' };
const LIST_LABEL: Record<string, string> = {
  people: 'Хора',
  meats: 'Месо',
  drinks: 'Напитки',
  locations: 'Места',
  'bring-items': 'Носим',
  'gear-items': 'Необходимо',
};

const personName = async (id: any): Promise<string | null> => {
  if (!id) return null;
  const [r] = await db`SELECT name FROM people WHERE id = ${id}`;
  return r?.name ?? null;
};

const participantName = async (id: any): Promise<string | null> => {
  if (!id) return null;
  const [r] = await db`
    SELECT pe.name 
    FROM trip_participants tp JOIN people pe ON pe.id = tp.person_id 
    WHERE tp.id = ${id}
  `;
  return r?.name ?? null;
};

function changedAspects(body: any): string {
  if (!body) return '';
  const parts: string[] = [];
  if ('attending' in body) parts.push(`присъствие: ${ATT[body.attending] ?? body.attending}`);
  if ('nights' in body) parts.push('нощувки');
  if (body.meats) parts.push('месо');
  if (body.drink_ids) parts.push('напитки');
  if (body.bring_item_ids) parts.push('багаж');
  if ('beer_note' in body || 'juice_note' in body || 'bring_note' in body) parts.push('бележки');
  return parts.length ? ` (${parts.join(', ')})` : '';
}

type Desc = { action: string; trip_id?: number | null } | null;

/** Build a friendly Bulgarian description for a mutating request. */
export async function describe(method: string, path: string, body: any): Promise<Desc> {
  let m;
  if (method === 'POST' && path === '/api/trips') return { action: `Създаде пътуване „${body?.name ?? ''}“` };

  if ((m = path.match(/^\/api\/trips\/(\d+)$/))) {
    if (method === 'PATCH') return { action: 'Промени детайли на пътуването', trip_id: +m[1] };
    if (method === 'DELETE') return { action: 'Изтри пътуване', trip_id: +m[1] };
  }
  if ((m = path.match(/^\/api\/trips\/(\d+)\/participants$/)) && method === 'POST') {
    const pName = body?.name ?? (await personName(body?.person_id)) ?? 'човек';
    return { action: `Добави в състава: ${pName}`, trip_id: +m[1] };
  }

  if ((m = path.match(/^\/api\/participants\/(\d+)$/))) {
    if (method === 'PUT') {
      const pName = (await participantName(m[1])) ?? 'участник';
      return { action: `Обнови ${pName}${changedAspects(body)}` };
    }
    if (method === 'DELETE') return { action: 'Премахна участник от състава' };
  }

  if ((m = path.match(/^\/api\/trips\/(\d+)\/shopping$/)) && method === 'POST')
    return { action: `Добави в пазар: ${body?.name ?? ''}`, trip_id: +m[1] };
  if ((m = path.match(/^\/api\/trips\/(\d+)\/shopping\/import$/)) && method === 'POST')
    return { action: 'Импортира списък за пазар от друго пътуване', trip_id: +m[1] };
  if (path.match(/^\/api\/shopping\/(\d+)$/)) {
    if (method === 'PATCH')
      return { action: `Промени продукт в пазар${body?.status ? ` → ${STATUS[body.status] ?? body.status}` : ''}` };
    if (method === 'DELETE') return { action: 'Изтри продукт от пазар' };
  }

  if ((m = path.match(/^\/api\/lists\/([\w-]+)$/)) && method === 'POST')
    return { action: `Добави в „${LIST_LABEL[m[1]] ?? m[1]}“: ${body?.name ?? ''}` };
  if ((m = path.match(/^\/api\/lists\/([\w-]+)\/(\d+)$/))) {
    if (method === 'PATCH') return { action: `Промени запис в „${LIST_LABEL[m[1]] ?? m[1]}“` };
    if (method === 'DELETE') return { action: `Изтри запис от „${LIST_LABEL[m[1]] ?? m[1]}“` };
  }

  if ((m = path.match(/^\/api\/trips\/(\d+)\/wheel\/pick$/)) && method === 'POST') {
    const pName = (await personName(body?.person_id)) ?? 'някой';
    return { action: `🎡 Колело: ${pName} отива на пазар`, trip_id: +m[1] };
  }
  if (path.match(/^\/api\/wheel\/duty\/(\d+)$/) && method === 'DELETE')
    return { action: 'Отмени дежурство от колелото' };

  return null;
}

function decodeActor(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Express middleware: logs every successful mutating request. */
export function activityLogger(req: Request, res: Response, next: NextFunction) {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  // Skip non-mutations and the log endpoint itself (it records its own events).
  if (!mutating || !req.path.startsWith('/api') || req.path.startsWith('/api/log')) return next();

  // Capture now: Express strips the mount prefix from req.path/req.method during
  // routing, so by the time the 'finish' event fires they no longer hold the full
  // path. Snapshot the values we need before handing off to the routers.
  const method = req.method;
  const path = req.path;
  const body = req.body;
  const actor = decodeActor(req.header('X-Actor') || undefined);

  res.on('finish', async () => {
    if (res.statusCode >= 400) return;
    try {
      const d = await describe(method, path, body);
      if (!d) return;
      await db`
        INSERT INTO activity_log (actor, method, path, action, trip_id)
        VALUES (${actor}, ${method}, ${path}, ${d.action}, ${d.trip_id ?? null})
      `;
    } catch (e) {
      console.error('activity log error:', e);
    }
  });
  next();
}
