import express from 'express';
import cors from 'cors';
import { config } from './config';
import { runMigrations } from './db';
import chatRoutes from './routes/chat';
import historyRoutes from './routes/history';
import sessionRoutes from './routes/sessions';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/chat/sessions', sessionRoutes);
app.use('/api/chat/history', historyRoutes);   // must come before the other chat route
app.use('/api/chat', chatRoutes);

// Health check
app.get('/health', (_, res) => res.send('OK'));

app.use(errorHandler);

(async () => {
  await runMigrations();
  app.listen(config.port, () => {
    console.log(`Backend running on port ${config.port}`);
  });
})();