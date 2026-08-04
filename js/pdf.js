// Attendance data layer – separate module to avoid collisions
import { db, PATH, dbRef, get, set, update, remove, onValue, query, orderByChild } from "./firebase.js";

const ATTENDANCE_PATH = `${PATH.students.replace(/\/students$/, '')}/attendance`;

/**
 * Save attendance records for a specific date and type
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {string} type - 'students' or 'teachers'
 * @param {object} records - { id: status } where status is 'present', 'absent', 'late', or 'leave'
 */
export async function saveAttendance(date, type, records) {
  const path = `${ATTENDANCE_PATH}/${type}/${date}`;
  const ref = dbRef(db, path);
  await set(ref, records);
  return records;
}

/**
 * Get attendance records for a specific date and type
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {string} type - 'students' or 'teachers'
 * @returns {Promise<object>} - { id: status }
 */
export async function getAttendance(date, type) {
  const path = `${ATTENDANCE_PATH}/${type}/${date}`;
  const ref = dbRef(db, path);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}

/**
 * Subscribe to attendance records for a specific date and type
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {string} type - 'students' or 'teachers'
 * @param {function} cb - Callback with attendance data
 * @returns {function} - Unsubscribe function
 */
export function subscribeAttendance(date, type, cb) {
  const path = `${ATTENDANCE_PATH}/${type}/${date}`;
  const ref = dbRef(db, path);
  const off = onValue(ref, (snap) => {
    cb(snap.exists() ? snap.val() : {});
  });
  return off;
}

/**
 * Get attendance summary for a student
 * @param {string} studentId - Student ID
 * @param {string} month - ISO month string (YYYY-MM)
 * @returns {Promise<object>} - { present, absent, late, leave, total }
 */
export async function getStudentAttendanceSummary(studentId, month) {
  const path = `${ATTENDANCE_PATH}/students`;
  const ref = dbRef(db, path);
  const snap = await get(ref);
  if (!snap.exists()) return { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

  const data = snap.val();
  const summary = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
  const monthPrefix = month || new Date().toISOString().slice(0, 7);

  for (const [date, records] of Object.entries(data)) {
    if (!date.startsWith(monthPrefix)) continue;
    const status = records[studentId];
    if (status) {
      summary[status] = (summary[status] || 0) + 1;
      summary.total += 1;
    }
  }
  return summary;
}

/**
 * Get attendance summary for a teacher
 * @param {string} teacherId - Teacher ID
 * @param {string} month - ISO month string (YYYY-MM)
 * @returns {Promise<object>} - { present, absent, late, leave, total }
 */
export async function getTeacherAttendanceSummary(teacherId, month) {
  const path = `${ATTENDANCE_PATH}/teachers`;
  const ref = dbRef(db, path);
  const snap = await get(ref);
  if (!snap.exists()) return { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

  const data = snap.val();
  const summary = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
  const monthPrefix = month || new Date().toISOString().slice(0, 7);

  for (const [date, records] of Object.entries(data)) {
    if (!date.startsWith(monthPrefix)) continue;
    const status = records[teacherId];
    if (status) {
      summary[status] = (summary[status] || 0) + 1;
      summary.total += 1;
    }
  }
  return summary;
}

/**
 * Get monthly attendance statistics for a class
 * @param {string} className - Class name
 * @param {string} section - Section
 * @param {string} month - ISO month string (YYYY-MM)
 * @param {Array} students - Array of student objects with id
 * @returns {Promise<object>} - { present, absent, late, leave, total }
 */
export async function getClassAttendanceSummary(className, section, month, students) {
  const path = `${ATTENDANCE_PATH}/students`;
  const ref = dbRef(db, path);
  const snap = await get(ref);
  if (!snap.exists()) return { present: 0, absent: 0, late: 0, leave: 0, total: 0 };

  const data = snap.val();
  const summary = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
  const monthPrefix = month || new Date().toISOString().slice(0, 7);
  const studentIds = students.map(s => s.id);

  for (const [date, records] of Object.entries(data)) {
    if (!date.startsWith(monthPrefix)) continue;
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
