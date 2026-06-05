import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { cacheService } from '../cache/cacheService';
import { generateReply } from './llmService';
import { Message } from '../types';
import { config } from '../config';

export interface ChatRequest {
  message: string;
  sessionId?: string;   // optional conversation ID
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
}

export async function handleMessage(req: ChatRequest): Promise<ChatResponse> {
  // 1. Validate
  if (!req.message || req.message.trim().length === 0) {
    throw Object.assign(new Error('Message cannot be empty'), { statusCode: 400 });
  }
  if (req.message.length > config.maxMessageLength) {
    throw Object.assign(
      new Error(`Message too long (max ${config.maxMessageLength} characters)`),
      { statusCode: 400 }
    );
  }

  const sessionId = req.sessionId || uuidv4();

  // 2. Ensure conversation exists
  await pool.query(
    `INSERT INTO conversations (id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [sessionId]
  );

  // 3. Save user message
  const userMsgId = uuidv4();
  await pool.query(
    `INSERT INTO messages (id, conversation_id, sender, text) VALUES ($1, $2, 'user', $3)`,
    [userMsgId, sessionId, req.message.trim()]
  );

  // 4. Load recent history for LLM context
  let historyMessages: Message[];
  // Try Redis cache first
  const cached = await cacheService.get(`conv:${sessionId}:history`);
  if (cached) {
    historyMessages = JSON.parse(cached);
  } else {
    const result = await pool.query<Message>(
      `SELECT id, conversation_id as "conversationId", sender, text, created_at as "createdAt"
       FROM messages WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, config.maxHistoryMessages * 2] // *2 because each exchange is 2 messages
    );
    historyMessages = result.rows;
  }

  // Convert to LLM format
  const llmHistory = historyMessages.map((m) => ({
    role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.text,
  }));

  // 5. Call LLM
  const llmResult = await generateReply(llmHistory);

  // 6. Save AI reply
  const aiMsgId = uuidv4();
  await pool.query(
    `INSERT INTO messages (id, conversation_id, sender, text) VALUES ($1, $2, 'ai', $3)`,
    [aiMsgId, sessionId, llmResult.reply]
  );

  // 7. Update cache with full conversation (append the new user + AI messages)
  const updatedHistory = [
    ...historyMessages,
    { id: userMsgId, conversationId: sessionId, sender: 'user' as const, text: req.message.trim(), createdAt: new Date() },
    { id: aiMsgId, conversationId: sessionId, sender: 'ai' as const, text: llmResult.reply, createdAt: new Date() },
  ];
  await cacheService.set(
    `conv:${sessionId}:history`,
    JSON.stringify(updatedHistory),
    3600
  );

  return { reply: llmResult.reply, sessionId };
}