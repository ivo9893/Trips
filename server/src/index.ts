import express from 'express';
import cors from 'cors';
import './db.js';
import listsRouter from './routes/lists.js';
import tripsRouter from './routes/trips.js';
import participantsRouter from './routes/participants.js';
import shoppingRouter from './routes/shopping.js';
import tallyRouter from './routes/tally.js';
import wheelRouter from './routes/wheel.js';
import logRouter from './routes/log.js';
import { activityLogger } from './log.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(activityLogger); // records every successful mutating request

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/lists', listsRouter);
app.use('/api/trips', tripsRouter);
app.use('/api', participantsRouter); // /participants/:id ...
app.use('/api', shoppingRouter); // /trips/:tripId/shopping ...
app.use('/api', tallyRouter); // /trips/:tripId/tally
app.use('/api', wheelRouter); // /trips/:tripId/wheel ...
app.use('/api/log', logRouter); // activity log

// Centralised error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Use a dedicated var so we don't collide with PORT injected by dev tooling/Vite.
const PORT = Number(process.env.API_PORT) || 3001;
app.listen(PORT, () => console.log(`🏕️  Палатки API on http://localhost:${PORT}`));
