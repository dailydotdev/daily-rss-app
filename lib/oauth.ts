import { createHash, randomBytes } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { getConfig } from './config';

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
};

export class TokenRequestError extends Error {
  status: number;
  code?: string;

  constructor(status: number, body: Record<string, unknown>) {
    super(`Token request failed (${status}): ${JSON.stringify(body)}`);
    this.status = status;
    this.code = typeof body.error === 'string' ? body.error : undefined;
  }
}

const base64Url = (buffer: Buffer): string => buffer.toString('base64url');

export const createPkce = () => {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

export const createState = (): string => base64Url(randomBytes(16));

export const createFeedId = (): string => base64Url(randomBytes(24));

export const requestToken = async (
  params: Record<string, string>,
): Promise<TokenResponse> => {
  const config = getConfig();
  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      resource: config.resource,
      ...params,
    }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new TokenRequestError(res.status, body);
  }

  return body as TokenResponse;
};

export const setTempCookie = (
  response: NextResponse,
  name: string,
  value: string,
): void => {
  response.cookies.set(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
};
