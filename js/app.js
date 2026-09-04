// js/admission/admission-router.js
var db = window.db;

window.admissionModule = {};

var ADMISSIONS_PATH = 'admissions';
var STUDENTS_PATH = 'students';
var COUNTERS_PATH = 'admissionCounters';
var ENROLLMENT_COUNTERS_PATH = 'enrollmentCounters';

var allAdmissions = [];
var currentEditId = null;
var currentMode = 'new';
var formData = {};
var formStep = 1;
var draftId = null;

// ---- Helpers (keep your existing helpers: generateToken, getCurrentSession, etc.) ----
// ... (all your helper functions remain unchanged) ...

// ============================================================
// MAIN RENDER – decides list or form based on the route parameter
// ============================================================
function render(container, route) {
  if (!container) return;
  if (!db) {
    container.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Database not available</div></div>';
    return;
  }

  // route is something like 'admission', 'admission/new', or 'admission/edit/xyz'
  var routeStr = route || 'admission';

  if (routeStr === 'admission/new') {
    renderForm(container, 'new');
  } else if (routeStr.startsWith('admission/edit/')) {
    var id = routeStr.split('/')[2]; // extract the ID
    if (id) {
      renderForm(container, 'edit', id);
    } else {
      renderList(container);
    }
  } else {
    // Default: show the list
    renderList(container);
  }
}

// ---- RENDER LIST (your existing list view) ----
function renderList(container) {
  // ... your existing renderList code ...
  // (keep everything from your current renderList function)
}

// ---- RENDER FORM (your existing form rendering) ----
function renderForm(container, mode, id) {
  // ... your existing renderForm code ...
  // (keep everything from your current renderForm function)
}

// ---- All other functions (loadAdmissions, renderTableRows, filterTable, viewAdmission, deleteRecord, goToStep, submitAdmission, uploadPhoto, removePhoto, toggleOfflineDeclaration, cancelForm, saveDraft, autoPopulatePreviousClass, downloadPDF, etc.) remain exactly as they are ----
// ... (keep all your existing functions unchanged) ...

// ---- Expose functions ----
window.admissionModule.render = render;
window.admissionModule.renderForm = renderForm;
window.admissionModule.filterTable = filterTable;
window.admissionModule.viewAdmission = viewAdmission;
window.admissionModule.deleteRecord = deleteRecord;
window.admissionModule.downloadPDF = downloadPDF;
window.admissionModule.goToStep = goToStep;
window.admissionModule.submitAdmission = submitAdmission;
window.admissionModule.uploadPhoto = uploadPhoto;
window.admissionModule.removePhoto = removePhoto;
window.admissionModule.toggleOfflineDeclaration = toggleOfflineDeclaration;
window.admissionModule.cancelForm = cancelForm;
window.admissionModule.saveDraft = saveDraft;
window.admissionModule.autoPopulatePreviousClass = autoPopulatePreviousClass;

export { render, renderForm };
