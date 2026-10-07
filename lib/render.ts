import type { Post } from './daily';
import { feedMeta, type FeedFormat, type FeedSource } from './feeds';

type FeedContext = {
  source: FeedSource;
  format: FeedFormat;
  feedUrl: string;
  ownerName: string;
};

type Item = {
  id: string;
  title: string;
  url: string;
  externalUrl?: string;
  date: string;
  html: string;
  tags: string[];
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeHtml = escapeXml;

const postToItem = (post: Post): Item => {
  const discussUrl = post.commentsPermalink ?? `https://daily.dev/posts/${post.id}`;
  const link = post.url || discussUrl;
  const meta = [
    post.source?.name,
    post.readTime ? `${post.readTime} min read` : null,
    `${post.numUpvotes} upvotes`,
    `${post.numComments} comments`,
  ]
    .filter(Boolean)
    .join(' · ');
  const parts = [
    post.image ? `<p><img src="${escapeHtml(post.image)}" alt="" /></p>` : '',
    post.summary ? `<p>${escapeHtml(post.summary)}</p>` : '',
    `<p>${escapeHtml(meta)}</p>`,
    `<p><a href="${escapeHtml(discussUrl)}">Discuss on daily.dev</a></p>`,
  ];

  return {
    id: discussUrl,
    title: post.title || 'Untitled post',
    url: link,
    externalUrl: post.url && post.url !== discussUrl ? post.url : undefined,
    date: post.bookmarkedAt ?? post.publishedAt ?? post.createdAt,
    html: parts.filter(Boolean).join('\n'),
    tags: post.tags ?? [],
  };
};

const reconnectItem = (appUrl: string): Item => ({
  id: `${appUrl}/reconnect/${new Date().toISOString().slice(0, 10)}`,
  title: 'Reconnect your daily.dev account to keep this feed updating',
  url: appUrl,
  date: new Date().toISOString(),
  html: `<p>This feed hasn't been read for a while, so its daily.dev connection expired. Open <a href="${escapeHtml(appUrl)}">${escapeHtml(appUrl)}</a>, sign in with daily.dev again, and the feed URL you already subscribed to will start updating.</p>`,
  tags: [],
});

const renderRss = (ctx: FeedContext, items: Item[]): string => {
  const meta = feedMeta[ctx.source];
  const title =
    ctx.source === 'foryou' || ctx.source === 'bookmarks'
      ? `${meta.title} (${ctx.ownerName})`
      : meta.title;
  const body = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <description>${escapeXml(item.html)}</description>
${item.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join('\n')}
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(meta.homepage)}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(ctx.feedUrl)}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`;
};

const renderJsonFeed = (ctx: FeedContext, items: Item[]): string => {
  const meta = feedMeta[ctx.source];
  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title:
        ctx.source === 'foryou' || ctx.source === 'bookmarks'
          ? `${meta.title} (${ctx.ownerName})`
          : meta.title,
      description: meta.description,
      home_page_url: meta.homepage,
      feed_url: ctx.feedUrl,
      items: items.map((item) => ({
        id: item.id,
        url: item.url,
        external_url: item.externalUrl,
        title: item.title,
        content_html: item.html,
        date_published: new Date(item.date).toISOString(),
        tags: item.tags.length ? item.tags : undefined,
      })),
    },
    null,
    2,
  );
};

export const renderFeed = (ctx: FeedContext, posts: Post[]): string => {
  const items = posts.map(postToItem);
  return ctx.format === 'json' ? renderJsonFeed(ctx, items) : renderRss(ctx, items);
};

export const renderReconnectFeed = (ctx: FeedContext, appUrl: string): string => {
  const items = [reconnectItem(appUrl)];
  return ctx.format === 'json' ? renderJsonFeed(ctx, items) : renderRss(ctx, items);
};

export const contentTypeFor = (format: FeedFormat): string =>
  format === 'json'
    ? 'application/feed+json; charset=utf-8'
    : 'application/rss+xml; charset=utf-8';
