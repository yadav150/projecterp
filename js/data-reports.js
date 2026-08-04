// Data aggregation for reports
import { get } from "firebase/database";
import { db, PATH, dbRef } from "./firebase.js";
import { subscribeStudents, subscribeTeachers, subscribeFees, subscribeSalaries } from "./data.js";

/**
 * Get fee collection summary for a period
 * @param {string} startDate - ISO date (YYYY-MM-DD)
 * @param {string} endDate - ISO date (YYYY-MM-DD)
 * @param {string} classFilter - optional class
 * @returns {Promise<object>} - { totalCollected, totalPending, totalRecords, byClass, byFeeType }
 */
export async function getFeeReport(startDate, endDate, classFilter = '') {
  const feesRef = dbRef(db, PATH.fees);
  const snap = await get(feesRef);
  if (!snap.exists()) return { totalCollected: 0, totalPending: 0, totalRecords: 0, byClass: {}, byFeeType: {} };

  const fees = Object.values(snap.val());
  let filtered = fees.filter(f => f.date >= startDate && f.date <= endDate);
  if (classFilter) filtered = filtered.filter(f => f.class === classFilter);

  const totalCollected = filtered.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const totalPending = filtered.reduce((sum, f) => sum + Number(f.balance || 0), 0);
  const totalRecords = filtered.length;

  const byClass = {};
  const byFeeType = {};
  filtered.forEach(f => {
    const cls = f.class || 'Unknown';
    byClass[cls] = (byClass[cls] || 0) + Number(f.amount || 0);
    const type = f.feeType || 'Other';
    byFeeType[type] = (byFeeType[type] || 0) + Number(f.amount || 0);
  });

  return { totalCollected, totalPending, totalRecords, byClass, byFeeType };
}

/**
 * Get attendance summary for a month
 * @param {string} month - ISO month (YYYY-MM)
 * @param {string} classFilter - optional class
 * @param {string} sectionFilter - optional section
 * @returns {Promise<object>} - { present, absent, late, leave, total }
 */
export async function getAttendanceReport(month, classFilter = '', sectionFilter = '') {
  // Get all students
  const studentsRef = dbRef(db, PATH.students);
  const snap = await get(studentsRef);
  if (!snap.exists()) return { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

  const students = Object.values(snap.val());
  let filteredStudents = students;
  if (classFilter) filteredStudents = filteredStudents.filter(s => s.class === classFilter);
  if (sectionFilter) filteredStudents = filteredStudents.filter(s => s.section === sectionFilter);
  const studentIds = filteredStudents.map(s => s.id);

  // Get attendance for the month
  const attRef = dbRef(db, `erp_bfa/attendance/students`);
  const attSnap = await get(attRef);
  if (!attSnap.exists()) return { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

  const attendance = attSnap.val();
  const summary = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

  for (const [date, records] of Object.entries(attendance)) {
    if (!date.startsWith(month)) continue;
    for (const studentId of studentIds) {
      const status = records[studentId];
      if (status) {
        summary[status] = (summary[status] || 0) + 1;
        summary.total += 1;
      }
    }
  }
  return summary;
}

/**
 * Get teacher payroll summary
 * @param {string} month - ISO month (YYYY-MM)
 * @param {string} department - optional department
 * @returns {Promise<object>} - { totalPaid, totalPending, byDepartment, byDesignation }
 */
export async function getPayrollReport(month, department = '') {
  const salariesRef = dbRef(db, PATH.salaries);
  const snap = await get(salariesRef);
  if (!snap.exists()) return { totalPaid: 0, totalPending: 0, byDepartment: {}, byDesignation: {} };

  const salaries = Object.values(snap.val());
  let filtered = salaries.filter(s => s.month === month);
  if (department) filtered = filtered.filter(s => s.department === department);

  const totalPaid = filtered.filter(s => s.status === 'Paid').reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const totalPending = filtered.filter(s => s.status !== 'Paid').reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const byDepartment = {};
  const byDesignation = {};
  filtered.forEach(s => {
    const dept = s.department || 'Unknown';
    byDepartment[dept] = (byDepartment[dept] || 0) + Number(s.amount || 0);
    const desig = s.designation || 'Unknown';
    byDesignation[desig] = (byDesignation[desig] || 0) + Number(s.amount || 0);
  });

  return { totalPaid, totalPending, byDepartment, byDesignation };
}

/**
 * Get student list with filters
 * @param {string} classFilter - optional class
 * @param {string} sectionFilter - optional section
 * @param {string} statusFilter - optional status
 * @returns {Promise<Array>} - array of student objects
 */
export async function getStudentListReport(classFilter = '', sectionFilter = '', statusFilter = '') {
  const studentsRef = dbRef(db, PATH.students);
  const snap = await get(studentsRef);
  if (!snap.exists()) return [];
  const students = Object.values(snap.val());
  let filtered = students;
  if (classFilter) filtered = filtered.filter(s => s.class === classFilter);
  if (sectionFilter) filtered = filtered.filter(s => s.section === sectionFilter);
  if (statusFilter) filtered = filtered.filter(s => s.status === statusFilter);
  return filtered;
}
