import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { deleteFeed, getFeed } from '@/lib/store';
import { revokeFeedTokens } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export const POST = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { id } = await params;
  const config = getConfig();
  const record = await getFeed(id);

  if (record) {
    await revokeFeedTokens(record);
    await deleteFeed(record);
  }

  return NextResponse.redirect(`${config.appUrl}/?deleted=1`, 303);
};
