import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { put } from '@vercel/blob';
import { BLOB_DB_PATH, BLOB_DB_SOURCE, hasBlobStorage } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  if (hasBlobStorage()) {
    return NextResponse.json({ storage: 'blob', dbPath: BLOB_DB_SOURCE });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({ storage: 'vercel-tmp' });
  }

  return NextResponse.json({ storage: 'filesystem' });
}

export async function POST(request) {
  try {
    // ===== BLOB STORAGE (Vercel with BLOB_READ_WRITE_TOKEN) =====
    if (hasBlobStorage()) {
      const fileNameHeader = request.headers.get('x-file-name');
      if (!fileNameHeader) {
        return NextResponse.json({ error: 'No file uploaded or filename missing.' }, { status: 400 });
      }
      const fileName = decodeURIComponent(fileNameHeader);

      if (!/\.(mdb|accdb)$/i.test(fileName)) {
        return NextResponse.json({ error: 'Only MS Access database files (.mdb, .accdb) are allowed.' }, { status: 400 });
      }

      // Check if chunked upload
      const chunkIndex = request.headers.get('x-chunk-index');
      const totalChunks = request.headers.get('x-total-chunks');
      const uploadId = request.headers.get('x-upload-id');

      const tmpDir = '/tmp/zkattendance';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const arrayBuffer = await request.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        return NextResponse.json({ error: 'The selected database file is empty.' }, { status: 400 });
      }

      // Chunked upload — assemble chunks in /tmp, then upload to Blob
      if (chunkIndex !== null && totalChunks !== null && uploadId) {
        const currentChunk = Number(chunkIndex);
        const total = Number(totalChunks);
        if (!/^[-_a-zA-Z0-9]+$/.test(uploadId) || !Number.isInteger(currentChunk) || !Number.isInteger(total) || currentChunk < 0 || total < 1 || currentChunk >= total) {
          return NextResponse.json({ error: 'Invalid upload chunk metadata.' }, { status: 400 });
        }

        const chunksDir = path.join(tmpDir, `_chunks_${uploadId}`);
        if (!fs.existsSync(chunksDir)) {
          fs.mkdirSync(chunksDir, { recursive: true });
        }

        const chunkPath = path.join(chunksDir, `chunk_${String(currentChunk).padStart(6, '0')}`);
        fs.writeFileSync(chunkPath, buffer);

        // Last chunk — assemble and upload to Vercel Blob
        if (currentChunk === total - 1) {
          const chunks = [];
          for (let i = 0; i < total; i++) {
            const cp = path.join(chunksDir, `chunk_${String(i).padStart(6, '0')}`);
            if (fs.existsSync(cp)) {
              chunks.push(fs.readFileSync(cp));
            } else {
              fs.rmSync(chunksDir, { recursive: true, force: true });
              return NextResponse.json({ error: `Missing chunk ${i}` }, { status: 400 });
            }
          }

          const fullBuffer = Buffer.concat(chunks);
          fs.rmSync(chunksDir, { recursive: true, force: true });

          // Upload assembled file to Vercel Blob
          await put(BLOB_DB_PATH, fullBuffer, {
            access: 'public',
            addRandomSuffix: false,
          });

          return NextResponse.json({ success: true, dbPath: BLOB_DB_SOURCE, settings: { dbPath: BLOB_DB_SOURCE } });
        }

        return NextResponse.json({ success: true, chunk: currentChunk, total });
      }

      // Single-request upload (small file) — upload directly to Vercel Blob
      await put(BLOB_DB_PATH, buffer, {
        access: 'public',
        addRandomSuffix: false,
      });

      return NextResponse.json({ success: true, dbPath: BLOB_DB_SOURCE, settings: { dbPath: BLOB_DB_SOURCE } });
    }

    // ===== VERCEL WITHOUT BLOB — use /tmp =====
    if (process.env.VERCEL) {
      const fileNameHeader = request.headers.get('x-file-name');
      if (!fileNameHeader) {
        return NextResponse.json({ error: 'No file uploaded or filename missing.' }, { status: 400 });
      }
      const fileName = decodeURIComponent(fileNameHeader);

      if (!/\.(mdb|accdb)$/i.test(fileName)) {
        return NextResponse.json({ error: 'Only MS Access database files (.mdb, .accdb) are allowed.' }, { status: 400 });
      }

      const chunkIndex = request.headers.get('x-chunk-index');
      const totalChunks = request.headers.get('x-total-chunks');
      const uploadId = request.headers.get('x-upload-id');

      const tmpDir = '/tmp/zkattendance';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const arrayBuffer = await request.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        return NextResponse.json({ error: 'The selected database file is empty.' }, { status: 400 });
      }

      if (chunkIndex !== null && totalChunks !== null && uploadId) {
        const currentChunk = Number(chunkIndex);
        const total = Number(totalChunks);
        if (!/^[-_a-zA-Z0-9]+$/.test(uploadId) || !Number.isInteger(currentChunk) || !Number.isInteger(total) || currentChunk < 0 || total < 1 || currentChunk >= total) {
          return NextResponse.json({ error: 'Invalid upload chunk metadata.' }, { status: 400 });
        }

        const chunksDir = path.join(tmpDir, `_chunks_${uploadId}`);
        if (!fs.existsSync(chunksDir)) {
          fs.mkdirSync(chunksDir, { recursive: true });
        }

        const chunkPath = path.join(chunksDir, `chunk_${String(currentChunk).padStart(6, '0')}`);
        fs.writeFileSync(chunkPath, buffer);

        if (currentChunk === total - 1) {
          const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const destPath = path.join(tmpDir, safeName);

          const chunks = [];
          for (let i = 0; i < total; i++) {
            const cp = path.join(chunksDir, `chunk_${String(i).padStart(6, '0')}`);
            if (fs.existsSync(cp)) {
              chunks.push(fs.readFileSync(cp));
            } else {
              fs.rmSync(chunksDir, { recursive: true, force: true });
              return NextResponse.json({ error: `Missing chunk ${i}` }, { status: 400 });
            }
          }

          const fullBuffer = Buffer.concat(chunks);
          fs.writeFileSync(destPath, fullBuffer);
          fs.rmSync(chunksDir, { recursive: true, force: true });

          const tmpSettingsFile = '/tmp/zkattendance/settings.json';
          let settings = {};
          try { settings = JSON.parse(fs.readFileSync(tmpSettingsFile, 'utf8')); } catch {}
          settings.dbPath = destPath;
          fs.writeFileSync(tmpSettingsFile, JSON.stringify(settings, null, 2), 'utf8');

          return NextResponse.json({ success: true, dbPath: destPath, settings, warning: 'Database stored in temporary storage. It will be lost when the server restarts. For permanent storage, add Vercel Blob to your project.' });
        }

        return NextResponse.json({ success: true, chunk: currentChunk, total });
      }

      // Single request
      const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const destPath = path.join(tmpDir, safeName);
      fs.writeFileSync(destPath, buffer);

      const tmpSettingsFile = '/tmp/zkattendance/settings.json';
      let settings = {};
      try { settings = JSON.parse(fs.readFileSync(tmpSettingsFile, 'utf8')); } catch {}
      settings.dbPath = destPath;
      fs.writeFileSync(tmpSettingsFile, JSON.stringify(settings, null, 2), 'utf8');

      return NextResponse.json({ success: true, dbPath: destPath, settings, warning: 'Database stored in temporary storage. It will be lost when the server restarts. For permanent storage, add Vercel Blob to your project.' });
    }

    // ===== LOCAL FILESYSTEM (self-hosted) =====
    const fileNameHeader = request.headers.get('x-file-name');
    if (!fileNameHeader) {
      return NextResponse.json({ error: 'No file uploaded or filename missing.' }, { status: 400 });
    }
    const fileName = decodeURIComponent(fileNameHeader);

    if (!/\.(mdb|accdb)$/i.test(fileName)) {
      return NextResponse.json({ error: 'Only MS Access database files (.mdb, .accdb) are allowed.' }, { status: 400 });
    }

    const chunkIndex = request.headers.get('x-chunk-index');
    const totalChunks = request.headers.get('x-total-chunks');
    const uploadId = request.headers.get('x-upload-id');

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'The selected database file is empty.' }, { status: 400 });
    }

    if (chunkIndex !== null && totalChunks !== null && uploadId) {
      const currentChunk = Number(chunkIndex);
      const total = Number(totalChunks);
      if (!/^[-_a-zA-Z0-9]+$/.test(uploadId) || !Number.isInteger(currentChunk) || !Number.isInteger(total) || currentChunk < 0 || total < 1 || currentChunk >= total) {
        return NextResponse.json({ error: 'Invalid upload chunk metadata.' }, { status: 400 });
      }

      const chunksDir = path.join(dataDir, `_chunks_${uploadId}`);
      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }

      const chunkPath = path.join(chunksDir, `chunk_${String(currentChunk).padStart(6, '0')}`);
      fs.writeFileSync(chunkPath, buffer);

      if (currentChunk === total - 1) {
        const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const destPath = path.join(dataDir, safeName);

        const chunks = [];
        for (let i = 0; i < total; i++) {
          const cp = path.join(chunksDir, `chunk_${String(i).padStart(6, '0')}`);
          if (fs.existsSync(cp)) {
            chunks.push(fs.readFileSync(cp));
          } else {
            fs.rmSync(chunksDir, { recursive: true, force: true });
            return NextResponse.json({ error: `Missing chunk ${i}` }, { status: 400 });
          }
        }

        const fullBuffer = Buffer.concat(chunks);
        fs.writeFileSync(destPath, fullBuffer);
        fs.rmSync(chunksDir, { recursive: true, force: true });

        const settingsFile = path.join(process.cwd(), 'settings.json');
        let settings = {};
        if (fs.existsSync(settingsFile)) {
          try { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch {}
        }
        settings.dbPath = destPath;
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');

        return NextResponse.json({ success: true, dbPath: destPath, settings });
      }

      return NextResponse.json({ success: true, chunk: currentChunk, total });
    }

    // Single-request upload
    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const destPath = path.join(dataDir, safeName);
    fs.writeFileSync(destPath, buffer);

    const settingsFile = path.join(process.cwd(), 'settings.json');
    let settings = {};
    if (fs.existsSync(settingsFile)) {
      try { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch {}
    }
    settings.dbPath = destPath;
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');

    return NextResponse.json({ success: true, dbPath: destPath, settings });
  } catch (error) {
    console.error('[/api/settings/upload]', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
