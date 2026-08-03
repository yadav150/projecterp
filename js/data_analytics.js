// Data layer for Essential Analytics (FLN, Skills, Behavioral, Parent Engagement, Sibling/Fee)
import { db, PATH, dbRef, push, set, update, remove, get, onValue, nextCounter } from "./firebase.js";

function nowMs() { return Date.now(); }
async function getById(path, id) {
  const s = await get(dbRef(db, `${path}/${id}`));
  return s.exists() ? { id, ...s.val() } : null;
}
async function pushRecord(path, data) {
  const r = push(dbRef(db, path));
  await set(r, data);
  return r.key;
}
function subscribeCollection(path, cb) {
  const r = dbRef(db, path);
  const off = onValue(r, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, v]) => ({ id, ...v }));
    cb(list);
  }, (err) => cb([], err));
  return off;
}

// ---------- FLN Tracking ----------
// Store per student: readingLevel (Beginner/Intermediate/Advanced), mathSkills: { counting: 'Beginner', addition: 'Intermediate', ... }
export async function setFLNData(studentId, data) {
  const ref = dbRef(db, `${PATH.analytics}/fln/${studentId}`);
  await set(ref, { ...data, updatedAt: nowMs() });
}
export async function getFLNData(studentId) {
  const ref = dbRef(db, `${PATH.analytics}/fln/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : null;
}
export function subscribeFLNData(cb) {
  return subscribeCollection(`${PATH.analytics}/fln`, cb);
}

// ---------- Skill-Based Competency ----------
// Store per student per subject: { subject, skills: { skillName: rating (1-5) } }
export async function setStudentSkills(studentId, subject, skills) {
  const ref = dbRef(db, `${PATH.analytics}/skills/${studentId}/${subject}`);
  await set(ref, { skills, updatedAt: nowMs() });
}
export async function getStudentSkills(studentId) {
  const ref = dbRef(db, `${PATH.analytics}/skills/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export function subscribeSkills(cb) {
  return subscribeCollection(`${PATH.analytics}/skills`, cb);
}

// ---------- Behavioral & Micro-Attendance Trends ----------
// Store behavioral notes per student: { date, type (participation, behavior), note, score (1-5) }
export async function addBehavioralNote(studentId, note) {
  const ref = dbRef(db, `${PATH.analytics}/behavior/${studentId}`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  current.push({ id: Date.now(), ...note, createdAt: nowMs() });
  await set(ref, current);
}
export async function getBehavioralNotes(studentId) {
  const ref = dbRef(db, `${PATH.analytics}/behavior/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : [];
}
export function subscribeBehavioral(cb) {
  return subscribeCollection(`${PATH.analytics}/behavior`, cb);
}

// ---------- Parent Engagement ----------
// Store per student: { lastLogin, noticesRead: [noticeId], homeworkChecked: [date] }
export async function updateParentEngagement(studentId, data) {
  const ref = dbRef(db, `${PATH.analytics}/parentEngagement/${studentId}`);
  await update(ref, { ...data, updatedAt: nowMs() });
}
export async function getParentEngagement(studentId) {
  const ref = dbRef(db, `${PATH.analytics}/parentEngagement/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export function subscribeParentEngagement(cb) {
  return subscribeCollection(`${PATH.analytics}/parentEngagement`, cb);
}

// ---------- Sibling & Fee Concession ----------
// Store family groups: { familyId, siblings: [studentId], concessionPercent (0-100) }
export async function createFamily(data) {
  const familyId = await nextCounter("familyId", "FAM-", 4);
  const ref = dbRef(db, `${PATH.families}/${familyId}`);
  await set(ref, { ...data, familyId, createdAt: nowMs() });
  return familyId;
}
export async function updateFamily(familyId, data) {
  const ref = dbRef(db, `${PATH.families}/${familyId}`);
  await update(ref, { ...data, updatedAt: nowMs() });
}
export async function getFamily(familyId) {
  const ref = dbRef(db, `${PATH.families}/${familyId}`);
  const snap = await get(ref);
  return snap.exists() ? { id: familyId, ...snap.val() } : null;
}
export function subscribeFamilies(cb) {
  return subscribeCollection(PATH.families, cb);
}
export async function getAllFamilies() {
  const ref = dbRef(db, PATH.families);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
