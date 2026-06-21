import { NextResponse } from 'next/server';
import { getAllEmployees, getDepartments } from '@/lib/employees';
import { getEmployeeSummary } from '@/lib/attendance';
import { cached } from '@/lib/cache';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const mode = searchParams.get('mode') || 'list'; // 'list' | 'summary'
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')) : null;

    if (mode === 'summary') {
      const cacheKey = `empSummary:${from?.toISOString() || ''}_${to?.toISOString() || ''}`;
      const summary = await cached(cacheKey, () => getEmployeeSummary({ from, to }), 120 * 1000);
      return NextResponse.json(summary);
    }

    const cacheKey = `empList:${search}`;
    const data = await cached(cacheKey, async () => {
      const [employees, departments] = await Promise.all([
        getAllEmployees(search),
        getDepartments(),
      ]);
      return { employees, departments };
    }, 120 * 1000);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/employees]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
