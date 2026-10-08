import { env } from 'cloudflare:workers';
import { FEED_SOURCES, type FeedSource } from './feeds';

export type FeedRecord = {
  id: string;
  userId: string;
  username: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: string;
  needsReconnect?: boolean;
};

type SetOptions = { ex?: number; nx?: boolean };

const KV_MIN_TTL_SECONDS = 60;

const kv = (): KVNamespace => env.FEEDS;

const get = <T>(key: string): Promise<T | null> => kv().get<T>(key, 'json');

const set = async (
  key: string,
  value: unknown,
  options: SetOptions = {},
): Promise<'OK' | null> => {
  if (options.nx && (await kv().get(key)) !== null) {
    return null;
  }
  await kv().put(
    key,
    JSON.stringify(value),
    options.ex
      ? { expirationTtl: Math.max(options.ex, KV_MIN_TTL_SECONDS) }
      : {},
  );
  return 'OK';
};

const del = async (...keys: string[]): Promise<void> => {
  await Promise.all(keys.map((key) => kv().delete(key)));
};

const feedKey = (id: string): string => `feed:${id}`;
const cacheKey = (id: string, source: FeedSource, format: string): string =>
  `cache:${id}:${source}:${format}`;
const lockKey = (id: string): string => `lock:${id}`;
const userKey = (userId: string): string => `user:${userId}`;

export const getFeed = (id: string): Promise<FeedRecord | null> =>
  get<FeedRecord>(feedKey(id));

export const saveFeed = async (record: FeedRecord): Promise<void> => {
  await set(feedKey(record.id), record);
};

export const linkFeedToUser = async (record: FeedRecord): Promise<void> => {
  await set(userKey(record.userId), record.id);
};

export const getFeedForUser = async (
  userId: string,
): Promise<FeedRecord | null> => {
  const id = await get<string>(userKey(userId));
  return id ? getFeed(id) : null;
};

export const deleteFeed = async (record: FeedRecord): Promise<void> => {
  const { id } = record;
  const keys = [feedKey(id), lockKey(id), userKey(record.userId)];
  FEED_SOURCES.forEach((source) => {
    keys.push(cacheKey(id, source, 'xml'), cacheKey(id, source, 'json'));
  });
  await del(...keys);
};

export const getCachedFeed = (
  id: string,
  source: FeedSource,
  format: string,
): Promise<string | null> => get<string>(cacheKey(id, source, format));

export const setCachedFeed = async (
  id: string,
  source: FeedSource,
  format: string,
  body: string,
  ttlSeconds: number,
): Promise<void> => {
  await set(cacheKey(id, source, format), body, { ex: ttlSeconds });
};

export const acquireLock = async (id: string): Promise<boolean> => {
  const result = await set(lockKey(id), '1', { nx: true, ex: 30 });
  return result === 'OK';
};

export const releaseLock = async (id: string): Promise<void> => {
  await del(lockKey(id));
};
