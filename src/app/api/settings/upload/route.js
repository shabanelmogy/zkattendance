import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Vercel has a 4.5MB body size limit for serverless functions.
// This route supports chunked uploads to handle larger database files.
// Each chunk should be under 4MB to stay within the limit.

// Vercel has a 4.5MB body size limit for serverless functions.
// We handle chunked uploads: each chunk is sent separately,
// then assembled on the final request.

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

    // If chunked upload
    if (chunkIndex !== null && totalChunks !== null && uploadId) {
      const chunksDir = path.join(dataDir, `_chunks_${uploadId}`);
      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }

      // Save this chunk
      const chunkPath = path.join(chunksDir, `chunk_${chunkIndex.padStart(6, '0')}`);
      fs.writeFileSync(chunkPath, buffer);

      const currentChunk = parseInt(chunkIndex);
      const total = parseInt(totalChunks);

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
