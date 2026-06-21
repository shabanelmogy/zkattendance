/**
 * utils.js - Date/time formatting and attendance calculation helpers
 */

const WORK_START_HOUR = parseInt(process.env.WORK_START_HOUR || '8');
const WORK_END_HOUR = parseInt(process.env.WORK_END_HOUR || '17');

import iconv from 'iconv-lite';

export function fixArabic(str) {
  if (typeof str !== 'string' || !str) return str;
  try {
    const buf = Buffer.from(str, 'latin1');
    return iconv.decode(buf, 'windows-1256');
  } catch (e) {
    return str;
  }
}

/**
 * Format a Date object or date string to HH:MM
 */
export function formatTime(dateVal) {
  if (!dateVal) return '--:--';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '--:--';
  return d.toTimeString().slice(0, 5);
}

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Format a Date to a display string like "21 Jun 2026"
 */
export function formatDisplayDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Calculate duration in minutes between two date values
 */
export function calcDurationMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const inTime = new Date(checkIn);
  const outTime = new Date(checkOut);
  const diff = (outTime - inTime) / 1000 / 60;
  return diff > 0 ? Math.round(diff) : null;
}

/**
 * Format minutes to "Xh Ym"
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Determine attendance status from check-in time
 * Returns: 'Present' | 'Late' | 'Absent'
 */
export function getStatus(checkInDate) {
  if (!checkInDate) return 'Absent';
  const d = new Date(checkInDate);
  if (isNaN(d.getTime())) return 'Absent';
  const hour = d.getHours();
  const minute = d.getMinutes();
  if (hour < WORK_START_HOUR) return 'Present';
  if (hour === WORK_START_HOUR && minute === 0) return 'Present';
  return 'Late';
}

/**
 * Get today's date range (start and end of day)
 */
export function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

/**
 * Get date range for last N days
 */
export function getLastNDaysRange(n) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Format date for Access SQL query (MM/DD/YYYY HH:MM:SS)
 */
export function toAccessDate(date) {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `#${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}#`;
}

/**
 * Get check-in (first record of day) and check-out (last record of day)
 * from an array of records for a single employee on a single day
 */
export function extractCheckInOut(records) {
  if (!records || records.length === 0) return { checkIn: null, checkOut: null };
  const sorted = [...records].sort((a, b) => new Date(a.CHECKTIME) - new Date(b.CHECKTIME));
  return {
    checkIn: sorted[0].CHECKTIME,
    checkOut: sorted.length > 1 ? sorted[sorted.length - 1].CHECKTIME : null,
  };
}
