// Data layer for Essential Analytics (FLN, Skills, Behavioral, Parent Engagement, Sibling/Fee)
import { db, dbRef, push, set, update, remove, get, onValue, nextCounter } from "./firebase.js";

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

// ---------- Own paths (no conflict with existing PATH) ----------
const NS = "erp_bfa";
const ANALYTICS_PATH = `${NS}/analytics`;
const FAMILIES_PATH = `${NS}/families`;

// ---------- FLN Tracking ----------
export async function setFLNData(studentId, data) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/fln/${studentId}`);
  await set(ref, { ...data, updatedAt: nowMs() });
}
export async function getFLNData(studentId) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/fln/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : null;
}
export function subscribeFLNData(cb) {
  return subscribeCollection(`${ANALYTICS_PATH}/fln`, cb);
}

// ---------- Skill-Based Competency ----------
export async function setStudentSkills(studentId, subject, skills) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/skills/${studentId}/${subject}`);
  await set(ref, { skills, updatedAt: nowMs() });
}
export async function getStudentSkills(studentId) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/skills/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export function subscribeSkills(cb) {
  return subscribeCollection(`${ANALYTICS_PATH}/skills`, cb);
}

// ---------- Behavioral & Micro-Attendance Trends ----------
export async function addBehavioralNote(studentId, note) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/behavior/${studentId}`);
  const snap = await get(ref);
  const current = snap.exists() ? snap.val() : [];
  current.push({ id: Date.now(), ...note, createdAt: nowMs() });
  await set(ref, current);
}
export async function getBehavioralNotes(studentId) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/behavior/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : [];
}
export function subscribeBehavioral(cb) {
  return subscribeCollection(`${ANALYTICS_PATH}/behavior`, cb);
}

// ---------- Parent Engagement ----------
export async function updateParentEngagement(studentId, data) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/parentEngagement/${studentId}`);
  await update(ref, { ...data, updatedAt: nowMs() });
}
export async function getParentEngagement(studentId) {
  const ref = dbRef(db, `${ANALYTICS_PATH}/parentEngagement/${studentId}`);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
export function subscribeParentEngagement(cb) {
  return subscribeCollection(`${ANALYTICS_PATH}/parentEngagement`, cb);
}

// ---------- Sibling & Fee Concession ----------
export async function createFamily(data) {
  const familyId = await nextCounter("familyId", "FAM-", 4);
  const ref = dbRef(db, `${FAMILIES_PATH}/${familyId}`);
  await set(ref, { ...data, familyId, createdAt: nowMs() });
  return familyId;
}
export async function updateFamily(familyId, data) {
  const ref = dbRef(db, `${FAMILIES_PATH}/${familyId}`);
  await update(ref, { ...data, updatedAt: nowMs() });
}
export async function getFamily(familyId) {
  const ref = dbRef(db, `${FAMILIES_PATH}/${familyId}`);
  const snap = await get(ref);
  return snap.exists() ? { id: familyId, ...snap.val() } : null;
}
export function subscribeFamilies(cb) {
  return subscribeCollection(FAMILIES_PATH, cb);
}
export async function getAllFamilies() {
  const ref = dbRef(db, FAMILIES_PATH);
  const snap = await get(ref);
  return snap.exists() ? snap.val() : {};
}
