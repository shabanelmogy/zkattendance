import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/attendance';
import { cached } from '@/lib/cache';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();
    const dateKey = date.toISOString().slice(0, 10);

    const stats = await cached(
      `dashboard:${dateKey}`,
      () => getDashboardStats(date),
      60 * 1000 // 60 seconds
    );
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[/api/dashboard]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
