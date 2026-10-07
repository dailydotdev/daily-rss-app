import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookieNames, getConfig } from '@/lib/config';
import { createPkce, createState, setTempCookie } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export const GET = (request: NextRequest): NextResponse => {
  const config = getConfig();
  const { verifier, challenge } = createPkce();
  const state = createState();

  const url = new URL(config.authorizeUrl);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: config.resource,
  }).toString();

  const response = NextResponse.redirect(url);
  setTempCookie(response, cookieNames.state, state);
  setTempCookie(response, cookieNames.verifier, verifier);

  const reconnectFeed = request.nextUrl.searchParams.get('feed');
  if (reconnectFeed && /^[A-Za-z0-9_-]{16,64}$/.test(reconnectFeed)) {
    setTempCookie(response, cookieNames.reconnectFeed, reconnectFeed);
  } else {
    response.cookies.delete(cookieNames.reconnectFeed);
  }

  return response;
};
