import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { head } from '@vercel/blob';
import { BLOB_DB_PATH, BLOB_DB_SOURCE, hasBlobStorage } from '@/lib/db';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {}
  return {
    dbPath: process.env.DB_PATH || path.join(process.cwd(), '..', 'attBackup.mdb'),
    workStartHour: 8,
    workEndHour: 17,
  };
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  const settings = loadSettings();

  if (hasBlobStorage()) {
    try {
      await head(BLOB_DB_PATH);
      return NextResponse.json({ ...settings, dbPath: BLOB_DB_SOURCE, storage: 'blob' });
    } catch {
      return NextResponse.json({ ...settings, dbPath: '', storage: 'blob' });
    }
  }

  return NextResponse.json(settings);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const current = loadSettings();
    const updated = { ...current, ...body };
    saveSettings(updated);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
