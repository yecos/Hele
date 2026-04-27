import { NextResponse } from 'next/server';
import { LIVE_TV_CHANNELS, getChannelsByCategory, LIVE_TV_CATEGORIES } from '@/lib/live-tv';

export async function GET() {
  return NextResponse.json({
    channels: LIVE_TV_CHANNELS,
    categories: LIVE_TV_CATEGORIES,
  });
}
