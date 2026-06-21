/**
 * employees.js - Employee query logic
 * ZK DB Table: USERINFO, DEPARTMENTS
 * NOTE: MS Access requires parentheses around nested JOINs
 */

import { getTableData } from './db.js';
import { fixArabic } from './utils.js';

/**
 * Get all employees with their department name
 */
export async function getAllEmployees(search = '') {
  const users = await getTableData('USERINFO');
  const depts = await getTableData('DEPARTMENTS');

  const deptMap = new Map();
  depts.forEach(d => deptMap.set(d.DEPTID, fixArabic(d.DeptName)));

  let filtered = users.filter(u => u.ATT === 1 || u.ATT === true || u.ATT === '1');

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(u => {
      const fixedName = fixArabic(u.Name);
      return (fixedName && fixedName.toLowerCase().includes(s)) ||
             (u.Badgenumber && String(u.Badgenumber).toLowerCase().includes(s));
    });
  }

  filtered.sort((a, b) => (fixArabic(a.Name) || '').localeCompare(fixArabic(b.Name) || ''));

  return filtered.map(r => ({
    userId: r.USERID,
    badgeNumber: r.Badgenumber,
    name: fixArabic(r.Name) || `Employee ${r.Badgenumber || r.USERID}`,
    deptId: r.DEFAULTDEPTID,
    department: deptMap.get(r.DEFAULTDEPTID) || 'N/A',
  }));
}

/**
 * Get employee count
 */
export async function getEmployeeCount() {
  const users = await getTableData('USERINFO');
  return users.filter(u => u.ATT === 1 || u.ATT === true || u.ATT === '1').length;
}

/**
 * Get all departments
 */
export async function getDepartments() {
  try {
    const depts = await getTableData('DEPARTMENTS');
    const sorted = [...depts].sort((a, b) => (fixArabic(a.DeptName) || '').localeCompare(fixArabic(b.DeptName) || ''));
    
    return sorted.map(r => ({
      id: r.DEPTID,
      name: fixArabic(r.DeptName),
      parentId: r.SUPDEPTID,
    }));
  } catch {
    return [];
  }
}
