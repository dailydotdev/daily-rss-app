import { getConfig } from './config';
import { feedMeta, type FeedSource } from './feeds';

export type Post = {
  id: string;
  title: string;
  url?: string | null;
  image?: string | null;
  summary?: string | null;
  type?: string;
  publishedAt?: string | null;
  createdAt: string;
  commentsPermalink?: string;
  readTime?: number | null;
  numUpvotes: number;
  numComments: number;
  tags?: string[];
  source?: { name: string; handle?: string } | null;
  author?: { name: string } | null;
  bookmarkedAt?: string;
};

export type Profile = {
  id: string;
  name?: string;
  username?: string;
};

export class DailyApiError extends Error {
  status: number;

  constructor(status: number, body: string) {
    super(`daily.dev API responded ${status}: ${body.slice(0, 200)}`);
    this.status = status;
  }
}

const apiFetch = async <T,>(path: string, accessToken: string): Promise<T> => {
  const res = await fetch(`${getConfig().publicApiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new DailyApiError(res.status, await res.text());
  }
  return (await res.json()) as T;
};

export const getProfile = (accessToken: string): Promise<Profile> =>
  apiFetch<Profile>('/profile', accessToken);

export const getPosts = async (
  source: FeedSource,
  accessToken: string,
  limit: number,
): Promise<Post[]> => {
  const { data } = await apiFetch<{ data: Post[] }>(
    `${feedMeta[source].path}?limit=${limit}`,
    accessToken,
  );
  return data;
};
