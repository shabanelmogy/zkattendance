import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/attendance';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    const stats = await getDashboardStats(date);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[/api/dashboard]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
