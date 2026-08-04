// Utilities for admission module
import { STATUSES, STATUS_LABELS, DOC_TYPES, DOC_STATUSES } from "./admission-config.js";

/**
 * Generate QR code value (secure hash of admission ID)
 * We use a simple token; in production, use signed JWT or HMAC
 */
export function generateQRToken(admissionId) {
  // For demo, just base64 encode the ID; can be enhanced with signing
  return btoa(admissionId);
}

/**
 * Validate admission form data
 * Returns array of error messages
 */
export function validateAdmission(data, documents) {
  const errors = [];
  if (!data.studentName?.trim()) errors.push('Student name is required');
  if (!data.gender) errors.push('Gender is required');
  if (!data.dob) errors.push('Date of birth is required');
  if (!data.class) errors.push('Class is required');
  if (!data.fatherName?.trim()) errors.push("Father's name is required");
  if (!data.phone || !/^[0-9]{10}$/.test(data.phone)) errors.push('Valid 10-digit phone number required');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email');
  // Check required documents
  DOC_TYPES.forEach(doc => {
    if (doc.required) {
      const uploaded = documents?.find(d => d.key === doc.key);
      if (!uploaded) errors.push(`Document "${doc.label}" is required`);
    }
  });
  return errors;
}

/**
 * Format status for display
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

/**
 * Format document status for display
 */
export function getDocStatusLabel(status) {
  const map = {
    pending: 'Pending',
    verified: 'Verified',
    missing: 'Missing',
    rejected: 'Rejected'
  };
  return map[status] || status;
}

/**
 * Get badge class for status
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
 * Get document status badge class
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
