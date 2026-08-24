// Firebase initialization using Realtime Database
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase, ref as dbRef, push, set, update, remove, get, child,
  onValue, query, orderByChild, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCdSPOM47RDoQpH2uIOlGpphS6RAiyWao",
  authDomain: "skill2jobvisitcount.firebaseapp.com",
  databaseURL: "https://skill2jobvisitcount-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "skill2jobvisitcount",
  storageBucket: "skill2jobvisitcount.firebasestorage.app",
  messagingSenderId: "765089407089",
  appId: "1:765089407089:web:a410facdd7dfb6e1fbbbd0",
  measurementId: "G-S5X1VJQS79"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);

// EXPORT ALL REQUIRED FUNCTIONS – FIX FOR BLANK PAGE
export {
  dbRef,
  push,
  set,
  update,
  remove,
  get,
  child,
  onValue,
  query,
  orderByChild,
  runTransaction,
  serverTimestamp,
  sRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

const NS = "erp_bfa";
export const PATH = {
  students: `${NS}/students`,
  teachers: `${NS}/teachers`,
  fees: `${NS}/fees`,
  salaries: `${NS}/salaries`,
  counters: `${NS}/counters`
};

// ---------- FIXED: nextCounter ----------
export async function nextCounter(name, prefix, pad = 4) {
  const cRef = dbRef(db, `${PATH.counters}/${name}`);
  const result = await runTransaction(cRef, (current) => (Number(current) || 0) + 1);
  
  // CRITICAL FIX: Check if transaction actually committed
  if (!result.committed) {
    throw new Error(`Failed to generate new ID for ${name}. Please check your network and try again.`);
  }
  
  const value = result.snapshot.val();
  return `${prefix}${String(value).padStart(pad, "0")}`;
}

// ---------- FIXED: uploadPhoto (NO BASE64 FALLBACK) ----------
export async function uploadPhoto(kind, id, file) {
  if (!file) return null;
  try {
    const path = `${NS}/${kind}/${id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const r = sRef(storage, path);
    await uploadBytes(r, file);
    return await getDownloadURL(r);
  } catch (e) {
    console.error("Photo upload failed:", e?.message);
    // FIX: Return null instead of base64 to prevent DB bloat and UI lag
    return null; 
  }
}

// fileToDataUrl function – DELETED (not needed)

// ---------- FIXED: deleteFile (Skip non-http URLs) ----------
export async function deleteFile(url) {
  if (!url || !url.startsWith('http')) return; // FIX: Ignore base64 or invalid URLs
  try {
    const decodedUrl = decodeURIComponent(url);
    const match = decodedUrl.match(/\/o\/(.+?)\?/);
    if (!match) return;
    const path = match[1];
    const fileRef = sRef(storage, path);
    await deleteObject(fileRef);
  } catch (e) {
    console.warn("Failed to delete file:", e.message);
  }
}

// ---------- FIXED: firebaseHealthCheck ----------
export async function firebaseHealthCheck() {
  try {
    const snapshot = await get(dbRef(db, `${NS}/_meta`));
    return snapshot.exists(); // FIX: Actually checks if data exists
  } catch (e) {
    console.warn("Realtime DB health check failed:", e?.message || e);
    return false;
  }
}
