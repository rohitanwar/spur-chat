import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!config.redisUrl) {
    console.log('Redis disabled');
    return null;
  }
  if (!redisClient) {
    redisClient = createClient({ url: config.redisUrl });
    redisClient.on('error', (err) => console.error('Redis error:', err));
    await redisClient.connect();
    console.log('Redis connected');
  }
  return redisClient;
}

export const cacheService = {
  async get(key: string): Promise<string | null> {
    const client = await getRedisClient();
    if (!client) return null;
    return client.get(key);
  },
  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    await client.setEx(key, ttlSeconds, value);
  },
  async del(key: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    await client.del(key);
  },
};