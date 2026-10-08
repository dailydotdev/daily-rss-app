export const FEED_SOURCES = [
  'foryou',
  'popular',
  'discussed',
  'bookmarks',
] as const;

export type FeedSource = (typeof FEED_SOURCES)[number];

export const ENABLED_FEED_SOURCES: readonly FeedSource[] = ['foryou'];

export const FEED_FORMATS = ['xml', 'json'] as const;

export type FeedFormat = (typeof FEED_FORMATS)[number];

export const feedMeta: Record<
  FeedSource,
  { title: string; description: string; path: string; homepage: string }
> = {
  foryou: {
    title: 'Your daily.dev feed',
    description: 'Your personalized For You feed from daily.dev.',
    path: '/feeds/foryou',
    homepage: 'https://daily.dev/',
  },
  popular: {
    title: 'Popular on daily.dev',
    description: 'The most upvoted posts across daily.dev right now.',
    path: '/feeds/popular',
    homepage: 'https://daily.dev/popular',
  },
  discussed: {
    title: 'Most discussed on daily.dev',
    description: 'The posts developers are talking about on daily.dev.',
    path: '/feeds/discussed',
    homepage: 'https://daily.dev/discussed',
  },
  bookmarks: {
    title: 'Your daily.dev bookmarks',
    description: 'Posts you saved on daily.dev, newest first.',
    path: '/bookmarks',
    homepage: 'https://daily.dev/bookmarks',
  },
};

export const parseFeedParam = (
  value: string,
): { source: FeedSource; format: FeedFormat } | null => {
  const match = /^([a-z]+)\.(xml|json)$/.exec(value);
  if (!match) {
    return null;
  }
  const [, source, format] = match;
  if (!ENABLED_FEED_SOURCES.includes(source as FeedSource)) {
    return null;
  }
  return { source: source as FeedSource, format: format as FeedFormat };
};
