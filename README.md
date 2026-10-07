# daily.dev RSS

Your personalized daily.dev feed, popular posts, most discussed posts and your bookmarks as private RSS 2.0 and JSON Feed URLs for any reader. People sign in with daily.dev, approve read-only access, and get a private page with their feed URLs. No API token to copy.

Built on the [daily.dev public API](https://docs.daily.dev/public-api/) with [Sign in with daily.dev](https://docs.daily.dev/oauth-apps/). Next.js App Router running on [vinext](https://github.com/cloudflare/vinext), deployed to Cloudflare Workers, with tokens and rendered feeds in Workers KV.

## How it works

1. `GET /api/auth/login` starts the OAuth 2.1 flow (authorization code + PKCE, confidential client, scopes `openid profile offline_access read`).
2. `GET /api/auth/callback` exchanges the code, fetches `/public/v1/profile`, creates an unguessable feed id and stores the tokens, encrypted with AES-256-GCM, in KV.
3. `GET /f/<id>` is the private page with feed URLs and a delete button.
4. `GET /f/<id>/<source>.<xml|json>` renders the feed. `source` is `foryou`, `popular`, `discussed` or `bookmarks`.

Feeds are rendered from a KV cache that lives `FEED_CACHE_SECONDS` (8 hours by default). Reader polling never reaches daily.dev more often than that, so one feed costs about 90 API requests a month, inside the free quota of 200 requests per 30 days. A lock prevents two concurrent polls from refreshing the token twice (refresh tokens rotate on every use).

When the refresh token has expired because nobody fetched the feed for a while, the feed keeps returning `200` with a single "reconnect" item instead of breaking, and the feed page offers a re-sign-in that keeps the same URLs.

## Run it locally

1. Create an OAuth app at [daily.dev → Settings → API → OAuth apps](https://daily.dev/settings/api#oauth-apps) with the redirect URI `http://localhost:3006/api/auth/callback`.
2. `cp .env.example .env.local`, fill in the client id and secret, and `TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)`.
3. `pnpm install && pnpm run dev`, then open http://localhost:3006.

The dev server runs the app inside workerd, the Workers runtime, with a local KV namespace. No Cloudflare account is needed to develop.

## Deploy to Cloudflare Workers

1. Sign in with `pnpm exec cf auth login`, or set `CLOUDFLARE_API_TOKEN` (the **Edit Cloudflare Workers** template) in CI.
2. Set `CLOUDFLARE_ACCOUNT_ID`, or add `accountId` at the top level of `cloudflare.config.ts`.
3. Create the KV namespace with `pnpm exec cf kv namespaces create` and put its id in `FEEDS: bindings.kv({ id: "<id>" })`.
4. Set the secrets declared in `cloudflare.config.ts` with `pnpm exec cf workers secrets update`: `DAILY_CLIENT_ID`, `DAILY_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `APP_URL` and, if you don't use production daily.dev, `DAILY_API_URL`.
5. Add `<APP_URL>/api/auth/callback` to your OAuth app's redirect URIs on daily.dev.
6. `pnpm run deploy`.

## Configuration

| Variable | Default | What it does |
|---|---|---|
| `FEED_CACHE_SECONDS` | `28800` | How long a rendered feed is served from cache. Lower it for Plus users, who have no monthly quota. |
| `FEED_ITEMS` | `30` | Posts per feed, 1 to 50. |
| `DAILY_API_URL` | `https://api.daily.dev` | API origin. |

## Security notes

- The client secret and the encryption key never leave the server.
- Access and refresh tokens are encrypted at rest. Rotating `TOKEN_ENCRYPTION_KEY` invalidates every stored feed; people reconnect from their feed page.
- The refresh lock is best effort: KV has no atomic set-if-absent, so two polls landing in the same second can still both refresh. The loser's feed shows the reconnect item until the next sign-in.
- Feed URLs are bearer secrets. Responses are `Cache-Control: private` and `X-Robots-Tag: noindex`.
- Only the `read` scope is requested; the app can't change anything on a daily.dev account.
- People can revoke access from daily.dev → Settings → API → Connected apps, or delete their feeds from the feed page, which removes the stored tokens immediately.
