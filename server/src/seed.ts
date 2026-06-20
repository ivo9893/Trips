/**
 * Seeds the database from the original Палатки.xlsx (exported to seed-data.json).
 * Idempotent-ish: wipes trip-scoped + lookup tables and reloads. Safe to re-run.
 */
import { db } from './db.js';
import data from './seed-data.json' with { type: 'json' };

type Row = (string | null)[];
const sheet = (name: string): Row[] => (data as Record<string, Row[]>)[name] ?? [];

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

function reset() {
  db.exec(`
    DELETE FROM participant_meats;
    DELETE FROM participant_drinks;
    DELETE FROM participant_bring;
    DELETE FROM trip_participants;
    DELETE FROM shopping_items;
    DELETE FROM trips;
    DELETE FROM gear_items;
    DELETE FROM bring_items;
    DELETE FROM locations;
    DELETE FROM drinks;
    DELETE FROM meats;
    DELETE FROM people;
    DELETE FROM sqlite_sequence;
  `);
}

const run = db.transaction(() => {
  reset();

  // ---- People (master order from roster) ----
  const roster = sheet('Местоположение').slice(1);
  const insPerson = db.prepare('INSERT INTO people (name, sort_order) VALUES (?, ?)');
  const personId = new Map<string, number>();
  roster.forEach((r, i) => {
    const name = clean(r[0]);
    if (name && !personId.has(name)) {
      const id = Number(insPerson.run(name, i).lastInsertRowid);
      personId.set(name, id);
    }
  });

  // ---- Meats ----
  const insMeat = db.prepare('INSERT INTO meats (name, sort_order) VALUES (?, ?)');
  const meatId = new Map<string, number>();
  const ensureMeat = (name: string) => {
    const n = clean(name);
    if (!n) return null;
    if (!meatId.has(n)) meatId.set(n, Number(insMeat.run(n, meatId.size).lastInsertRowid));
    return meatId.get(n)!;
  };
  ['Пилешко', 'Свинско', 'Наденици (карначета)'].forEach(ensureMeat);

  // ---- Drinks ----
  const insDrink = db.prepare('INSERT INTO drinks (name, category, sort_order) VALUES (?, ?, ?)');
  const drinkId = new Map<string, number>(); // key: `${name}|${category}`
  const ensureDrink = (name: string, category: 'alcohol' | 'carbonated' | 'noncarbonated') => {
    const n = clean(name);
    if (!n) return null;
    const key = `${n}|${category}`;
    if (!drinkId.has(key)) drinkId.set(key, Number(insDrink.run(n, category, drinkId.size).lastInsertRowid));
    return drinkId.get(key)!;
  };
  for (const [n, cat] of Object.entries(DRINK_CATEGORY)) ensureDrink(n, cat);

  // ---- Locations ----
  const insLoc = db.prepare('INSERT INTO locations (name, sort_order) VALUES (?, ?)');
  const locId = new Map<string, number>();
  ['Плаж Шкорпиловци', 'Отбивката'].forEach((n, i) =>
    locId.set(n, Number(insLoc.run(n, i).lastInsertRowid)),
  );

  // ---- Bring items (from "Мога да донеса") ----
  const insBring = db.prepare('INSERT INTO bring_items (name, sort_order) VALUES (?, ?)');
  const bringId = new Map<string, number>();
  // normalise capitalisation duplicates (Маса/маса, Стол/стол)
  const normBring = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const ensureBring = (name: string) => {
    const n = normBring(clean(name).replace(/"/g, '').trim());
    if (!n) return null;
    const key = n.toLowerCase();
    if (!bringId.has(key)) bringId.set(key, Number(insBring.run(n, bringId.size).lastInsertRowid));
    return bringId.get(key)!;
  };

  // ---- Gear (Необходимо) ----
  const insGear = db.prepare('INSERT INTO gear_items (name, category, sort_order) VALUES (?, ?, ?)');
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
      if (v) insGear.run(v, cat, order++);
    }
  }

  // ---- Trip ----
  const tripId = Number(
    db
      .prepare(
        `INSERT INTO trips (name, date_start, date_end, location_id, notes)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run('Палатки — Шкорпиловци', '2026-06-19', '2026-06-21', locId.get('Плаж Шкорпиловци'), '19 - 21.06')
      .lastInsertRowid,
  );

  // ---- Participants ----
  const attendMap: Record<string, 'yes' | 'no' | 'unknown'> = { 'Да': 'yes', 'Не': 'no' };
  const insTP = db.prepare(
    `INSERT INTO trip_participants (trip_id, person_id, attending, nights, bring_note, beer_note, juice_note)
     VALUES (@trip, @person, @attending, @nights, @bring_note, @beer_note, @juice_note)`,
  );
  const insPM = db.prepare('INSERT OR IGNORE INTO participant_meats (participant_id, slot, meat_id) VALUES (?, ?, ?)');
  const insPD = db.prepare('INSERT OR IGNORE INTO participant_drinks (participant_id, drink_id) VALUES (?, ?)');
  const insPB = db.prepare('INSERT OR IGNORE INTO participant_bring (participant_id, bring_item_id) VALUES (?, ?)');

  // index drinks sheet by trimmed name
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

    const tpId = Number(
      insTP.run({
        trip: tripId,
        person: pid,
        attending,
        nights,
        bring_note: null,
        beer_note,
        juice_note,
      }).lastInsertRowid,
    );

    // meats: night1 (col3), night2 (col4), other (col5)
    const slots: ['night1' | 'night2' | 'other', number][] = [
      ['night1', 3],
      ['night2', 4],
      ['other', 5],
    ];
    for (const [slot, col] of slots) {
      for (const m of splitList(r[col])) {
        const mid = ensureMeat(m);
        if (mid) insPM.run(tpId, slot, mid);
      }
    }

    // bring items (col6)
    for (const b of splitList(r[6])) {
      const bid = ensureBring(b);
      if (bid) insPB.run(tpId, bid);
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
          const did = ensureDrink(name2, cat);
          if (did) insPD.run(tpId, did);
        }
      }
    }
  }

  // ---- Shopping list (Пазар) ----
  const insShop = db.prepare(
    'INSERT INTO shopping_items (trip_id, category, name, sort_order) VALUES (?, ?, ?, ?)',
  );
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
      if (v) insShop.run(tripId, cat, v, order++);
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

const result = run();
console.log('Seed complete:', result);
