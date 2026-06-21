/**
 * cache.js - Simple in-memory cache with TTL support.
 *
 * The attendance database doesn't change frequently (data comes from physical
 * check-in devices), so caching processed results for a short TTL eliminates
 * redundant table reads and JS processing on repeated requests.
 *
 * Cache is invalidated automatically when:
 * - The TTL expires (default 60 seconds)
 * - The database file changes (mtime-based)
 * - A manual invalidation is triggered (e.g., after upload)
 */

import fs from 'fs';

const DEFAULT_TTL = 60 * 1000; // 60 seconds

const store = new Map();
let lastDbMtime = null;

/**
 * Get the current database mtime for cache invalidation.
 * Returns null if the file doesn't exist or is blob-based.
 */
function getDbMtime() {
  try {
    const settingsPath = '/tmp/zkattendance/settings.json';
    const { join } = require('path');
    const bundleSettings = join(process.cwd(), 'settings.json');

    let dbPath = null;

    // Check /tmp settings first (Vercel)
    if (fs.existsSync(settingsPath)) {
      const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (s.dbPath && !s.dbPath.startsWith('blob:')) dbPath = s.dbPath;
    }

    // Fall back to bundle settings
    if (!dbPath && fs.existsSync(bundleSettings)) {
      const s = JSON.parse(fs.readFileSync(bundleSettings, 'utf8'));
      if (s.dbPath && !s.dbPath.startsWith('blob:')) dbPath = s.dbPath;
    }

    if (dbPath && fs.existsSync(dbPath)) {
      return fs.statSync(dbPath).mtimeMs;
    }
  } catch {}
  return null;
}

/**
 * Check if the database has changed since last cache write.
 * If changed, invalidate all cached entries.
 */
function checkDbChanged() {
  const currentMtime = getDbMtime();
  if (currentMtime !== null && lastDbMtime !== null && currentMtime !== lastDbMtime) {
    store.clear();
  }
  lastDbMtime = currentMtime;
}

/**
 * Get a cached value by key.
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if expired/missing
 */
export function cacheGet(key) {
  checkDbChanged();
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Set a cached value.
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} [ttl] - Time-to-live in milliseconds (default 60s)
 */
export function cacheSet(key, value, ttl = DEFAULT_TTL) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Invalidate all cache entries or a specific key.
 * @param {string} [key] - If provided, only invalidate this key. Otherwise clear all.
 */
export function cacheInvalidate(key) {
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
}

/**
 * Helper: wrap an async function with caching.
 * @param {string} key - Cache key
 * @param {Function} fn - Async function to call if cache misses
 * @param {number} [ttl] - TTL in milliseconds
 * @returns {Promise<any>}
 */
export async function cached(key, fn, ttl = DEFAULT_TTL) {
  const hit = cacheGet(key);
  if (hit !== null) return hit;
  const result = await fn();
  cacheSet(key, result, ttl);
  return result;
}
