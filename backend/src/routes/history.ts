import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      `SELECT id, conversation_id as "conversationId", sender, text, created_at as "createdAt"
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    );
    res.json({ sessionId, messages: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;