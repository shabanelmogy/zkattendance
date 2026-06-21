import { NextResponse } from 'next/server';
import { getAttendanceRecords } from '@/lib/attendance';
import { cached } from '@/lib/cache';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')) : null;
    const empId = searchParams.get('empId') || null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const cacheKey = `attendance:${from?.toISOString() || ''}_${to?.toISOString() || ''}_${empId || ''}_${page}_${limit}_${sortBy}_${sortOrder}`;

    const result = await cached(
      cacheKey,
      () => getAttendanceRecords({ from, to, empId, page, limit, sortBy, sortOrder }),
      60 * 1000
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/attendance]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
