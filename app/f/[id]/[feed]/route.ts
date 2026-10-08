import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { DailyApiError, getPosts } from '@/lib/daily';
import { parseFeedParam } from '@/lib/feeds';
import { contentTypeFor, renderFeed, renderReconnectFeed } from '@/lib/render';
import {
  acquireLock,
  getCachedFeed,
  getFeed,
  releaseLock,
  setCachedFeed,
} from '@/lib/store';
import { getValidAccessToken, ReconnectRequiredError } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const RECONNECT_CACHE_SECONDS = 3600;

const feedResponse = (
  body: string,
  contentType: string,
  maxAge: number,
): NextResponse =>
  new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `private, max-age=${maxAge}`,
      'X-Robots-Tag': 'noindex',
    },
  });

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; feed: string }> },
): Promise<NextResponse> => {
  const { id, feed } = await params;
  const parsed = parseFeedParam(feed);
  if (!parsed) {
    return new NextResponse('Not found', { status: 404 });
  }

  const record = await getFeed(id);
  if (!record) {
    return new NextResponse('Not found', { status: 404 });
  }

  const config = getConfig();
  const { source, format } = parsed;
  const contentType = contentTypeFor(format);
  const ctx = {
    source,
    format,
    feedUrl: `${config.appUrl}/f/${id}/${feed}`,
    ownerName: record.name,
  };

  const cached = await getCachedFeed(id, source, format);
  if (cached) {
    return feedResponse(cached, contentType, config.cacheSeconds);
  }

  const locked = await acquireLock(id);
  if (!locked) {
    return new NextResponse('Feed is being refreshed, try again shortly', {
      status: 503,
      headers: { 'Retry-After': '30' },
    });
  }

  try {
    const { accessToken } = await getValidAccessToken(record);
    const posts = await getPosts(source, accessToken, config.feedItems);
    const body = renderFeed(ctx, posts);
    await setCachedFeed(id, source, format, body, config.cacheSeconds);
    return feedResponse(body, contentType, config.cacheSeconds);
  } catch (err) {
    if (err instanceof ReconnectRequiredError) {
      const body = renderReconnectFeed(ctx, `${config.appUrl}/f/${id}`);
      await setCachedFeed(id, source, format, body, RECONNECT_CACHE_SECONDS);
      return feedResponse(body, contentType, RECONNECT_CACHE_SECONDS);
    }
    console.error('Feed refresh failed', err);
    const rateLimited = err instanceof DailyApiError && err.status === 429;
    return new NextResponse(
      rateLimited
        ? 'The daily.dev API quota for this feed is used up, try again later'
        : 'daily.dev is unavailable right now, try again later',
      {
        status: 503,
        headers: { 'Retry-After': rateLimited ? '3600' : '600' },
      },
    );
  } finally {
    await releaseLock(id);
  }
};
