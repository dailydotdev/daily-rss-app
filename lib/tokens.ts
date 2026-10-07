import { decrypt, encrypt } from './crypto';
import { requestToken, TokenRequestError, type TokenResponse } from './oauth';
import { saveFeed, type FeedRecord } from './store';

export class ReconnectRequiredError extends Error {
  constructor() {
    super('The daily.dev connection expired. Sign in again to reconnect.');
  }
}

const REFRESH_LEEWAY_MS = 60_000;

export const applyTokens = (
  record: FeedRecord,
  tokens: TokenResponse,
): FeedRecord => ({
  ...record,
  accessToken: encrypt(tokens.access_token),
  refreshToken: tokens.refresh_token
    ? encrypt(tokens.refresh_token)
    : record.refreshToken,
  expiresAt: Date.now() + (tokens.expires_in ?? 900) * 1000,
  needsReconnect: false,
});

export const getValidAccessToken = async (
  record: FeedRecord,
): Promise<{ accessToken: string; record: FeedRecord }> => {
  if (record.needsReconnect) {
    throw new ReconnectRequiredError();
  }

  if (record.expiresAt - REFRESH_LEEWAY_MS > Date.now()) {
    return { accessToken: decrypt(record.accessToken), record };
  }

  try {
    const tokens = await requestToken({
      grant_type: 'refresh_token',
      refresh_token: decrypt(record.refreshToken),
    });
    const updated = applyTokens(record, tokens);
    await saveFeed(updated);
    return { accessToken: tokens.access_token, record: updated };
  } catch (err) {
    if (
      err instanceof TokenRequestError &&
      (err.code === 'invalid_grant' || err.status === 400 || err.status === 401)
    ) {
      await saveFeed({ ...record, needsReconnect: true });
      throw new ReconnectRequiredError();
    }
    throw err;
  }
};
