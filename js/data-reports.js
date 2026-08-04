// Data aggregation for reports – reads from existing collections
import { db, PATH, dbRef, get } from "./firebase.js";
import { subscribeStudents, subscribeTeachers, subscribeFees, subscribeSalaries } from "./data.js";

/**
 * Get fee collection summary for a date range
 * @param {string} fromDate - ISO date string (YYYY-MM-DD)
 * @param {string} toDate - ISO date string (YYYY-MM-DD)
 * @returns {Promise<object>} - { totalCollected, totalPending, totalRecords, byClass, byFeeType }
 */
export async function getFeeReport(fromDate, toDate) {
  const feesRef = dbRef(db, PATH.fees);
  const snap = await get(feesRef);
  if (!snap.exists()) return { totalCollected: 0, totalPending: 0, totalRecords: 0, byClass: {}, byFeeType: {} };

  const fees = Object.values(snap.val());
  const filtered = fees.filter(f => {
    const d = f.date || f.createdAt;
    if (!d) return false;
    const dateStr = d.slice(0, 10);
    return dateStr >= fromDate && dateStr <= toDate;
  });

  const result = {
    totalCollected: 0,
    totalPending: 0,
    totalRecords: filtered.length,
    byClass: {},
    byFeeType: {}
  };

  filtered.forEach(f => {
    const amount = Number(f.amount) || 0;
    const balance = Number(f.balance) || 0;
    const paid = amount - balance;
    result.totalCollected += paid;
    result.totalPending += balance;

    const cls = f.class || 'Unknown';
    result.byClass[cls] = (result.byClass[cls] || 0) + paid;

    const type = f.feeType || 'Other';
    result.byFeeType[type] = (result.byFeeType[type] || 0) + paid;
  });

  return result;
}

/**
 * Get attendance summary for a month
 * @param {string} month - ISO month string (YYYY-MM)
 * @param {string} type - 'students' or 'teachers'
 * @returns {Promise<object>} - { present, absent, late, leave, total, byDate: { date: { present, absent, late, leave } } }
 */
export async function getAttendanceReport(month, type) {
  const attPath = `${PATH.students.replace(/\/students$/, '')}/attendance/${type}`;
  const ref = dbRef(db, attPath);
  const snap = await get(ref);
  if (!snap.exists()) return { present: 0, absent: 0, late: 0, leave: 0, total: 0, byDate: {} };

  const data = snap.val();
  const result = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
    byDate: {}
  };

  // Count statuses across all days in the month
  for (const [date, records] of Object.entries(data)) {
    if (!date.startsWith(month)) continue;
    const dayStats = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const status of Object.values(records)) {
      if (dayStats[status] !== undefined) dayStats[status]++;
    }
    result.present += dayStats.present;
    result.absent += dayStats.absent;
    result.late += dayStats.late;
    result.leave += dayStats.leave;
    result.total += Object.keys(records).length;
    result.byDate[date] = dayStats;
  }
  return result;
}

/**
 * Get salary summary for a month/year
 * @param {string} month - Month name (e.g., "January")
 * @param {number} year - Year
 * @returns {Promise<object>} - { totalPaid, totalPending, totalRecords, byDepartment }
 */
export async function getSalaryReport(month, year) {
  const salRef = dbRef(db, PATH.salaries);
  const snap = await get(salRef);
  if (!snap.exists()) return { totalPaid: 0, totalPending: 0, totalRecords: 0, byDepartment: {} };

  const salaries = Object.values(snap.val());
  const filtered = salaries.filter(s => s.month === month && s.year === year);

  const result = {
    totalPaid: 0,
    totalPending: 0,
    totalRecords: filtered.length,
    byDepartment: {}
  };

  filtered.forEach(s => {
    const amount = Number(s.amount) || 0;
    if (s.status === 'Paid') {
      result.totalPaid += amount;
    } else {
      result.totalPending += amount;
    }
    const dept = s.department || 'Unknown';
    result.byDepartment[dept] = (result.byDepartment[dept] || 0) + amount;
  });

  return result;
}

/**
 * Get student list with filters
 * @param {object} filters - { class, section, status }
 * @returns {Promise<Array>} - Array of student objects
 */
export async function getStudentList(filters = {}) {
  const students = await get(dbRef(db, PATH.students));
  if (!students.exists()) return [];
  const list = Object.values(students.val()).map(s => ({ id: s.id, ...s }));
  return list.filter(s => {
    if (filters.class && s.class !== filters.class) return false;
    if (filters.section && s.section !== filters.section) return false;
    if (filters.status && s.status !== filters.status) return false;
    return true;
  });
}

/**
 * Get teacher list with filters
 * @param {object} filters - { department, status }
 * @returns {Promise<Array>} - Array of teacher objects
 */
export async function getTeacherList(filters = {}) {
  const teachers = await get(dbRef(db, PATH.teachers));
  if (!teachers.exists()) return [];
  const list = Object.values(teachers.val()).map(t => ({ id: t.id, ...t }));
  return list.filter(t => {
    if (filters.department && t.department !== filters.department) return false;
    if (filters.status && t.status !== filters.status) return false;
    return true;
  });
}

/**
 * Get class-wise student counts
 * @returns {Promise<object>} - { className: count }
 */
export async function getClassWiseCount() {
  const students = await get(dbRef(db, PATH.students));
  if (!students.exists()) return {};
  const counts = {};
  Object.values(students.val()).forEach(s => {
    const cls = s.class || 'Unknown';
    counts[cls] = (counts[cls] || 0) + 1;
  });
  return counts;
}
