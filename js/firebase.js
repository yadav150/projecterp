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

// (You can DELETE the fileToDataUrl function entirely now, it's not needed)

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
