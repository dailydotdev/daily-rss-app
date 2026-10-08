import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookieNames, getConfig } from '@/lib/config';
import { getProfile } from '@/lib/daily';
import { createFeedId, requestToken } from '@/lib/oauth';
import { errorUrl, type ErrorCode } from '@/lib/errors';
import {
  getFeed,
  getFeedForUser,
  linkFeedToUser,
  saveFeed,
  type FeedRecord,
} from '@/lib/store';
import { applyTokens } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const redirectWithError = (appUrl: string, code: ErrorCode): NextResponse =>
  NextResponse.redirect(errorUrl(appUrl, code));

const clearTempCookies = (response: NextResponse): void => {
  response.cookies.delete(cookieNames.state);
  response.cookies.delete(cookieNames.verifier);
  response.cookies.delete(cookieNames.reconnectFeed);
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const config = getConfig();
  const params = request.nextUrl.searchParams;
  const error = params.get('error');

  if (error) {
    console.error(
      'Authorization failed',
      error,
      params.get('error_description'),
    );
    return redirectWithError(
      config.appUrl,
      error === 'access_denied' ? 'access_denied' : 'authorization_failed',
    );
  }

  const code = params.get('code');
  const state = params.get('state');
  const expectedState = request.cookies.get(cookieNames.state)?.value;
  const verifier = request.cookies.get(cookieNames.verifier)?.value;
  const reconnectFeedId = request.cookies.get(cookieNames.reconnectFeed)?.value;

  if (!code || !state || state !== expectedState || !verifier) {
    return redirectWithError(config.appUrl, 'invalid_state');
  }

  try {
    const tokens = await requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    });

    if (!tokens.refresh_token) {
      return redirectWithError(config.appUrl, 'missing_refresh_token');
    }

    const profile = await getProfile(tokens.access_token);
    const reconnectFeed = reconnectFeedId
      ? await getFeed(reconnectFeedId)
      : null;
    const existing =
      reconnectFeed?.userId === profile.id
        ? reconnectFeed
        : await getFeedForUser(profile.id);
    const base: FeedRecord = existing
      ? existing
      : {
            id: createFeedId(),
            userId: profile.id,
            username: profile.username ?? profile.id,
            name: profile.name ?? profile.username ?? 'daily.dev user',
            accessToken: '',
            refreshToken: '',
            expiresAt: 0,
            createdAt: new Date().toISOString(),
          };

    const record = applyTokens(base, tokens);
    await saveFeed(record);
    await linkFeedToUser(record);

    const response = NextResponse.redirect(`${config.appUrl}/f/${record.id}`);
    clearTempCookies(response);
    return response;
  } catch (err) {
    console.error('Sign-in failed', err);
    return redirectWithError(config.appUrl, 'token_exchange_failed');
  }
};
