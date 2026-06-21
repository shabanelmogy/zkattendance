/**
 * db.js - Database helper using PowerShell + OleDb to query the Access .mdb file.
 *
 * ENCODING FIX for Arabic text:
 * The ZK Access .mdb stores Arabic names as Windows-1256 (CP1256) bytes.
 * OleDb returns them as a .NET string where each char = the raw byte value (Latin-1).
 * We fix this inside PowerShell by re-encoding as Latin-1 bytes → decoding as CP1256
 * to get proper Unicode Arabic. Then we escape every non-ASCII char as \uXXXX so only
 * pure ASCII bytes flow through the Windows console pipe. Node's JSON.parse() decodes
 * the \uXXXX escapes back to proper Unicode automatically.
 */

import { spawn } from 'child_process';
import path from 'path';

import fs from 'fs';
import { get as getBlob } from '@vercel/blob';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
const DEFAULT_DB = path.join(process.cwd(), '..', 'attBackup.mdb');
export const BLOB_DB_PATH = 'zkattendance/database.mdb';
export const BLOB_DB_SOURCE = `blob:${BLOB_DB_PATH}`;

export function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Read DB path dynamically — changes in Settings page take effect immediately */
function getDbPath() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (s.dbPath) return s.dbPath.replace(/\//g, '\\');
    }
  } catch {}
  return (process.env.DB_PATH || DEFAULT_DB).replace(/\//g, '\\');
}

import MDBReader from 'mdb-reader';

let cachedDbPath = null;
let cachedMtime = null;
let cachedReader = null;
let blobReaderPromise = null;

export async function getReader(source) {
  if (source?.startsWith('blob:') && !hasBlobStorage()) {
    throw new Error('Vercel Blob storage is not configured.');
  }

  if ((source?.startsWith('blob:') || !source) && hasBlobStorage()) {
    if (!blobReaderPromise) {
      blobReaderPromise = (async () => {
        const blobResult = await getBlob(BLOB_DB_PATH, {
          access: 'private',
          useCache: false,
          ifNoneMatch: cachedDbPath === BLOB_DB_SOURCE ? cachedMtime : undefined,
        });

        if (!blobResult) {
          throw new Error('No database has been uploaded to Vercel Blob yet.');
        }

        if (blobResult.statusCode === 304 && cachedReader) {
          return cachedReader;
        }

        const buffer = Buffer.from(await new Response(blobResult.stream).arrayBuffer());
        cachedReader = new MDBReader(buffer);
        cachedDbPath = BLOB_DB_SOURCE;
        cachedMtime = blobResult.blob.etag;
        return cachedReader;
      })();
    }

    try {
      return await blobReaderPromise;
    } finally {
      blobReaderPromise = null;
    }
  }

  const dbPath = source || getDbPath();
  
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`);
  }

  const stat = fs.statSync(dbPath);
  
  // Reload if path changed or file was modified
  if (dbPath !== cachedDbPath || stat.mtimeMs !== cachedMtime) {
    const buffer = fs.readFileSync(dbPath);
    cachedReader = new MDBReader(buffer);
    cachedDbPath = dbPath;
    cachedMtime = stat.mtimeMs;
  }
  
  return cachedReader;
}

export async function getTableData(tableName) {
  const reader = await getReader();
  const table = reader.getTable(tableName);
  if (!table) return [];
  
  // mdb-reader returns an array of objects
  return table.getData();
}

// Keep a mock query function temporarily for compatibility if needed, 
// though we will replace all usage of it.
export async function query(sql) {
  throw new Error("SQL queries are no longer supported. Use getTableData() and filter in JavaScript.");
}
