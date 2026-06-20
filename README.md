# 🏕️ Палатки — планер за излети

Уеб приложение, което замества Excel таблицата за организиране на палатков излет:
състав, месо по нощи, напитки, пазар, необходимо оборудване и жива „Бройка".

Всички списъци (хора, месо, напитки, места, неща за носене, необходимо) се пазят в
базата данни и захранват динамично всички падащи менюта. Поддържа множество пътувания.

## Стек
- **Клиент:** React + Vite + TypeScript + Tailwind CSS (UI на български)
- **Сървър:** Express + TypeScript (REST API)
- **База:** SQLite чрез `better-sqlite3` (файл `server/data/palatki.db`)

## Стартиране (локално)

```bash
npm run install:all   # инсталира root + server + client
npm run seed          # зарежда данните от оригиналния Excel (еднократно)
npm run dev           # стартира API (3001) + клиент (5173)
```

Отвори http://localhost:5173

> Бел.: клиентът проксира `/api` към сървъра. Сървърът слуша на `API_PORT` (по подразбиране 3001),
> нарочно различен от `PORT`, за да не се сблъсква с dev инструменти.

## Скриптове
- `npm run dev` — двата сървъра заедно
- `npm run seed` — (пре)зарежда базата от `server/src/seed-data.json`
- `npm run build` — production build на клиента

## Структура
```
server/
  src/
    schema.sql        # схема на базата
    db.ts             # връзка + инициализация (DB_PATH конфигурируем)
    seed.ts           # импорт от оригиналната таблица
    routes/           # lists, trips, participants, shopping, tally
client/
  src/
    api.ts            # типизиран API клиент
    store.tsx         # текущо пътуване + lookup списъци
    components/       # Layout, MultiSelect, Logo, ui
    pages/            # Trips, Roster, Drinks, Shopping, Gear, Tally, Lists
```

## За онлайн качване (по-късно)
- `DB_PATH` env променлива указва къде е SQLite файлът (трябва постоянен диск).
- API е stateless REST → лесно се слага зад един хост.
- Данновият слой е изолиран, така че при нужда SQLite може да се смени с Postgres
  без промяна на UI.
```
