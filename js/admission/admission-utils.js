// Utilities for admission module – validation, QR tokens, status helpers
import { STATUSES, STATUS_LABELS, DOC_STATUSES, DOC_TYPES } from "./admission-config.js";

/**
 * Generate QR code token (secure hash of admission ID)
 * In production, use signed JWT or HMAC. For simplicity, base64 encode the ID.
 * @param {string} admissionId - Admission record ID
 * @returns {string} - Encoded token
 */
export function generateQRToken(admissionId) {
  // Simple encoding – for production, sign with a secret
  return btoa(admissionId);
}

/**
 * Decode QR token back to admission ID
 * @param {string} token - Encoded token
 * @returns {string} - Admission ID
 */
export function decodeQRToken(token) {
  try {
    return atob(token);
  } catch (e) {
    return null;
  }
}

/**
 * Validate admission form data
 * @param {Object} data - Form data object
 * @param {Array} documents - Array of document objects
 * @returns {Array} - Array of error strings
 */
export function validateAdmission(data, documents = []) {
  const errors = [];
  
  // Required fields
  if (!data.studentName?.trim()) errors.push('Student name is required');
  if (!data.gender) errors.push('Gender is required');
  if (!data.dob) errors.push('Date of birth is required');
  if (!data.class) errors.push('Class is required');
  if (!data.fatherName?.trim()) errors.push("Father's name is required");
  if (!data.phone || !/^[0-9]{10}$/.test(data.phone)) errors.push('Valid 10-digit phone number required');
  
  // Email validation if provided
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email address');
  
  // Check required documents
  DOC_TYPES.forEach(doc => {
    if (doc.required) {
      const uploaded = documents?.find(d => d.key === doc.key);
      if (!uploaded) errors.push(`Document "${doc.label}" is required`);
    }
  });
  
  // Duplicate check could be done here but is async, so handled separately
  return errors;
}

/**
 * Get human-readable status label
 * @param {string} status - Status key
 * @returns {string} - Display label
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || 'Unknown';
}

/**
 * Get document status label
 * @param {string} status - Document status key
 * @returns {string} - Display label
 */
export function getDocStatusLabel(status) {
  const map = {
    pending: 'Pending',
    verified: 'Verified',
    missing: 'Missing',
    rejected: 'Rejected'
  };
  return map[status] || status || 'Unknown';
}

/**
 * Get badge CSS class for admission status
 * @param {string} status - Status key
 * @returns {string} - Badge class name
 */
export function getStatusBadge(status) {
  const map = {
    draft: 'slate',
    submitted: 'indigo',
    doc_verification: 'amber',
    fee_verification: 'amber',
    principal_approval: 'amber',
    completed: 'green',
    rejected: 'red'
  };
  return map[status] || 'slate';
}

/**
 * Get badge CSS class for document status
 * @param {string} status - Document status key
 * @returns {string} - Badge class name
 */
export function getDocBadge(status) {
  const map = {
    pending: 'slate',
    verified: 'green',
    missing: 'red',
    rejected: 'red'
  };
  return map[status] || 'slate';
}

/**
 * Check if admission is in a final state (completed or rejected)
 * @param {string} status - Status key
 * @returns {boolean}
 */
export function isFinalStatus(status) {
  return status === STATUSES.COMPLETED || status === STATUSES.REJECTED;
}

/**
 * Check if admission can be edited (only draft and submitted)
 * @param {string} status - Status key
 * @returns {boolean}
 */
export function isEditable(status) {
  return status === STATUSES.DRAFT || status === STATUSES.SUBMITTED;
}

/**
 * Get next workflow step based on current status
 * @param {string} status - Current status
 * @returns {number} - Next step index (0-based)
 */
export function getWorkflowStep(status) {
  const map = {
    [STATUSES.DRAFT]: 0,
    [STATUSES.SUBMITTED]: 1,
    [STATUSES.DOC_VERIFICATION]: 2,
    [STATUSES.FEE_VERIFICATION]: 3,
    [STATUSES.PRINCIPAL_APPROVAL]: 4,
    [STATUSES.COMPLETED]: 5,
    [STATUSES.REJECTED]: -1
  };
  return map[status] !== undefined ? map[status] : 0;
}

/**
 * Format file size in human-readable form
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted string
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Validate file type against allowed MIME types
 * @param {File} file - File object
 * @param {Array} allowedTypes - Array of MIME types
 * @returns {boolean}
 */
export function isValidFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']) {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size against max limit (in MB)
 * @param {File} file - File object
 * @param {number} maxMB - Maximum file size in MB
 * @returns {boolean}
 */
export function isValidFileSize(file, maxMB = 5) {
  return file.size <= maxMB * 1024 * 1024;
}
