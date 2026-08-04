// Data layer for admissions – CRUD, counters, duplicate checks, document handling
import { db, PATH, dbRef, push, set, update, remove, get, onValue, runTransaction, nextCounter } from "../firebase.js";
import { ADMISSION_PATH, STATUSES, DOC_STATUSES, DEFAULT_VALUES } from "./admission-config.js";
import { createStudent } from "../data.js";

/**
 * Create a new admission application (draft)
 * @param {Object} payload - Initial form data
 * @returns {Promise<Object>} - Created admission record with ID
 */
export async function createAdmission(payload) {
  const admissionNumber = await nextCounter('admissionNumber', '', 6);
  const data = {
    ...payload,
    admissionNumber,
    status: STATUSES.DRAFT,
    workflowStep: 1,
    documents: [],
    feeDetails: {},
    auditLog: [{
      action: 'created',
      timestamp: Date.now(),
      message: 'Application created as draft'
    }],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const ref = push(dbRef(db, ADMISSION_PATH));
  await set(ref, data);
  return { id: ref.key, ...data };
}

/**
 * Update an admission application
 * @param {string} id - Admission ID
 * @param {Object} payload - Data to update
 * @returns {Promise<Object>} - Updated admission record
 */
export async function updateAdmission(id, payload) {
  const ref = dbRef(db, `${ADMISSION_PATH}/${id}`);
  const updateData = { ...payload, updatedAt: Date.now() };
  await update(ref, updateData);
  return { id, ...updateData };
}

/**
 * Get admission by ID
 * @param {string} id - Admission ID
 * @returns {Promise<Object|null>} - Admission record or null
 */
export async function getAdmission(id) {
  const snap = await get(dbRef(db, `${ADMISSION_PATH}/${id}`));
  return snap.exists() ? { id, ...snap.val() } : null;
}

/**
 * Subscribe to all admissions (realtime)
 * @param {Function} cb - Callback with array of admissions
 * @returns {Function} - Unsubscribe function
 */
export function subscribeAdmissions(cb) {
  const ref = dbRef(db, ADMISSION_PATH);
  return onValue(ref, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, v]) => ({ id, ...v }));
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(list);
  }, (err) => cb([], err));
}

/**
 * Delete admission (soft delete)
 * @param {string} id - Admission ID
 * @returns {Promise<void>}
 */
export async function deleteAdmission(id) {
  const ref = dbRef(db, `${ADMISSION_PATH}/${id}`);
  await update(ref, { deleted: true, updatedAt: Date.now() });
}

/**
 * Check duplicate admission by field value
 * @param {string} field - Field name (e.g., 'aadhaar', 'phone')
 * @param {string} value - Field value to check
 * @returns {Promise<boolean>} - True if duplicate exists
 */
export async function checkDuplicate(field, value) {
  const snap = await get(dbRef(db, ADMISSION_PATH));
  if (!snap.exists()) return false;
  const data = snap.val();
  for (const key in data) {
    const record = data[key];
    if (record[field] === value && record.status !== STATUSES.REJECTED) {
      return true;
    }
  }
  return false;
}

/**
 * Complete admission – creates student profile and updates status
 * @param {string} id - Admission ID
 * @returns {Promise<Object>} - Created student record
 */
export async function completeAdmission(id) {
  const admission = await getAdmission(id);
  if (!admission) throw new Error('Admission not found');
  // Create student profile
  const studentData = {
    name: admission.studentName,
    gender: admission.gender,
    dob: admission.dob,
    class: admission.class,
    section: admission.section,
    rollNumber: admission.rollNumber || '',
    fatherName: admission.fatherName,
    motherName: admission.motherName,
    guardian: admission.guardian || '',
    phone: admission.phone,
    emergencyContact: admission.emergencyContact || '',
    email: admission.email || '',
    address: admission.address || '',
    bloodGroup: admission.bloodGroup || '',
    religion: admission.religion || '',
    category: admission.category || '',
    previousSchool: admission.previousSchool || '',
    admissionDate: admission.admissionDate || new Date().toISOString().slice(0,10),
    status: 'Active',
    photoUrl: admission.photoUrl || null
  };
  const created = await createStudent(studentData, null);
  // Update admission status
  await updateAdmission(id, {
    status: STATUSES.COMPLETED,
    studentId: created.id,
    completedAt: Date.now()
  });
  // Add audit log
  await addAuditLog(id, 'Admission completed and student profile created');
  return created;
}

/**
 * Upload document and add to admission record
 * @param {string} admissionId - Admission ID
 * @param {string} docKey - Document type key
 * @param {File} file - File to upload
 * @returns {Promise<Object>} - Document entry
 */
export async function uploadAdmissionDocument(admissionId, docKey, file) {
  // Import storage functions dynamically to avoid circular deps
  const { sRef, storage, uploadBytes, getDownloadURL } = await import("../firebase.js");
  const path = `admissions/${admissionId}/docs/${docKey}_${Date.now()}_${file.name}`;
  const ref = sRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  const docEntry = {
    key: docKey,
    name: file.name,
    url: url,
    status: DOC_STATUSES.PENDING,
    uploadedAt: Date.now()
  };
  // Fetch existing docs and append
  const admission = await getAdmission(admissionId);
  const docs = admission.documents || [];
  const existing = docs.find(d => d.key === docKey);
  let updatedDocs;
  if (existing) {
    // Replace existing
    updatedDocs = docs.filter(d => d.key !== docKey);
    updatedDocs.push(docEntry);
  } else {
    updatedDocs = [...docs, docEntry];
  }
  await updateAdmission(admissionId, { documents: updatedDocs });
  return docEntry;
}

/**
 * Update document verification status
 * @param {string} admissionId - Admission ID
 * @param {string} docKey - Document type key
 * @param {string} status - Verification status (pending/verified/rejected/missing)
 * @param {string} remarks - Optional remarks
 * @returns {Promise<void>}
 */
export async function verifyDocument(admissionId, docKey, status, remarks = '') {
  const admission = await getAdmission(admissionId);
  const docs = admission.documents || [];
  const idx = docs.findIndex(d => d.key === docKey);
  if (idx === -1) throw new Error('Document not found');
  docs[idx].status = status;
  docs[idx].remarks = remarks;
  docs[idx].verifiedAt = Date.now();
  await updateAdmission(admissionId, { documents: docs });
  await addAuditLog(admissionId, `Document ${docKey} marked as ${status}`);
}

/**
 * Add audit log entry
 * @param {string} admissionId - Admission ID
 * @param {string} message - Log message
 * @returns {Promise<void>}
 */
export async function addAuditLog(admissionId, message) {
  const admission = await getAdmission(admissionId);
  const logs = admission.auditLog || [];
  logs.push({
    action: message,
    timestamp: Date.now()
  });
  await updateAdmission(admissionId, { auditLog: logs });
}

/**
 * Get admission statistics for dashboard
 * @returns {Promise<Object>} - Statistics object
 */
export async function getAdmissionStats() {
  const snap = await get(dbRef(db, ADMISSION_PATH));
  if (!snap.exists()) return { total: 0, draft: 0, submitted: 0, docVer: 0, feeVer: 0, principal: 0, completed: 0, rejected: 0 };
  const data = snap.val();
  const list = Object.values(data);
  const stats = {
    total: list.length,
    draft: list.filter(a => a.status === STATUSES.DRAFT).length,
    submitted: list.filter(a => a.status === STATUSES.SUBMITTED).length,
    docVer: list.filter(a => a.status === STATUSES.DOC_VERIFICATION).length,
    feeVer: list.filter(a => a.status === STATUSES.FEE_VERIFICATION).length,
    principal: list.filter(a => a.status === STATUSES.PRINCIPAL_APPROVAL).length,
    completed: list.filter(a => a.status === STATUSES.COMPLETED).length,
    rejected: list.filter(a => a.status === STATUSES.REJECTED).length
  };
  return stats;
}
