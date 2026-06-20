/**
 * Seeds the database from the original Палатки.xlsx (exported to seed-data.json).
 * Idempotent-ish: wipes trip-scoped + lookup tables and reloads. Safe to re-run.
 */
import { db } from './db.js';
import data from './seed-data.json' with { type: 'json' };

type Row = (string | null)[];
const sheet = (name: string): Row[] => (data as Record<string, Row[]>)["name" in data ? "" : name] ?? [];

const clean = (s: string | null | undefined) => (s ?? '').replace(/"+/g, '"').trim();
const splitList = (s: string | null | undefined) =>
  clean(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

// Drink category map (alcohol | carbonated | noncarbonated)
const DRINK_CATEGORY: Record<string, 'alcohol' | 'carbonated' | 'noncarbonated'> = {
  'Бира': 'alcohol',
  'Съмърсби': 'alcohol',
  'Мента': 'alcohol',
  'Розов Джин': 'alcohol',
  'Йегер': 'alcohol',
  'Водка': 'alcohol',
  'Няма да пия': 'alcohol',
  'Спрайт': 'carbonated',
  'Фанта маднес': 'carbonated',
  'Фанта тропикал': 'carbonated',
  'Кока Кола': 'carbonated',
  'Кока Кола - без захар': 'carbonated',
  'Газирана вода': 'carbonated',
  'Розов тоник': 'carbonated',
  'Вода': 'noncarbonated',
  'Сок': 'noncarbonated',
};

async function reset(sql: any) {
  await sql`
    TRUNCATE TABLE 
      participant_meats,
      participant_drinks,
      participant_bring,
      trip_participants,
      shopping_items,
      trips,
      gear_items,
      bring_items,
      locations,
      drinks,
      meats,
      people,
      activity_log
    RESTART IDENTITY CASCADE;
  `;
}

async function runSeed() {
  const result = await db.begin(async (sql) => {
    await reset(sql);

    // ---- People (master order from roster) ----
    const roster = sheet('Местоположение').slice(1);
    const personId = new Map<string, number>();
    for (let i = 0; i < roster.length; i++) {
      const r = roster[i];
      const name = clean(r[0]);
      if (name && !personId.has(name)) {
        const [row] = await sql`
          INSERT INTO people (name, sort_order) 
          VALUES (${name}, ${i}) 
          RETURNING id
        `;
        personId.set(name, row.id);
      }
    }

    // ---- Meats ----
    const meatId = new Map<string, number>();
    const ensureMeat = async (txnSql: any, name: string) => {
      const n = clean(name);
      if (!n) return null;
      if (!meatId.has(n)) {
        const [row] = await txnSql`
          INSERT INTO meats (name, sort_order) 
          VALUES (${n}, ${meatId.size}) 
          RETURNING id
        `;
        meatId.set(n, row.id);
      }
      return meatId.get(n)!;
    };
    for (const m of ['Пилешко', 'Свинско', 'Наденици (карначета)']) {
      await ensureMeat(sql, m);
    }

    // ---- Drinks ----
    const drinkId = new Map<string, number>(); // key: `${name}|${category}`
    const ensureDrink = async (txnSql: any, name: string, category: 'alcohol' | 'carbonated' | 'noncarbonated') => {
      const n = clean(name);
      if (!n) return null;
      const key = `${n}|${category}`;
      if (!drinkId.has(key)) {
        const [row] = await txnSql`
          INSERT INTO drinks (name, category, sort_order) 
          VALUES (${n}, ${category}, ${drinkId.size}) 
          RETURNING id
        `;
        drinkId.set(key, row.id);
      }
      return drinkId.get(key)!;
    };
    for (const [n, cat] of Object.entries(DRINK_CATEGORY)) {
      await ensureDrink(sql, n, cat);
    }

    // ---- Locations ----
    const locId = new Map<string, number>();
    const locs = ['Плаж Шкорпиловци', 'Отбивката'];
    for (let i = 0; i < locs.length; i++) {
      const n = locs[i];
      const [row] = await sql`
        INSERT INTO locations (name, sort_order) 
        VALUES (${n}, ${i}) 
        RETURNING id
      `;
      locId.set(n, row.id);
    }

    // ---- Bring items (from "Мога да донеса") ----
    const bringId = new Map<string, number>();
    const normBring = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const ensureBring = async (txnSql: any, name: string) => {
      const n = normBring(clean(name).replace(/"/g, '').trim());
      if (!n) return null;
      const key = n.toLowerCase();
      if (!bringId.has(key)) {
        const [row] = await txnSql`
          INSERT INTO bring_items (name, sort_order) 
          VALUES (${n}, ${bringId.size}) 
          RETURNING id
        `;
        bringId.set(key, row.id);
      }
      return bringId.get(key)!;
    };

    // ---- Gear (Необходимо) ----
    const gear = sheet('Необходимо').slice(1);
    const cats: ['mandatory' | 'recommended' | 'optional', number][] = [
      ['mandatory', 0],
      ['recommended', 2],
      ['optional', 4],
    ];
    for (const [cat, col] of cats) {
      let order = 0;
      for (const r of gear) {
        const v = clean(r[col]);
        if (v) {
          await sql`
            INSERT INTO gear_items (name, category, sort_order) 
            VALUES (${v}, ${cat}, ${order++})
          `;
        }
      }
    }

    // ---- Trip ----
    const [tripRow] = await sql`
      INSERT INTO trips (name, date_start, date_end, location_id, notes)
      VALUES ('Палатки — Шкорпиловци', '2026-06-19', '2026-06-21', ${locId.get('Плаж Шкорпиловци') || null}, '19 - 21.06')
      RETURNING id
    `;
    const tripId = tripRow.id;

    // ---- Participants ----
    const attendMap: Record<string, 'yes' | 'no' | 'unknown'> = { 'Да': 'yes', 'Не': 'no' };
    const drinkRows = new Map<string, Row>();
    for (const r of sheet('Алкохол и безалкохолно').slice(1)) drinkRows.set(clean(r[0]), r);

    for (const r of roster) {
      const name = clean(r[0]);
      if (!name) continue;
      const pid = personId.get(name)!;
      const attending = attendMap[clean(r[1])] ?? 'unknown';
      const nights = r[2] ? Math.round(Number(r[2])) : null;

      const d = drinkRows.get(name);
      const beer_note = d ? clean(d[2]) || null : null;
      const juice_note = d ? clean(d[5]) || null : null;

      const [tpRow] = await sql`
        INSERT INTO trip_participants (trip_id, person_id, attending, nights, bring_note, beer_note, juice_note)
        VALUES (${tripId}, ${pid}, ${attending}, ${nights}, ${null}, ${beer_note}, ${juice_note})
        RETURNING id
      `;
      const tpId = tpRow.id;

      // meats: night1 (col3), night2 (col4), other (col5)
      const slots: ['night1' | 'night2' | 'other', number][] = [
        ['night1', 3],
        ['night2', 4],
        ['other', 5],
      ];
      for (const [slot, col] of slots) {
        for (const m of splitList(r[col])) {
          const mid = await ensureMeat(sql, m);
          if (mid) {
            await sql`
              INSERT INTO participant_meats (participant_id, slot, meat_id) 
              VALUES (${tpId}, ${slot}, ${mid})
              ON CONFLICT (participant_id, slot, meat_id) DO NOTHING
            `;
          }
        }
      }

      // bring items (col6)
      for (const b of splitList(r[6])) {
        const bid = await ensureBring(sql, b);
        if (bid) {
          await sql`
            INSERT INTO participant_bring (participant_id, bring_item_id) 
            VALUES (${tpId}, ${bid})
            ON CONFLICT (participant_id, bring_item_id) DO NOTHING
          `;
        }
      }

      // drinks: alcohol (col1), carbonated (col3), noncarbonated (col4)
      if (d) {
        const drinkCols: [number, 'alcohol' | 'carbonated' | 'noncarbonated'][] = [
          [1, 'alcohol'],
          [3, 'carbonated'],
          [4, 'noncarbonated'],
        ];
        for (const [col, cat] of drinkCols) {
          for (const name2 of splitList(d[col])) {
            const did = await ensureDrink(sql, name2, cat);
            if (did) {
              await sql`
                INSERT INTO participant_drinks (participant_id, drink_id) 
                VALUES (${tpId}, ${did})
                ON CONFLICT (participant_id, drink_id) DO NOTHING
              `;
            }
          }
        }
      }
    }

    // ---- Shopping list (Пазар) ----
    const pazar = sheet('Пазар').slice(1);
    const shopCols: ['fruit_veg' | 'other_food' | 'consumables', number][] = [
      ['fruit_veg', 0],
      ['other_food', 1],
      ['consumables', 2],
    ];
    for (const [cat, col] of shopCols) {
      let order = 0;
      for (const r of pazar) {
        const v = clean(r[col]);
        if (v) {
          await sql`
            INSERT INTO shopping_items (trip_id, category, name, sort_order) 
            VALUES (${tripId}, ${cat}, ${v}, ${order++})
          `;
        }
      }
    }

    return {
      people: personId.size,
      meats: meatId.size,
      drinks: drinkId.size,
      bring: bringId.size,
      trip: tripId,
    };
  });

  return result;
}

runSeed()
  .then((result) => {
    console.log('Seed complete:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
