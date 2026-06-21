import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get('path') || process.cwd();

    // Resolve and normalise
    const resolved = path.resolve(dir);

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: 'Path does not exist' }, { status: 404 });
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });

    const items = [];

    // Add parent directory entry
    const parent = path.dirname(resolved);
    if (parent !== resolved) {
      items.push({ name: '..', type: 'parent', path: parent });
    }

    // Directories first, then .mdb/.accdb files
    const dirs = [];
    const files = [];

    for (const e of entries) {
      try {
        const fullPath = path.join(resolved, e.name);
        if (e.isDirectory()) {
          dirs.push({ name: e.name, type: 'directory', path: fullPath });
        } else if (e.isFile()) {
          const ext = path.extname(e.name).toLowerCase();
          if (ext === '.mdb' || ext === '.accdb') {
            const size = fs.statSync(fullPath).size;
            files.push({
              name: e.name,
              type: 'file',
              path: fullPath,
              size: formatBytes(size),
            });
          }
        }
      } catch {
        // skip permission errors
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    items.push(...dirs, ...files);

    return NextResponse.json({
      current: resolved,
      items,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
