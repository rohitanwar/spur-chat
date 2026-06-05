import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  apiKey: config.llmApiKey,
  baseURL: config.llmBaseUrl,
});

const SYSTEM_PROMPT = `You are a helpful support agent for a fictional e-commerce store "SpurGoods".
Answer clearly and concisely. Use the following store policies:
- Shipping: Free shipping on orders over $50. Standard delivery 5-7 business days. Express delivery 2-3 days for $9.99. We ship to USA and Canada only.
- Return/Refund: 30-day return policy. Items must be unworn, unwashed, with tags. Refunds processed within 5 business days after we receive the return. Customer pays return shipping unless item is defective.
- Support hours: Monday-Friday 9am-6pm EST. Email support@spurgoods.com for after-hours.
- Payment methods: Credit cards, PayPal, Apple Pay, Google Pay.
- If asked about anything else, politely say you'll connect them with a human agent.`;

export interface LlmResponse {
  reply: string;
  error?: string;
}

export async function generateReply(
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<LlmResponse> {
  try {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
    ];

    const completion = await openai.chat.completions.create({
      model: config.llmModel,
      messages,
      max_tokens: 300,
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'I’m not sure how to answer that.';
    return { reply };
  } catch (error: any) {
    console.error('LLM error:', error);
    if (error.status === 401) {
      return { reply: 'Configuration error: Invalid API key.', error: 'invalid_key' };
    }
    if (error.status === 429) {
      return { reply: 'We are experiencing high load. Please try again in a moment.', error: 'rate_limited' };
    }
    if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
      return { reply: 'The AI is taking too long. Please try again.', error: 'timeout' };
    }
    return {
      reply: 'Sorry, I encountered an error while processing your request. Please try again.',
      error: 'unknown',
    };
  }
}