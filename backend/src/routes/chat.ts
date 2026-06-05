import { Router, Request, Response, NextFunction } from 'express';
import { handleMessage } from '../services/chatService';

const router = Router();

router.post('/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, sessionId } = req.body;
    const result = await handleMessage({ message, sessionId });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;