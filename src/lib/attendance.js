/**
 * attendance.js - Attendance query logic
 * ZK DB Tables: CHECKINOUT, USERINFO, DEPARTMENTS
 * NOTE: MS Access requires parentheses around nested LEFT JOINs
 */

import { getTableData } from './db.js';
import { fixArabic, toAccessDate, extractCheckInOut, getStatus, formatTime, formatDate, calcDurationMinutes, formatDuration } from './utils.js';

async function getJoinedData() {
  const checks = await getTableData('CHECKINOUT');
  const users = await getTableData('USERINFO');
  const depts = await getTableData('DEPARTMENTS');

  const deptMap = new Map();
  depts.forEach(d => deptMap.set(d.DEPTID, fixArabic(d.DeptName)));

  const userMap = new Map();
  users.forEach(u => userMap.set(u.USERID, {
    Badgenumber: u.Badgenumber,
    Name: fixArabic(u.Name),
    DEFAULTDEPTID: u.DEFAULTDEPTID,
    DeptName: deptMap.get(u.DEFAULTDEPTID) || 'N/A',
    ATT: u.ATT
  }));

  return { checks, userMap, users };
}

/**
 * Get raw check records with employee info, optionally filtered
 */
export async function getAttendanceRecords({ from, to, empId, page = 1, limit = 25, sortBy = 'date', sortOrder = 'asc' } = {}) {
  const { checks, userMap } = await getJoinedData();

  let filtered = checks;

  if (from) {
    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    filtered = filtered.filter(c => new Date(c.CHECKTIME) >= fromStart);
  }
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    filtered = filtered.filter(c => new Date(c.CHECKTIME) <= toEnd);
  }
  if (empId) {
    const id = parseInt(empId);
    filtered = filtered.filter(c => c.USERID === id);
  }

  // Sort by CHECKTIME DESC (matches old SQL ORDER BY c.CHECKTIME DESC)
  filtered.sort((a, b) => new Date(b.CHECKTIME) - new Date(a.CHECKTIME));

  // Group by employee + date to get first check-in / last check-out per day
  const grouped = {};
  for (const r of filtered) {
    const dateKey = formatDate(r.CHECKTIME);
    const groupKey = `${r.USERID}_${dateKey}`;
    if (!grouped[groupKey]) {
      const u = userMap.get(r.USERID) || {};
      grouped[groupKey] = {
        userId: r.USERID,
        badgeNumber: u.Badgenumber || '',
        name: u.Name || `Employee ${u.Badgenumber || r.USERID}`,
        department: u.DeptName || 'N/A',
        date: dateKey,
        records: [],
      };
    }
    grouped[groupKey].records.push(r);
  }

  // Build daily attendance entries
  let entries = Object.values(grouped).map(g => {
    const { checkIn, checkOut } = extractCheckInOut(g.records);
    const duration = calcDurationMinutes(checkIn, checkOut);
    const status = getStatus(checkIn);
    return {
      userId: g.userId,
      badgeNumber: g.badgeNumber,
      name: g.name,
      department: g.department,
      date: g.date,
      checkIn: checkIn ? formatTime(checkIn) : '--:--',
      checkOut: checkOut ? formatTime(checkOut) : '--:--',
      duration: formatDuration(duration),
      durationMinutes: duration || 0,
      status,
      checkCount: g.records.length,
      checkInMs: checkIn ? new Date(checkIn).getTime() : 0,
      checkOutMs: checkOut ? new Date(checkOut).getTime() : 0,
    };
  });

  // Dynamic Sort
  entries.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'badgeNumber') cmp = String(a.badgeNumber).localeCompare(String(b.badgeNumber), undefined, { numeric: true });
    else if (sortBy === 'department') cmp = a.department.localeCompare(b.department);
    else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
    else if (sortBy === 'checkIn') cmp = a.checkInMs - b.checkInMs;
    else if (sortBy === 'checkOut') cmp = a.checkOutMs - b.checkOutMs;
    else if (sortBy === 'duration') cmp = a.durationMinutes - b.durationMinutes;
    else cmp = a.date.localeCompare(b.date); // default to date

    if (cmp === 0) {
      return a.name.localeCompare(b.name);
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const total = entries.length;
  const offset = (page - 1) * limit;
  const paginated = entries.slice(offset, offset + limit);

  return { records: paginated, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Get dashboard summary stats for a given date
 */
export async function getDashboardStats(date = new Date()) {
  const { checks, userMap, users } = await getJoinedData();

  const dateStr = formatDate(date);
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = new Date(`${dateStr}T23:59:59`).getTime();

  // Today's check-ins
  const todayRows = checks.filter(c => {
    const t = new Date(c.CHECKTIME).getTime();
    return t >= dayStart && t <= dayEnd;
  });

  const uniqueToday = new Set(todayRows.map(r => r.USERID));

  // Total employees (ATT = 1)
  const totalEmployees = users.filter(u => u.ATT === 1 || u.ATT === true || u.ATT === '1').length;

  // First check per employee today
  const employeeFirstCheck = {};
  for (const r of todayRows) {
    const t = new Date(r.CHECKTIME).getTime();
    if (!employeeFirstCheck[r.USERID] || t < new Date(employeeFirstCheck[r.USERID]).getTime()) {
      employeeFirstCheck[r.USERID] = r.CHECKTIME;
    }
  }

  let presentCount = 0;
  let lateCount = 0;
  for (const checkTime of Object.values(employeeFirstCheck)) {
    const status = getStatus(checkTime);
    if (status === 'Present') presentCount++;
    else if (status === 'Late') lateCount++;
  }

  const absentCount = Math.max(0, totalEmployees - uniqueToday.size);

  // Last 30 days trend
  const trendStart = Date.now() - 29 * 24 * 60 * 60 * 1000;
  const trendRows = checks.filter(c => {
    const t = new Date(c.CHECKTIME).getTime();
    return t >= trendStart && t <= dayEnd;
  });

  const trendByDay = {};
  for (const r of trendRows) {
    const d = formatDate(r.CHECKTIME);
    if (!trendByDay[d]) trendByDay[d] = new Set();
    trendByDay[d].add(r.USERID);
  }

  const trend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = formatDate(d);
    trend.push({
      date: key,
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      present: trendByDay[key]?.size || 0,
    });
  }

  // Recent activity (last 10 check events)
  const sortedChecks = [...checks].sort((a, b) => new Date(b.CHECKTIME) - new Date(a.CHECKTIME));
  const recentRows = sortedChecks.slice(0, 10);
  
  const recentActivity = recentRows.map(r => {
    const u = userMap.get(r.USERID) || {};
    return {
      userId: r.USERID,
      name: u.Name || `Employee ${u.Badgenumber || r.USERID}`,
      badgeNumber: u.Badgenumber,
      checkTime: r.CHECKTIME,
      checkTimeFormatted: formatTime(r.CHECKTIME),
      checkType: r.CHECKTYPE,
      type: (r.CHECKTYPE === '1' || r.CHECKTYPE === 'O' || r.CHECKTYPE === 'o') ? 'Check-Out' : 'Check-In',
    };
  });

  return {
    totalEmployees,
    presentCount,
    lateCount,
    absentCount,
    attendanceRate: totalEmployees > 0 ? Math.round((uniqueToday.size / totalEmployees) * 100) : 0,
    trend,
    recentActivity,
    statusBreakdown: [
      { name: 'Present', value: presentCount, color: '#22c55e' },
      { name: 'Late', value: lateCount, color: '#f59e0b' },
      { name: 'Absent', value: absentCount, color: '#ef4444' },
    ],
  };
}

/**
 * Get per-employee summary stats for a date range
 */
export async function getEmployeeSummary({ from, to } = {}) {
  const { checks, userMap } = await getJoinedData();

  let filtered = checks;

  if (from) {
    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);
    filtered = filtered.filter(c => new Date(c.CHECKTIME) >= fromStart);
  }
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    filtered = filtered.filter(c => new Date(c.CHECKTIME) <= toEnd);
  }

  // Sort by CHECKTIME asc
  filtered.sort((a, b) => new Date(a.CHECKTIME) - new Date(b.CHECKTIME));

  // Group by employee then by date
  const empMap = {};
  for (const r of filtered) {
    if (!empMap[r.USERID]) {
      const u = userMap.get(r.USERID) || {};
      empMap[r.USERID] = {
        userId: r.USERID,
        name: u.Name || `Employee ${u.Badgenumber || r.USERID}`,
        badgeNumber: u.Badgenumber,
        department: u.DeptName || 'N/A',
        days: {},
      };
    }
    const dateKey = formatDate(r.CHECKTIME);
    if (!empMap[r.USERID].days[dateKey]) empMap[r.USERID].days[dateKey] = [];
    empMap[r.USERID].days[dateKey].push(r);
  }

  return Object.values(empMap).map(emp => {
    let totalMinutes = 0;
    let presentDays = 0;
    let lateDays = 0;
    const dayCount = Object.keys(emp.days).length;

    for (const dayRecords of Object.values(emp.days)) {
      const { checkIn, checkOut } = extractCheckInOut(dayRecords);
      const status = getStatus(checkIn);
      if (status === 'Present') presentDays++;
      else if (status === 'Late') lateDays++;
      const mins = calcDurationMinutes(checkIn, checkOut);
      if (mins) totalMinutes += mins;
    }

    const avgMinutes = dayCount > 0 ? Math.round(totalMinutes / dayCount) : 0;

    return {
      userId: emp.userId,
      name: emp.name,
      badgeNumber: emp.badgeNumber,
      department: emp.department,
      totalDays: dayCount,
      presentDays,
      lateDays,
      totalHours: formatDuration(totalMinutes),
      avgHours: formatDuration(avgMinutes),
      attendanceRate: dayCount > 0 ? Math.round(((presentDays + lateDays) / dayCount) * 100) : 0,
    };
  }).sort((a, b) => b.attendanceRate - a.attendanceRate);
}
