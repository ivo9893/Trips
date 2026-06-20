-- Палатки — camping trip planner schema
PRAGMA foreign_keys = ON;

-- ========== Shared lookup tables (reusable across trips) ==========

CREATE TABLE IF NOT EXISTS people (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS meats (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);

-- category: alcohol | carbonated | noncarbonated
CREATE TABLE IF NOT EXISTS drinks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('alcohol','carbonated','noncarbonated')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (name, category)
);

CREATE TABLE IF NOT EXISTS locations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  url        TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bring_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1
);

-- category: mandatory | recommended | optional
CREATE TABLE IF NOT EXISTS gear_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('mandatory','recommended','optional')),
  note       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  UNIQUE (name, category)
);

-- ========== Trips ==========

CREATE TABLE IF NOT EXISTS trips (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  date_start  TEXT,
  date_end    TEXT,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- attending: yes | no | unknown ; nights nullable
CREATE TABLE IF NOT EXISTS trip_participants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id    INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  attending  TEXT NOT NULL DEFAULT 'unknown' CHECK (attending IN ('yes','no','unknown')),
  nights     INTEGER,
  bring_note TEXT,       -- free text extras for "мога да донеса"
  beer_note  TEXT,       -- "предпочитания за бира и съмърсби"
  juice_note TEXT,       -- "предпочитания за сок и студен чай"
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (trip_id, person_id)
);

-- meat choice per night slot. slot: night1 | night2 | other
CREATE TABLE IF NOT EXISTS participant_meats (
  participant_id INTEGER NOT NULL REFERENCES trip_participants(id) ON DELETE CASCADE,
  slot           TEXT NOT NULL CHECK (slot IN ('night1','night2','other')),
  meat_id        INTEGER NOT NULL REFERENCES meats(id) ON DELETE CASCADE,
  PRIMARY KEY (participant_id, slot, meat_id)
);

CREATE TABLE IF NOT EXISTS participant_drinks (
  participant_id INTEGER NOT NULL REFERENCES trip_participants(id) ON DELETE CASCADE,
  drink_id       INTEGER NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
  PRIMARY KEY (participant_id, drink_id)
);

CREATE TABLE IF NOT EXISTS participant_bring (
  participant_id INTEGER NOT NULL REFERENCES trip_participants(id) ON DELETE CASCADE,
  bring_item_id  INTEGER NOT NULL REFERENCES bring_items(id) ON DELETE CASCADE,
  PRIMARY KEY (participant_id, bring_item_id)
);

-- ========== Shopping list ==========
-- category: fruit_veg | other_food | consumables
-- status:   active | taken | discuss
CREATE TABLE IF NOT EXISTS shopping_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id    INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('fruit_veg','other_food','consumables')),
  name       TEXT NOT NULL,
  quantity   TEXT,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','taken','discuss')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========== Shopping duty (fortune wheel picks) ==========
-- A pick makes the person "safe" (exempt) for the next 6 months.
CREATE TABLE IF NOT EXISTS shopping_duty (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  trip_id    INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  chosen_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ========== Activity log ==========
CREATE TABLE IF NOT EXISTS activity_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  at      TEXT NOT NULL DEFAULT (datetime('now')),
  actor   TEXT,            -- the current "me" name, or null/Гост
  method  TEXT NOT NULL,   -- POST/PUT/PATCH/DELETE/EVENT
  path    TEXT,
  action  TEXT NOT NULL,   -- friendly Bulgarian description
  trip_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tp_trip ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_shop_trip ON shopping_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_duty_person ON shopping_duty(person_id);
CREATE INDEX IF NOT EXISTS idx_log_id ON activity_log(id);
