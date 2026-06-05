import express from 'express';
import cors from 'cors';
import { config } from './config';
import { runMigrations } from './db';
import chatRoutes from './routes/chat';
import historyRoutes from './routes/history';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/chat', historyRoutes);

// Health check
app.get('/health', (_, res) => res.send('OK'));

app.use(errorHandler);

(async () => {
  await runMigrations();
  app.listen(config.port, () => {
    console.log(`Backend running on port ${config.port}`);
  });
})();