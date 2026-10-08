import { notFound } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { FEED_SOURCES, feedMeta } from '@/lib/feeds';
import { getFeed } from '@/lib/store';

export const dynamic = 'force-dynamic';

const formatHours = (seconds: number): string => {
  const hours = seconds / 3600;
  return hours >= 1 ? `${Math.round(hours)} hours` : `${Math.round(seconds / 60)} minutes`;
};

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const record = await getFeed(id);
  if (!record) {
    notFound();
  }

  const config = getConfig();
  const base = `${config.appUrl}/f/${id}`;
  const refreshesPerDay = Math.max(1, Math.round(86400 / config.cacheSeconds));

  return (
    <main>
      <header>
        <h1>Your daily.dev feeds</h1>
        <p className="muted">
          Signed in as <strong>{record.name}</strong> (@{record.username}).
          Subscribe to any of the URLs below in your reader. Keep this page's
          address private: anyone with it can read your feeds.
        </p>
        <p className="links">
          <a href="https://github.com/dailydotdev/daily-rss-app">Source on GitHub</a>
          <a href="https://docs.daily.dev/public-api/">daily.dev API docs</a>
        </p>
      </header>

      {record.needsReconnect && (
        <div className="error">
          The daily.dev connection for these feeds expired.{' '}
          <a href={`/api/auth/login?feed=${id}`}>Sign in again</a> to
          reconnect. Your feed URLs stay the same.
        </div>
      )}

      <div className="card">
        <h2>Feed URLs</h2>
        <table>
          <thead>
            <tr>
              <th>Feed</th>
              <th>RSS</th>
              <th>JSON Feed</th>
            </tr>
          </thead>
          <tbody>
            {FEED_SOURCES.map((source) => (
              <tr key={source}>
                <td>
                  <strong>{feedMeta[source].title}</strong>
                  <div className="muted">{feedMeta[source].description}</div>
                </td>
                <td>
                  <a href={`${base}/${source}.xml`}>{source}.xml</a>
                </td>
                <td>
                  <a href={`${base}/${source}.json`}>{source}.json</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>How often it updates</h2>
        <p className="muted">
          Each feed asks daily.dev for new posts at most every{' '}
          {formatHours(config.cacheSeconds)}, about {refreshesPerDay} times a
          day, no matter how often your reader polls. That keeps a feed inside
          the free daily.dev API quota of 200 requests per 30 days. Every feed
          you subscribe to uses its own share, so on a free account stick to
          one or two. <a href="https://daily.dev/plus">Plus</a> removes the
          monthly quota.
        </p>
        <p className="muted">
          If no reader fetches your feeds for a couple of days, the daily.dev
          connection expires and the feed shows a single "reconnect" item.
          Sign in again from this page and it picks up where it left off.
        </p>
      </div>

      <div className="card">
        <h2>Stop</h2>
        <p className="muted">
          Deleting removes the stored tokens and all feed URLs on this page
          immediately. You can also revoke access from daily.dev → Settings →
          API → Connected apps.
        </p>
        <form action={`/f/${id}/delete`} method="post" className="actions">
          <button type="submit" className="danger">Delete these feeds</button>
        </form>
      </div>
    </main>
  );
};

export default Page;
