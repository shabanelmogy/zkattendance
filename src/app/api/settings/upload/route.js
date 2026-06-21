import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const fileNameHeader = request.headers.get('x-file-name');
    if (!fileNameHeader) {
      return NextResponse.json({ error: 'No file uploaded or filename missing.' }, { status: 400 });
    }
    const fileName = decodeURIComponent(fileNameHeader);

    if (!fileName.endsWith('.mdb') && !fileName.endsWith('.accdb')) {
      return NextResponse.json({ error: 'Only MS Access database files (.mdb, .accdb) are allowed.' }, { status: 400 });
    }

    // Convert raw request body to buffer
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Generate unique filename to avoid locking issues, or just overwrite attBackup.mdb
    // ZK Attendance database is usually attBackup.mdb. Let's just use the uploaded file name
    // but sanitize it.
    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const destPath = path.join(dataDir, safeName);

    // Save file
    fs.writeFileSync(destPath, buffer);

    // We also need to update the settings.json
    const settingsFile = path.join(process.cwd(), 'settings.json');
    let settings = {};
    if (fs.existsSync(settingsFile)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      } catch (e) { }
    }

    settings.dbPath = destPath;
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');

    return NextResponse.json({ success: true, dbPath: destPath, settings });
  } catch (error) {
    console.error('[/api/settings/upload]', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
