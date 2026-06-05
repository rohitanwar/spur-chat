import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.created_at, 
              (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as first_message
       FROM conversations c
       ORDER BY c.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;