// Data layer for Academic features: attendance, exams, timetable, student records
import { db, PATH, dbRef, push, set, update, remove, get, onValue, nextCounter } from "./firebase.js";

function nowMs() { return Date.now(); }
function subscribeCollection(path, cb) {
  const r = dbRef(db, path);
  const off = onValue(r, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, v]) => ({ id, ...v }));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(list);
  }, (err) => cb([], err));
  return off;
}
async function getById(path, id) {
  const s = await get(dbRef(db, `${path}/${id}`));
  return s.exists() ? { id, ...s.val() } : null;
}
async function pushRecord(path, data) {
  const r = push(dbRef(db, path));
  await set(r, data);
  return r.key;
}

// ---------- Student Records (Extended) ----------
export async function updateStudentRecord(studentId, field, value) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/academicRecord/${field}`);
  await set(ref, value);
}
export async function getStudentRecord(studentId, field) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/academicRecord/${field}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : null;
}
export async function addMedicalNote(studentId, note) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/academicRecord/medicalNotes`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  current.push({ id: Date.now(), ...note, createdAt: nowMs() });
  await set(ref, current);
}
export async function addDisciplinaryNote(studentId, note) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/academicRecord/disciplinary`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  current.push({ id: Date.now(), ...note, createdAt: nowMs() });
  await set(ref, current);
}
export async function addPastGrade(studentId, grade) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/academicRecord/pastGrades`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  current.push({ id: Date.now(), ...grade, createdAt: nowMs() });
  await set(ref, current);
}

// ---------- Student Attendance ----------
export async function markStudentAttendance(studentId, date, status) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/attendance/${date}`);
  await set(ref, status);
}
export async function getStudentAttendance(studentId) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/attendance`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export async function deleteStudentAttendance(studentId, date) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/attendance/${date}`);
  await remove(ref);
}
export function subscribeStudentAttendance(studentId, cb) {
  const ref = dbRef(db, `${PATH.students}/${studentId}/attendance`);
  return onValue(ref, (snap) => {
    const val = snap.val() || {};
    cb(val);
  }, (err) => cb({}, err));
}

// ---------- Exams ----------
export async function createExam(payload) {
  const examId = await nextCounter("examId", "EX-", 4);
  const data = { ...payload, examId, createdAt: nowMs() };
  const id = await pushRecord(`${PATH.exams}`, data);
  return { id, ...data };
}
export async function updateExam(id, payload) {
  const ref = dbRef(db, `${PATH.exams}/${id}`);
  await update(ref, { ...payload, updatedAt: nowMs() });
  return { id, ...payload };
}
export async function deleteExam(id) { await remove(dbRef(db, `${PATH.exams}/${id}`)); }
export async function getExam(id) { return getById(PATH.exams, id); }
export function subscribeExams(cb) { return subscribeCollection(PATH.exams, cb); }

// ---------- Marks ----------
export async function recordMarks(examId, studentId, marks, subject) {
  const ref = dbRef(db, `${PATH.marks}/${examId}/${studentId}`);
  await set(ref, { marks: Number(marks), subject, updatedAt: nowMs() });
}
export async function getMarks(examId) {
  const ref = dbRef(db, `${PATH.marks}/${examId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export async function getStudentMarks(studentId) {
  const ref = dbRef(db, `${PATH.marks}`);
  const snap = await get(ref);
  if (!snap.exists()) return {};
  const result = {};
  const allExams = snap.val();
  for (const [examId, students] of Object.entries(allExams)) {
    if (students[studentId]) {
      result[examId] = students[studentId];
    }
  }
  return result;
}

// ---------- Timetable ----------
export async function setTimetable(classId, day, period, data) {
  const ref = dbRef(db, `${PATH.timetable}/${classId}/${day}/${period}`);
  await set(ref, data);
}
export async function getTimetable(classId) {
  const ref = dbRef(db, `${PATH.timetable}/${classId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export async function getAllTimetables() {
  const ref = dbRef(db, `${PATH.timetable}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export function subscribeTimetable(classId, cb) {
  const ref = dbRef(db, `${PATH.timetable}/${classId}`);
  return onValue(ref, (snap) => {
    const val = snap.val() || {};
    cb(val);
  }, (err) => cb({}, err));
}
export async function deleteTimetable(classId, day, period) {
  const ref = dbRef(db, `${PATH.timetable}/${classId}/${day}/${period}`);
  await remove(ref);
}

// ---------- Notification (Simulated) ----------
export async function sendAttendanceAlert(parentPhone, studentName, date) {
  // In production, this would call an SMS/email API.
  // For now, log to console and show a toast.
  console.log(`Alert: ${studentName} was absent on ${date}. Notifying ${parentPhone}`);
  // Return a dummy success
  return { success: true, message: `Alert sent for ${studentName}` };
}
