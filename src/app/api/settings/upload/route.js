import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { handleUpload } from '@vercel/blob/client';
import { BLOB_DB_PATH, BLOB_DB_SOURCE, hasBlobStorage } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  if (hasBlobStorage()) {
    return NextResponse.json({ storage: 'blob', dbPath: BLOB_DB_SOURCE });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({
      storage: 'unconfigured',
      error: 'Connect a private Vercel Blob store to this project before uploading a database.',
    });
  }

  return NextResponse.json({ storage: 'filesystem' });
}

// Vercel has a 4.5MB body size limit for serverless functions.
// We handle chunked uploads: each chunk is sent separately,
// then assembled on the final request.

export async function POST(request) {
  try {
    if (hasBlobStorage() && request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json();
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          if (pathname !== BLOB_DB_PATH) {
            throw new Error('Invalid database upload path.');
          }

          if (!clientPayload || !/\.(mdb|accdb)$/i.test(clientPayload)) {
            throw new Error('Only MS Access database files (.mdb, .accdb) are allowed.');
          }

          return {
            maximumSizeInBytes: 500 * 1024 * 1024,
            addRandomSuffix: false,
            allowOverwrite: true,
            tokenPayload: clientPayload,
          };
        },
        onUploadCompleted: async () => {},
      });

      return NextResponse.json(result);
    }

    if (process.env.VERCEL) {
      return NextResponse.json({
        error: hasBlobStorage()
          ? 'Deployed database uploads must use the Vercel Blob client upload flow.'
          : 'Connect a private Vercel Blob store to this project before uploading a database.',
      }, { status: 503 });
    }

    const fileNameHeader = request.headers.get('x-file-name');
    if (!fileNameHeader) {
      return NextResponse.json({ error: 'No file uploaded or filename missing.' }, { status: 400 });
    }
    const fileName = decodeURIComponent(fileNameHeader);
    const extension = path.extname(fileName).toLowerCase();

    if (extension !== '.mdb' && extension !== '.accdb') {
      return NextResponse.json({ error: 'Only MS Access database files (.mdb, .accdb) are allowed.' }, { status: 400 });
    }

    // Check if this is a chunked upload
    const chunkIndex = request.headers.get('x-chunk-index');
    const totalChunks = request.headers.get('x-total-chunks');
    const uploadId = request.headers.get('x-upload-id');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Convert raw request body to buffer
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'The selected database file is empty.' }, { status: 400 });
    }

    // If chunked upload
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

      // Save this chunk
      const chunkPath = path.join(chunksDir, `chunk_${chunkIndex.padStart(6, '0')}`);
      fs.writeFileSync(chunkPath, buffer);

      // If this is the last chunk, assemble the file
      if (currentChunk === total - 1) {
        const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const destPath = path.join(dataDir, safeName);

        // Read and concatenate all chunks in order
        const chunks = [];
        for (let i = 0; i < total; i++) {
          const cp = path.join(chunksDir, `chunk_${String(i).padStart(6, '0')}`);
          if (fs.existsSync(cp)) {
            chunks.push(fs.readFileSync(cp));
          } else {
            // Cleanup and fail
            fs.rmSync(chunksDir, { recursive: true, force: true });
            return NextResponse.json({ error: `Missing chunk ${i}` }, { status: 400 });
          }
        }

        const fullBuffer = Buffer.concat(chunks);
        fs.writeFileSync(destPath, fullBuffer);

        // Cleanup chunks directory
        fs.rmSync(chunksDir, { recursive: true, force: true });

        // Update settings.json
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
      }

      // Not the last chunk yet — acknowledge receipt
      return NextResponse.json({ success: true, chunk: currentChunk, total });
    }

    // Non-chunked upload (small files under 4MB)
    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const destPath = path.join(dataDir, safeName);

    fs.writeFileSync(destPath, buffer);

    // Update settings.json
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
