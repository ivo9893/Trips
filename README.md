# 🏕️ Палатки — планер за излети

Уеб приложение, което замества Excel таблицата за организиране на палатков излет:
състав, месо по нощи, напитки, пазар, необходимо оборудване, жива „Бройка",
колело на късмета за дежурния по пазар и дневник на действията.

Всички списъци (хора, месо, напитки, места, неща за носене, необходимо) се пазят в
базата данни и захранват динамично всички падащи менюта. Поддържа множество пътувания.

## Функции
- **Хора** — присъствие, нощувки, месо по нощи, „мога да донеса"
- **Напитки** — алкохол / газирано / негазирано + бележки
- **Пазар** — три категории със статуси (Взето / За обсъждане), + импорт на списък от друго пътуване
- **Необходимо** — задължително / препоръчително / допълнително
- **Бройка** — автоматично пресметнати количества (месо, напитки, оборудване, нощувки)
- **Колело на късмета** — избира кой отива на пазар; избраният е освободен за 6 месеца
- **Дневник** — хронология на всички действия, с автор
- **Лична бройка** — на първо отваряне избираш кой си; вижда твоите данни (с превключвател „Всички")

## Стек
- **Клиент:** React + Vite + TypeScript + Tailwind CSS (UI на български)
- **Сървър:** Express + TypeScript (REST API)
- **База:** PostgreSQL чрез библиотеката [`postgres`](https://github.com/porsager/postgres)

## Стартиране (локално)

Нужен е работещ PostgreSQL. Задай връзката чрез `DATABASE_URL`
(по подразбиране `postgres://postgres:postgres@localhost:5432/palatki`):

```bash
# server/.env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/palatki
```

```bash
npm run install:all   # инсталира root + server + client
npm run seed          # зарежда данните от оригиналния Excel (еднократно)
npm run dev           # стартира API (3001) + клиент (5173)
```

Отвори http://localhost:5173

> Схемата се прилага автоматично при стартиране (`CREATE TABLE IF NOT EXISTS`).
> Клиентът проксира `/api` към сървъра на порт 3001 (виж `client/vite.config.ts`).

## Скриптове
- `npm run dev` — двата сървъра заедно (server чете `server/.env`)
- `npm run seed` — (пре)зарежда базата от `server/src/seed-data.json`
- `npm run build` — инсталира зависимости и билдва клиент + сървър (за продукция)
- `npm start` — пуска продукционния сървър (`node dist/index.js`), който сервира и клиента

## Структура
```
server/
  src/
    schema.sql        # схема на базата (PostgreSQL)
    db.ts             # връзка (DATABASE_URL) + initSchema
    seed.ts           # импорт от оригиналната таблица (seed-data.json)
    log.ts            # middleware за дневника + описания на действията
    routes/           # lists, trips, participants, shopping, tally, wheel, log
client/
  src/
    api.ts            # типизиран API клиент
    store.tsx         # текущо пътуване, lookup списъци, самоличност
    components/       # Layout, MultiSelect, Logo, IdentityGate, ui
    pages/            # Trips, Roster, Drinks, Shopping, Gear, Tally, Wheel, Log, Lists
```

## Деплой (Render.com)
Един уеб сървис (Express сервира и React клиента от `client/dist`):

- **Build Command:** `npm install; npm run build`
- **Start Command:** `npm start`
- **Environment:**
  - `DATABASE_URL` — връзката към PostgreSQL базата (задължително)
  - `PORT` — подава се автоматично от Render

> `npm run build` инсталира зависимостите на клиента и сървъра (с `--include=dev`,
> за да е наличен TypeScript при `NODE_ENV=production`), билдва клиента и компилира
> сървъра, като копира `schema.sql` в `dist/` (нужно при стартиране).
