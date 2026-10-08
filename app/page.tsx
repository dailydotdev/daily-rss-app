import { errorMessage } from '@/lib/errors';

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) => {
  const { error, deleted } = await searchParams;
  const errorText = errorMessage(error);

  return (
    <main>
      <header>
        <h1>daily.dev RSS</h1>
        <p className="muted">
          Your personalized daily.dev feed, popular posts, most discussed and
          your bookmarks as private RSS and JSON feeds for Reeder, NetNewsWire,
          Folo, Feedly or any other reader. Sign in with daily.dev, copy a URL,
          done.
        </p>
        <p className="links">
          <a href="https://github.com/dailydotdev/daily-rss-app">Source on GitHub</a>
          <a href="https://docs.daily.dev/public-api/">daily.dev API docs</a>
        </p>
      </header>

      {errorText && <div className="error">{errorText}</div>}
      {deleted && <div className="success">Your feeds were deleted.</div>}

      <a className="signin" href="/api/auth/login">
        <img src="/sign-in-with-daily-dev.png" alt="Sign in with daily.dev" />
      </a>

      <div className="card">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            Sign in with daily.dev and approve read-only access. No API token
            to copy, and nothing is ever written to your account.
          </li>
          <li>
            You get a private page with feed URLs for your For You feed,
            popular posts, most discussed posts and your bookmarks, in RSS 2.0
            and JSON Feed.
          </li>
          <li>
            Each item links to the original article and to the discussion on
            daily.dev, with the summary, source, read time, upvotes and
            comments.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>Privacy</h2>
        <p className="muted">
          Your daily.dev tokens are stored encrypted and used only to fetch
          your feeds. Feed URLs are unguessable, but treat them like passwords:
          anyone with the URL can read the feed. Delete your feeds any time
          from your feed page, or disconnect this app from daily.dev →
          Settings → API → Connected apps.
        </p>
      </div>
    </main>
  );
};

export default Page;
