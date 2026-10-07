import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'daily.dev RSS',
  description:
    'Your personalized daily.dev feed, popular posts and bookmarks as private RSS and JSON feeds for any reader. Sign in with daily.dev, copy a URL, done.',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
