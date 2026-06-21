import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
