// Admission module configuration – constants, statuses, document types, fee types
export const ADMISSION_PATH = 'erp_bfa/admissions';
export const DOCUMENTS_PATH = 'erp_bfa/admission_documents';

// Admission workflow statuses
export const STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  DOC_VERIFICATION: 'doc_verification',
  FEE_VERIFICATION: 'fee_verification',
  PRINCIPAL_APPROVAL: 'principal_approval',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
};

// Human-readable labels for statuses
export const STATUS_LABELS = {
  [STATUSES.DRAFT]: 'Draft',
  [STATUSES.SUBMITTED]: 'Submitted',
  [STATUSES.DOC_VERIFICATION]: 'Document Verification',
  [STATUSES.FEE_VERIFICATION]: 'Fee Verification',
  [STATUSES.PRINCIPAL_APPROVAL]: 'Principal Approval',
  [STATUSES.COMPLETED]: 'Admission Completed',
  [STATUSES.REJECTED]: 'Rejected'
};

// Document types required/optional for admission
export const DOC_TYPES = [
  { key: 'photo', label: 'Passport Photo', required: true },
  { key: 'birth_certificate', label: 'Birth Certificate', required: false },
  { key: 'aadhaar', label: 'Aadhaar Card', required: false },
  { key: 'previous_marksheet', label: 'Previous Marksheet', required: false },
  { key: 'transfer_certificate', label: 'Transfer Certificate', required: false },
  { key: 'caste_certificate', label: 'Caste Certificate', required: false },
  { key: 'income_certificate', label: 'Income Certificate', required: false }
];

// Document verification statuses
export const DOC_STATUSES = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  MISSING: 'missing',
  REJECTED: 'rejected'
};

// Fee types for admission
export const FEE_TYPES = [
  { key: 'admission_fee', label: 'Admission Fee' },
  { key: 'registration_fee', label: 'Registration Fee' },
  { key: 'security_deposit', label: 'Security Deposit' },
  { key: 'transport_fee', label: 'Transport Fee' },
  { key: 'hostel_fee', label: 'Hostel Fee' }
];

// Maximum class capacity (configurable)
export const MAX_CLASS_CAPACITY = 40;

// Default values for new admissions
export const DEFAULT_VALUES = {
  status: STATUSES.DRAFT,
  workflowStep: 1,
  documents: [],
  feeDetails: {},
  auditLog: [],
  createdAt: null,
  updatedAt: null
};
