// Data layer using Realtime Database
import {
  db, PATH, dbRef, push, set, update, remove, get, onValue,
  nextCounter, uploadPhoto, sRef, uploadBytes, getDownloadURL, deleteFile,
  storage // ✅ Added missing import
} from "./firebase.js";

function nowMs() { return Date.now(); }

function subscribeCollection(path, cb) {
  const r = dbRef(db, path);
  const off = onValue(r, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, v]) => ({ id, ...v }));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(list);
  }, (err) => cb([], err));
  return off; // ✅ Returns unsubscribe function – CORRECT
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

// ---------- Students ----------
export async function createStudent(payload, photoFile) {
  const admissionId = await nextCounter("admissionId", "ADM-", 5);
  const admissionNumber = await nextCounter("admissionNumber", "", 6);
  const data = {
    ...payload,
    admissionId,
    admissionNumber,
    status: payload.status || "Active",
    photoUrl: null,
    documents: [],
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

// ---------- Teachers ----------
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

// ---------- Fees ----------
export async function recordFeePayment(payload) {
  const receiptNumber = await nextCounter("feeReceipt", "FR-", 6);
  const data = { ...payload, receiptNumber, createdAt: nowMs() };
  const id = await pushRecord(PATH.fees, data);
  return { id, ...data };
}

export async function deleteFee(id) { await remove(dbRef(db, `${PATH.fees}/${id}`)); }
export async function getFee(id) { return getById(PATH.fees, id); }
export function subscribeFees(cb) { return subscribeCollection(PATH.fees, cb); }

// ---------- Salary ----------
export async function recordSalaryPayment(payload) {
  const receiptNumber = await nextCounter("salaryReceipt", "SR-", 6);
  const data = { ...payload, receiptNumber, createdAt: nowMs() };
  const id = await pushRecord(PATH.salaries, data);
  return { id, ...data };
}

export async function deleteSalary(id) { await remove(dbRef(db, `${PATH.salaries}/${id}`)); }
export async function getSalary(id) { return getById(PATH.salaries, id); }
export function subscribeSalaries(cb) { return subscribeCollection(PATH.salaries, cb); }

// ---------- Student Documents ----------
export async function addStudentDocument(studentId, file) {
  if (!file) return null;
  const docId = `doc_${Date.now()}`;
  const path = `students/${studentId}/documents/${docId}_${file.name.replace(/\s+/g, "_")}`;
  const r = sRef(storage, path); // ✅ storage is now imported
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  const docData = {
    id: docId,
    name: file.name,
    size: file.size,
    type: file.type,
    url: url,
    uploadedAt: nowMs()
  };
  const studentRef = dbRef(db, `${PATH.students}/${studentId}`);
  const snap = await get(studentRef);
  const currentDocs = snap.val()?.documents || [];
  const updatedDocs = [...currentDocs, docData];
  await update(studentRef, { documents: updatedDocs });
  return docData;
}

export async function removeStudentDocument(studentId, docId) {
  const studentRef = dbRef(db, `${PATH.students}/${studentId}`);
  const snap = await get(studentRef);
  const student = snap.val();
  if (!student || !student.documents) return;
  const doc = student.documents.find(d => d.id === docId);
  if (doc && doc.url) {
    await deleteFile(doc.url);
  }
  const updatedDocs = student.documents.filter(d => d.id !== docId);
  await update(studentRef, { documents: updatedDocs });
}

export async function updateStudentPhoto(studentId, photoFile) {
  if (!photoFile) return null;
  const studentRef = dbRef(db, `${PATH.students}/${studentId}`);
  const snap = await get(studentRef);
  const student = snap.val();
  if (student && student.photoUrl) {
    await deleteFile(student.photoUrl);
  }
  const photoUrl = await uploadPhoto("students", studentId, photoFile);
  await update(studentRef, { photoUrl });
  return photoUrl;
}
