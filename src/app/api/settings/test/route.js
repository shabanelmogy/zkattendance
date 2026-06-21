import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import MDBReader from 'mdb-reader';

export async function POST(request) {
  try {
    const { dbPath } = await request.json();

    if (!dbPath) return NextResponse.json({ error: 'No path provided' }, { status: 400 });

    const normalised = path.resolve(dbPath);

    if (!fs.existsSync(normalised)) {
      return NextResponse.json({ success: false, error: `File not found: ${normalised}` });
    }

    const ext = path.extname(normalised).toLowerCase();
    if (ext !== '.mdb' && ext !== '.accdb') {
      return NextResponse.json({ success: false, error: 'File must be .mdb or .accdb' });
    }

    // Try to open and query the DB
    const result = await testConnection(normalised);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function testConnection(dbPath) {
  try {
    const buffer = fs.readFileSync(dbPath);
    const reader = new MDBReader(buffer);

    const tables = reader.getTableNames();
    const hasCheckin = tables.includes('CHECKINOUT');
    const hasUserInfo = tables.includes('USERINFO');

    let empCount = 0;
    if (hasUserInfo) {
      const users = reader.getTable('USERINFO').getData();
      empCount = users.filter(u => u.ATT === 1 || u.ATT === true || u.ATT === '1').length;
    }

    return {
      success: true,
      tables: tables.length,
      hasCheckin,
      hasUserInfo,
      employeeCount: empCount
    };
  } catch (err) {
    return { success: false, error: `Failed to read database: ${err.message}` };
  }
}
