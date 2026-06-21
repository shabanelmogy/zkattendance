import { NextResponse } from 'next/server';
import { getAttendanceRecords } from '@/lib/attendance';
import * as XLSX from 'xlsx';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const from = searchParams.get('from') ? new Date(searchParams.get('from')) : null;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')) : null;
    const empId = searchParams.get('empId') || null;

    // Get all records (no pagination for export)
    const { records } = await getAttendanceRecords({ from, to, empId, page: 1, limit: 99999 });

    const data = records.map(r => ({
      'Badge Number': r.badgeNumber,
      'Employee Name': r.name,
      'Department': r.department,
      'Date': r.date,
      'Check In': r.checkIn,
      'Check Out': r.checkOut,
      'Duration': r.duration,
      'Status': r.status,
    }));

    if (format === 'csv') {
      // Build CSV
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ];
      const csv = '\uFEFF' + csvRows.join('\r\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Build Excel
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Auto column widths
    const colWidths = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }));
    ws['!cols'] = colWidths;

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[/api/export]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
