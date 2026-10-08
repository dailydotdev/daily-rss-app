const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
};

const resolveAppUrl = (): string => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3006';
};

export const getConfig = () => {
  const apiUrl = process.env.DAILY_API_URL ?? 'https://api.daily.dev';
  const appUrl = resolveAppUrl();
  const publicApiUrl = `${apiUrl}/public/v1`;

  return {
    clientId: required('DAILY_CLIENT_ID'),
    clientSecret: required('DAILY_CLIENT_SECRET'),
    apiUrl,
    appUrl,
    publicApiUrl,
    resource: publicApiUrl,
    scopes: 'openid profile offline_access read',
    redirectUri: `${appUrl}/api/auth/callback`,
    authorizeUrl: `${apiUrl}/auth/oauth2/authorize`,
    tokenUrl: `${apiUrl}/auth/oauth2/token`,
    revokeUrl: `${apiUrl}/auth/oauth2/revoke`,
    encryptionKey: required('TOKEN_ENCRYPTION_KEY'),
    cacheSeconds: Number(process.env.FEED_CACHE_SECONDS ?? 28800),
    feedItems: Math.min(Math.max(Number(process.env.FEED_ITEMS ?? 30), 1), 50),
  };
};

export const cookieNames = {
  state: 'dd_oauth_state',
  verifier: 'dd_oauth_verifier',
  reconnectFeed: 'dd_reconnect_feed',
};
