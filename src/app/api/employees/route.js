import { NextResponse } from 'next/server';
import { getAllEmployees, getDepartments } from '@/lib/employees';
import { getEmployeeSummary } from '@/lib/attendance';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const mode = searchParams.get('mode') || 'list'; // 'list' | 'summary'
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')) : null;

    if (mode === 'summary') {
      const summary = await getEmployeeSummary({ from, to });
      return NextResponse.json(summary);
    }

    const [employees, departments] = await Promise.all([
      getAllEmployees(search),
      getDepartments(),
    ]);

    return NextResponse.json({ employees, departments });
  } catch (error) {
    console.error('[/api/employees]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
