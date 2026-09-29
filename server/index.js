import './env.js'; // must be the first import — loads server/.env before other modules read process.env
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import classroomRoutes from './routes/classroom.js';

const app = express();
const PORT = process.env.CLASSROOM_SERVER_PORT || 4100;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'ess-classroom-integration' }));

app.use('/auth', authRoutes);
app.use('/api/classroom', classroomRoutes);

app.use((err, _req, res, _next) => {
  console.error('[ess-classroom-server] unhandled error:', err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`[ess-classroom-server] listening on http://localhost:${PORT}`);
});
