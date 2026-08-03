// Data layer using Realtime Database — complete with teacher sub‑data
import {
  db, PATH, dbRef, push, set, update, remove, get, onValue,
  nextCounter, uploadPhoto
} from "./firebase.js";

// ---------- Helpers ----------
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

// ================================================================
//  STUDENTS
// ================================================================
export async function createStudent(payload, photoFile) {
  const admissionId = await nextCounter("admissionId", "ADM-", 5);
  const admissionNumber = await nextCounter("admissionNumber", "", 6);
  const data = {
    ...payload,
    admissionId,
    admissionNumber,
    status: payload.status || "Active",
    photoUrl: null,
    createdAt: nowMs(),
    updatedAt: nowMs()
  };
  const id = await pushRecord(PATH.students, data);
  let photoUrl = null;
  if (photoFile) {
    photoUrl = await uploadPhoto("students", id, photoFile);
    await update(dbRef(db, `${PATH.students}/${id}`), { photoUrl });
  }
  return { id, ...data, photoUrl };
}

export async function updateStudent(id, payload, photoFile) {
  let photoUrl = payload.photoUrl;
  if (photoFile) photoUrl = await uploadPhoto("students", id, photoFile);
  await update(dbRef(db, `${PATH.students}/${id}`), { ...payload, photoUrl: photoUrl ?? null, updatedAt: nowMs() });
  return { id, ...payload, photoUrl };
}

export async function deleteStudent(id) { await remove(dbRef(db, `${PATH.students}/${id}`)); }
export async function getStudent(id) { return getById(PATH.students, id); }
export function subscribeStudents(cb) { return subscribeCollection(PATH.students, cb); }

// ================================================================
//  TEACHERS
// ================================================================
export async function createTeacher(payload, photoFile) {
  const teacherId = await nextCounter("teacherId", "TCH-", 4);
  const data = {
    ...payload,
    teacherId,
    status: payload.status || "Active",
    photoUrl: null,
    createdAt: nowMs(),
    updatedAt: nowMs()
  };
  const id = await pushRecord(PATH.teachers, data);
  let photoUrl = null;
  if (photoFile) {
    photoUrl = await uploadPhoto("teachers", id, photoFile);
    await update(dbRef(db, `${PATH.teachers}/${id}`), { photoUrl });
  }
  return { id, ...data, photoUrl };
}

export async function updateTeacher(id, payload, photoFile) {
  let photoUrl = payload.photoUrl;
  if (photoFile) photoUrl = await uploadPhoto("teachers", id, photoFile);
  await update(dbRef(db, `${PATH.teachers}/${id}`), { ...payload, photoUrl: photoUrl ?? null, updatedAt: nowMs() });
  return { id, ...payload, photoUrl };
}

export async function deleteTeacher(id) { await remove(dbRef(db, `${PATH.teachers}/${id}`)); }
export async function getTeacher(id) { return getById(PATH.teachers, id); }
export function subscribeTeachers(cb) { return subscribeCollection(PATH.teachers, cb); }

// ================================================================
//  FEES
// ================================================================
export async function recordFeePayment(payload) {
  const receiptNumber = await nextCounter("feeReceipt", "FR-", 6);
  const data = { ...payload, receiptNumber, createdAt: nowMs() };
  const id = await pushRecord(PATH.fees, data);
  return { id, ...data };
}

export async function deleteFee(id) { await remove(dbRef(db, `${PATH.fees}/${id}`)); }
export async function getFee(id) { return getById(PATH.fees, id); }
export function subscribeFees(cb) { return subscribeCollection(PATH.fees, cb); }

// ================================================================
//  SALARIES
// ================================================================
export async function recordSalaryPayment(payload) {
  const receiptNumber = await nextCounter("salaryReceipt", "SR-", 6);
  const data = { ...payload, receiptNumber, createdAt: nowMs() };
  const id = await pushRecord(PATH.salaries, data);
  return { id, ...data };
}

export async function deleteSalary(id) { await remove(dbRef(db, `${PATH.salaries}/${id}`)); }
export async function getSalary(id) { return getById(PATH.salaries, id); }
export function subscribeSalaries(cb) { return subscribeCollection(PATH.salaries, cb); }

// ================================================================
//  TEACHER SUB‑DATA: Attendance, Subjects, Experience, Salary
// ================================================================

// ---------- Attendance ----------
// Stores as { date: "present" | "absent" } under teacher/{id}/attendance
export async function updateTeacherAttendance(teacherId, date, status) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/attendance/${date}`);
  await set(ref, status);
}

export async function getTeacherAttendance(teacherId) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/attendance`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}

export async function deleteTeacherAttendance(teacherId, date) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/attendance/${date}`);
  await remove(ref);
}

// ---------- Subjects ----------
// Stores as array of strings under teacher/{id}/subjects
export async function setTeacherSubjects(teacherId, subjects) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/subjects`);
  await set(ref, subjects);
}

export async function addTeacherSubject(teacherId, subject) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/subjects`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  if (!current.includes(subject)) {
    current.push(subject);
    await set(ref, current);
  }
}

export async function removeTeacherSubject(teacherId, subject) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/subjects`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  const updated = current.filter(s => s !== subject);
  await set(ref, updated);
}

// ---------- Experience ----------
// Stores as array of objects under teacher/{id}/experience
export async function addTeacherExperience(teacherId, exp) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/experience`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  current.push({ id: Date.now(), ...exp });
  await set(ref, current);
}

export async function updateTeacherExperience(teacherId, expId, updatedExp) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/experience`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  const index = current.findIndex(e => e.id === expId);
  if (index !== -1) {
    current[index] = { ...current[index], ...updatedExp };
    await set(ref, current);
  }
}

export async function removeTeacherExperience(teacherId, expId) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}/experience`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  const updated = current.filter(e => e.id !== expId);
  await set(ref, updated);
}

// ---------- Salary (quick update) ----------
export async function updateTeacherSalary(teacherId, salary) {
  const ref = dbRef(db, `${PATH.teachers}/${teacherId}`);
  await update(ref, { salary: Number(salary) });
}
