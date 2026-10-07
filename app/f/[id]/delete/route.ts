import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { deleteFeed, getFeed } from '@/lib/store';

export const dynamic = 'force-dynamic';

export const POST = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { id } = await params;
  const config = getConfig();

  if (await getFeed(id)) {
    await deleteFeed(id);
  }

  return NextResponse.redirect(`${config.appUrl}/?deleted=1`, 303);
};
