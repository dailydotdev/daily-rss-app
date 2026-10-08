import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  accountId: "40ad70c54e5f931d964841dce2b5d066",
  worker: defineWorker({
    name: "daily-rss-app",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-07",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    workersDev: false,
    previewUrls: false,
    env: {
      ASSETS: bindings.assets(),
      FEEDS: bindings.kv({ id: "ed69226a6eb24b048b48ea28d9dcff6f" }),
      DAILY_CLIENT_ID: bindings.secret(),
      DAILY_CLIENT_SECRET: bindings.secret(),
      DAILY_API_URL: bindings.secret(),
      APP_URL: bindings.secret(),
      TOKEN_ENCRYPTION_KEY: bindings.secret(),
      FEED_CACHE_SECONDS: bindings.secret(),
    },
  }),
});
