// js/admission/admission-router.js
var db = window.db;

// Initialize module object
window.admissionModule = {};

var ADMISSIONS_PATH = 'admissions';
var STUDENTS_PATH = 'students';
var COUNTERS_PATH = 'admissionCounters';
var ENROLLMENT_COUNTERS_PATH = 'enrollmentCounters';

var allAdmissions = [];
var currentEditId = null;
var currentMode = 'new'; // 'new' or 'edit'

// ---- Helper Functions ----
function generateToken() {
  return Math.random().toString(36).substring(2, 8) + '-' +
         Math.random().toString(36).substring(2, 8) + '-' +
         Date.now().toString(36);
}

function getCurrentSession() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  var startYear = month >= 4 ? year : year - 1;
  var endYear = startYear + 1;
  return startYear + '-' + String(endYear).slice(-2);
}

function getCurrentAcademicYear() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth() + 1;
  return month >= 4 ? year : year - 1;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatusBadge(status) {
  var map = {
    'Uploaded': '<span class="badge green">Uploaded</span>',
    'Offline Declaration': '<span class="badge amber">Offline Declaration</span>',
    'Pending': '<span class="badge slate">Pending</span>',
    'Submitted': '<span class="badge green">Submitted</span>',
    'Draft': '<span class="badge amber">Draft</span>'
  };
  return map[status] || '<span class="badge slate">' + status + '</span>';
}

// ---- ID Generation ----
function generateEnrollmentId(year, counter) {
  var yearSuffix = String(year).slice(-2);
  var padded = String(counter).padStart(5, '0');
  return yearSuffix + padded;
}

function generateRollNumber(classVal, sectionVal, counter) {
  var padded = String(counter).padStart(3, '0');
  var section = sectionVal && sectionVal !== 'NA' ? '-' + sectionVal : '';
  return classVal + section + '-' + padded;
}

function getCounterKey(classVal, sectionVal) {
  var section = sectionVal && sectionVal !== 'NA' ? '-' + sectionVal : '';
  return classVal + section;
}

function getNextCounter(path, defaultValue) {
  return db.ref(path).transaction(function(current) {
    return (current || 0) + 1;
  }).then(function(result) {
    if (result.committed) {
      return result.snapshot.val();
    }
    return defaultValue || 1;
  });
}

// ---- Cloudinary Upload ----
function uploadToCloudinary(file, progressCallback) {
  return new Promise(function(resolve, reject) {
    var cloudName = window.cloudinaryConfig.cloudName;
    var uploadPreset = window.cloudinaryConfig.uploadPreset;
    var folder = window.cloudinaryConfig.folder;

    var formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('public_id', 'student_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_'));

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + cloudName + '/image/upload', true);

    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable && progressCallback) {
        var progress = (e.loaded / e.total) * 100;
        progressCallback(progress);
      }
    };

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            format: response.format,
            bytes: response.bytes
          });
        } catch (e) {
          reject(new Error('Invalid response from Cloudinary'));
        }
      } else {
        reject(new Error('Upload failed: ' + xhr.status + ' ' + xhr.statusText));
      }
    };

    xhr.onerror = function() {
      reject(new Error('Network error uploading to Cloudinary'));
    };

    xhr.send(formData);
  });
}

// ============================================================
// RENDER: Admission List
// ============================================================
function render(container) {
  if (!container) return;
  if (!db) {
    container.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Database not available</div></div>';
    return;
  }

  var html = '' +
    '<div class="page-header">' +
      '<div><h1 class="page-title">Admission</h1><p class="page-subtitle">Manage student admissions</p></div>' +
      '<div class="page-actions"><a class="btn btn-primary" href="#/admission/new"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Admission</a></div>' +
    '</div>' +
    '<div class="filter-bar">' +
      '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search by name, enrollment ID..." id="admission-search" oninput="window.admissionModule.filterTable()"></div>' +
      '<select class="select" id="admission-status-filter" onchange="window.admissionModule.filterTable()"><option value="">All Statuses</option><option value="Draft">Draft</option><option value="Submitted">Submitted</option></select>' +
    '</div>' +
    '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Enrollment ID</th><th>Student</th><th>Class</th><th>Roll</th><th>Status</th><th>Actions</th></tr></thead><tbody id="admission-body"><tr><td colspan="6"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

  container.innerHTML = html;

  // Expose module functions
  window.admissionModule.render = render;
  window.admissionModule.renderForm = renderForm;
  window.admissionModule.filterTable = filterTable;
  window.admissionModule.viewAdmission = viewAdmission;
  window.admissionModule.deleteRecord = deleteRecord;
  window.admissionModule.downloadPDF = downloadPDF;

  loadAdmissions();
}

function loadAdmissions() {
  db.ref(ADMISSIONS_PATH).once('value').then(function(snapshot) {
    allAdmissions = [];
    snapshot.forEach(function(child) {
      var data = child.val();
      data.id = child.key;
      allAdmissions.push(data);
    });
    allAdmissions.sort(function(a, b) { return (b.submittedAt || 0) - (a.submittedAt || 0); });
    renderTableRows(allAdmissions);
  }).catch(function(error) {
    console.error('Error loading admissions:', error);
    var tbody = document.getElementById('admission-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading data</div></div></td></tr>';
    }
  });
}

function renderTableRows(admissions) {
  var tbody = document.getElementById('admission-body');
  if (!tbody) return;

  if (!admissions || admissions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No admissions found</div><div class="state-sub">Click "New Admission" to start.</div></div></td></tr>';
    return;
  }

  var rows = '';
  admissions.forEach(function(item) {
    var s = item.student || {};
    var name = s.name || 'N/A';
    var cls = s.class || 'N/A';
    var enrollmentId = item.enrollmentId || '—';
    var roll = item.rollNumber || '—';
    var statusBadge = item.status === 'Submitted' ? '<span class="badge green">Submitted</span>' : '<span class="badge amber">Draft</span>';

    rows += '' +
      '<tr>' +
        '<td><strong>' + enrollmentId + '</strong></td>' +
        '<td>' + name + '</td>' +
        '<td>' + cls + '</td>' +
        '<td>' + roll + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-btn-sm" onclick="window.admissionModule.viewAdmission(\'' + item.id + '\')" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
          (item.status !== 'Submitted' ? '<a class="icon-btn-sm" href="#/admission/edit/' + item.id + '" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></a>' : '') +
          '<button class="icon-btn-sm" onclick="window.admissionModule.downloadPDF(\'' + item.id + '\')" title="Download PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></button>' +
          '<button class="icon-btn-sm danger" onclick="window.admissionModule.deleteRecord(\'' + item.id + '\')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
        '</div></td>' +
      '</tr>';
  });
  tbody.innerHTML = rows;
}

function filterTable() {
  var search = document.getElementById('admission-search');
  var statusFilter = document.getElementById('admission-status-filter');
  var query = search ? search.value.toLowerCase() : '';
  var status = statusFilter ? statusFilter.value : '';

  var filtered = allAdmissions.filter(function(item) {
    var s = item.student || {};
    var name = (s.name || '').toLowerCase();
    var enrollmentId = (item.enrollmentId || '').toLowerCase();
    var matchQuery = name.includes(query) || enrollmentId.includes(query);
    var matchStatus = status === '' || item.status === status;
    return matchQuery && matchStatus;
  });
  renderTableRows(filtered);
}

// ============================================================
// VIEW ADMISSION
// ============================================================
function viewAdmission(id) {
  var item = allAdmissions.find(function(a) { return a.id === id; });
  if (!item) {
    window.showToast('Record not found.', 'error');
    return;
  }

  var s = item.student || {};
  var p = item.parent || {};
  var a = item.address || {};
  var prv = item.previous || {};
  var docs = item.documents || {};
  var photoStatus = docs.photo ? docs.photo.status : 'Pending';
  var photoUrl = docs.photo ? docs.photo.url : '';

  var bodyHtml = '' +
    '<div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
      '<div><strong>Enrollment ID:</strong> ' + (item.enrollmentId || '—') + ' &nbsp;|&nbsp; <strong>Roll #:</strong> ' + (item.rollNumber || '—') + '</div>' +
      '<div>Status: ' + getStatusBadge(item.status || 'Draft') + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0;align-items:center;">' +
      '<div style="flex-shrink:0;">' +
        (photoUrl ? '<img src="' + photoUrl + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" />' :
        '<div style="width:80px;height:80px;border-radius:50%;background:#f1f5f9;display:grid;place-items:center;color:#94a3b8;font-size:28px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="12" r="4"/></svg></div>') +
      '</div>' +
      '<div><strong>' + (s.name || 'N/A') + '</strong><br><span style="color:#64748b;font-size:13px;">' + (s.class || 'N/A') + (s.section ? ' - ' + s.section : '') + '</span></div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Student Information</h4>' +
        '<div class="detail-row"><span class="k">Name</span><span class="v">' + (s.name || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Date of Birth</span><span class="v">' + formatDate(s.dob) + '</span></div>' +
        '<div class="detail-row"><span class="k">Gender</span><span class="v">' + (s.gender || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Aadhaar</span><span class="v">' + (s.aadhaar || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Class</span><span class="v">' + (s.class || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Section</span><span class="v">' + (s.section || 'N/A') + '</span></div>' +
      '</div>' +
      '<div><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Parent / Guardian</h4>' +
        '<div class="detail-row"><span class="k">Father</span><span class="v">' + (p.fatherName || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Mother</span><span class="v">' + (p.motherName || 'N/A') + '</span></div>' +
        (p.guardianName ? '<div class="detail-row"><span class="k">Guardian</span><span class="v">' + p.guardianName + (p.guardianRelation ? ' (' + p.guardianRelation + ')' : '') + '</span></div>' : '') +
        '<div class="detail-row"><span class="k">Contact</span><span class="v">' + (p.contact || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Email</span><span class="v">' + (p.email || 'N/A') + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="two-col" style="margin-top:12px;">' +
      '<div><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Address</h4>' +
        '<div class="detail-row"><span class="k">Present</span><span class="v">' + (a.present || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Permanent</span><span class="v">' + (a.permanent || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Village/Town</span><span class="v">' + (a.village || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">District</span><span class="v">' + (a.district || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">State</span><span class="v">' + (a.state || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">PIN</span><span class="v">' + (a.pinCode || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Emergency</span><span class="v">' + (a.emergencyContact || 'N/A') + '</span></div>' +
      '</div>' +
      '<div><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Previous Academic</h4>' +
        '<div class="detail-row"><span class="k">Previous School</span><span class="v">' + (prv.school || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Previous Class</span><span class="v">' + (prv.class || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Board</span><span class="v">' + (prv.board || 'N/A') + '</span></div>' +
        '<div class="detail-row"><span class="k">Previous Roll #</span><span class="v">' + (prv.rollNumber || 'N/A') + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-top:16px;"><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Documents</h4>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;"><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Document</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Status</th></tr></thead><tbody>' +
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;">Passport Photo</td><td style="padding:8px;border:1px solid #e2e8f0;">' + getStatusBadge(photoStatus) + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;">Aadhaar Card</td><td style="padding:8px;border:1px solid #e2e8f0;">' + getStatusBadge(docs.aadhaar ? docs.aadhaar.status : 'Pending') + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;">Birth Certificate</td><td style="padding:8px;border:1px solid #e2e8f0;">' + getStatusBadge(docs.birthCertificate ? docs.birthCertificate.status : 'Pending') + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;">Transfer Certificate</td><td style="padding:8px;border:1px solid #e2e8f0;">' + getStatusBadge(docs.transferCertificate ? docs.transferCertificate.status : 'Pending') + '</td></tr>' +
      '<tr><td style="padding:8px;border:1px solid #e2e8f0;">Previous Marksheet</td><td style="padding:8px;border:1px solid #e2e8f0;">' + getStatusBadge(docs.marksheet ? docs.marksheet.status : 'Pending') + '</td></tr>' +
      '</tbody></table>' +
    '</div>';

  var footerHtml = '' +
    '<button class="btn btn-outline" onclick="window.closeModal()">Close</button>' +
    (item.status !== 'Submitted' ? '<a class="btn btn-primary" href="#/admission/edit/' + item.id + '">Edit Application</a>' : '') +
    '<button class="btn btn-primary" onclick="window.closeModal();window.admissionModule.downloadPDF(\'' + item.id + '\')">Download PDF</button>';

  window.openModal('Admission Details', bodyHtml, footerHtml, true);
}

// ---- Delete Record ----
function deleteRecord(id) {
  var item = allAdmissions.find(function(a) { return a.id === id; });
  if (!item) return;
  if (confirm('Are you sure you want to delete this admission record?')) {
    var studentId = item.studentId;
    var updates = {};
    updates[ADMISSIONS_PATH + '/' + id] = null;
    if (studentId) {
      updates[STUDENTS_PATH + '/' + studentId] = null;
    }
    db.ref().update(updates)
      .then(function() {
        window.showToast('Admission record deleted.', 'error');
        loadAdmissions();
      })
      .catch(function(error) {
        window.showToast('Error deleting: ' + error.message, 'error');
      });
  }
}

// ============================================================
// RENDER FORM – Full Page Multi-Step
// ============================================================
var formData = {};
var formStep = 1;

function renderForm(container, mode, id) {
  if (!container) return;
  if (!db) {
    container.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Database not available</div></div>';
    return;
  }

  currentMode = mode || 'new';
  currentEditId = id || null;

  // Load existing data if editing
  if (currentMode === 'edit' && currentEditId) {
    db.ref(ADMISSIONS_PATH + '/' + currentEditId).once('value').then(function(snapshot) {
      if (snapshot.exists()) {
        formData = snapshot.val();
        formData.id = currentEditId;
      } else {
        formData = {};
        window.showToast('Record not found, starting fresh.', 'info');
      }
      renderFormPage(container);
    }).catch(function() {
      formData = {};
      renderFormPage(container);
    });
  } else {
    formData = {};
    renderFormPage(container);
  }
}

function renderFormPage(container) {
  var html = '' +
    '<div class="page-header">' +
      '<div><h1 class="page-title">' + (currentMode === 'edit' ? 'Edit Admission' : 'New Admission') + '</h1><p class="page-subtitle">Multi-step admission workflow</p></div>' +
      '<div class="page-actions"><a class="btn btn-outline" href="#/admission"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to List</a></div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-body" id="admission-form-body">' +
        '<div id="form-step-content">' +
          renderStep(formStep) +
        '</div>' +
      '</div>' +
    '</div>';

  container.innerHTML = html;

  // Expose form navigation
  window.admissionModule.goToStep = goToStep;
  window.admissionModule.submitAdmission = submitAdmission;
  window.admissionModule.uploadPhoto = uploadPhoto;
  window.admissionModule.removePhoto = removePhoto;
  window.admissionModule.toggleOfflineDeclaration = toggleOfflineDeclaration;

  // Initial render
  renderStepContent();
}

function renderStep(step) {
  var totalSteps = 7;
  var stepTitles = [
    'Student Information',
    'Parent / Guardian',
    'Address & Contact',
    'Previous Academic',
    'Documents',
    'Review & Confirmation',
    'Submit'
  ];

  var html = '' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:24px;gap:4px;padding:0 4px;">';
  for (var i = 1; i <= totalSteps; i++) {
    var isActive = i === step;
    var isCompleted = i < step;
    var cls = 'step-indicator';
    if (isActive) cls += ' active';
    if (isCompleted) cls += ' completed';
    html += '<div class="' + cls + '" style="flex:1;text-align:center;padding:8px 4px;border-radius:5px;font-size:11px;font-weight:600;' +
      (isActive ? 'background:#dc3545;color:#fff;' :
       isCompleted ? 'background:#e6f4ea;color:#1e7e34;' :
       'background:#f1f5f9;color:#94a3b8;') + '">' + i + '</div>';
  }
  html += '</div>';

  html += '<h3 style="margin:0 0 4px;">' + stepTitles[step-1] + '</h3>';
  html += '<p style="margin:0 0 20px;color:#64748b;font-size:13px;">' + getStepDescription(step) + '</p>';
  html += '<div id="step-content-body"></div>';

  // Navigation buttons
  html += '<div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;flex-wrap:wrap;gap:8px;">';
  if (step > 1) {
    html += '<button class="btn btn-outline" onclick="window.admissionModule.goToStep(' + (step-1) + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="15 18 9 12 15 6"/></svg> Back</button>';
  } else {
    html += '<a class="btn btn-outline" href="#/admission">Cancel</a>';
  }
  if (step < totalSteps) {
    html += '<button class="btn btn-primary" onclick="window.admissionModule.goToStep(' + (step+1) + ')">Next <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="9 18 15 12 9 6"/></svg></button>';
  } else {
    html += '<button class="btn btn-primary" onclick="window.admissionModule.submitAdmission()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Submit Admission</button>';
  }
  html += '</div>';

  return html;
}

function getStepDescription(step) {
  var descs = [
    'Basic student details, class, and admission information',
    'Parent and guardian contact details',
    'Present and permanent address with emergency contact',
    'Previous school and academic history',
    'Upload documents or declare offline submission',
    'Verify all information before final submission',
    'Confirm and complete the admission'
  ];
  return descs[step-1] || '';
}

function renderStepContent() {
  var body = document.getElementById('step-content-body');
  if (!body) return;

  var step = formStep;
  var data = formData;

  switch(step) {
    case 1:
      body.innerHTML = renderStep1(data);
      break;
    case 2:
      body.innerHTML = renderStep2(data);
      break;
    case 3:
      body.innerHTML = renderStep3(data);
      break;
    case 4:
      body.innerHTML = renderStep4(data);
      break;
    case 5:
      body.innerHTML = renderStep5(data);
      break;
    case 6:
      body.innerHTML = renderStep6(data);
      break;
    case 7:
      body.innerHTML = renderStep7(data);
      break;
  }
}

// ---- Step Renderers ----
function renderStep1(data) {
  var s = data.student || {};
  return '' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Academic Session</label><input class="input" id="s1-session" value="' + getCurrentSession() + '" readonly style="background:#f1f5f9;" /></div>' +
      '<div class="form-row"><label>Admission Date <span class="req">*</span></label><input class="input" type="date" id="s1-admission-date" value="' + (s.admissionDate || new Date().toISOString().split('T')[0]) + '" /></div>' +
      '<div class="form-row"><label>Student Name <span class="req">*</span></label><input class="input" id="s1-name" value="' + (s.name || '') + '" placeholder="Enter full name" /></div>' +
      '<div class="form-row"><label>Date of Birth <span class="req">*</span></label><input class="input" type="date" id="s1-dob" value="' + (s.dob || '') + '" /></div>' +
      '<div class="form-row"><label>Gender <span class="req">*</span></label><select class="select" id="s1-gender"><option value="">Select</option><option value="Male"' + (s.gender === 'Male' ? ' selected' : '') + '>Male</option><option value="Female"' + (s.gender === 'Female' ? ' selected' : '') + '>Female</option><option value="Other"' + (s.gender === 'Other' ? ' selected' : '') + '>Other</option></select></div>' +
      '<div class="form-row"><label>Aadhaar Number</label><input class="input" id="s1-aadhaar" value="' + (s.aadhaar || '') + '" placeholder="XXXX-XXXX-XXXX" /></div>' +
      '<div class="form-row"><label>Class <span class="req">*</span></label><select class="select" id="s1-class"><option value="">Select</option><option value="Nursery"' + (s.class === 'Nursery' ? ' selected' : '') + '>Nursery</option><option value="KG1"' + (s.class === 'KG1' ? ' selected' : '') + '>KG1</option><option value="KG2"' + (s.class === 'KG2' ? ' selected' : '') + '>KG2</option><option value="1"' + (s.class === '1' ? ' selected' : '') + '>Class 1</option><option value="2"' + (s.class === '2' ? ' selected' : '') + '>Class 2</option><option value="3"' + (s.class === '3' ? ' selected' : '') + '>Class 3</option><option value="4"' + (s.class === '4' ? ' selected' : '') + '>Class 4</option><option value="5"' + (s.class === '5' ? ' selected' : '') + '>Class 5</option><option value="6"' + (s.class === '6' ? ' selected' : '') + '>Class 6</option><option value="7"' + (s.class === '7' ? ' selected' : '') + '>Class 7</option><option value="8"' + (s.class === '8' ? ' selected' : '') + '>Class 8</option><option value="9"' + (s.class === '9' ? ' selected' : '') + '>Class 9</option><option value="10"' + (s.class === '10' ? ' selected' : '') + '>Class 10</option></select></div>' +
      '<div class="form-row"><label>Section</label><select class="select" id="s1-section"><option value="NA"' + (!s.section || s.section === 'NA' ? ' selected' : '') + '>NA</option><option value="A"' + (s.section === 'A' ? ' selected' : '') + '>A</option><option value="B"' + (s.section === 'B' ? ' selected' : '') + '>B</option><option value="C"' + (s.section === 'C' ? ' selected' : '') + '>C</option></select></div>' +
    '</div>';
}

function renderStep2(data) {
  var p = data.parent || {};
  return '' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Father\'s Name <span class="req">*</span></label><input class="input" id="s2-father" value="' + (p.fatherName || '') + '" placeholder="Enter father\'s name" /></div>' +
      '<div class="form-row"><label>Mother\'s Name <span class="req">*</span></label><input class="input" id="s2-mother" value="' + (p.motherName || '') + '" placeholder="Enter mother\'s name" /></div>' +
      '<div class="form-row"><label>Guardian Name</label><input class="input" id="s2-guardian-name" value="' + (p.guardianName || '') + '" placeholder="If applicable" /></div>' +
      '<div class="form-row"><label>Guardian Relation</label><input class="input" id="s2-guardian-relation" value="' + (p.guardianRelation || '') + '" placeholder="e.g. Uncle, Grandparent" /></div>' +
      '<div class="form-row"><label>Contact Number <span class="req">*</span></label><input class="input" id="s2-contact" value="' + (p.contact || '') + '" placeholder="10-digit mobile number" /></div>' +
      '<div class="form-row"><label>Email Address</label><input class="input" type="email" id="s2-email" value="' + (p.email || '') + '" placeholder="email@example.com" /></div>' +
    '</div>';
}

function renderStep3(data) {
  var a = data.address || {};
  return '' +
    '<div class="form-grid">' +
      '<div class="form-row" style="grid-column:1/-1;"><label>Present Address <span class="req">*</span></label><textarea class="textarea" id="s3-present" rows="2">' + (a.present || '') + '</textarea></div>' +
      '<div class="form-row" style="grid-column:1/-1;"><label>Permanent Address</label><textarea class="textarea" id="s3-permanent" rows="2">' + (a.permanent || '') + '</textarea></div>' +
      '<div class="form-row"><label>Village / Town <span class="req">*</span></label><input class="input" id="s3-village" value="' + (a.village || '') + '" placeholder="Village or town name" /></div>' +
      '<div class="form-row"><label>District <span class="req">*</span></label><input class="input" id="s3-district" value="' + (a.district || '') + '" placeholder="District name" /></div>' +
      '<div class="form-row"><label>State <span class="req">*</span></label><input class="input" id="s3-state" value="' + (a.state || '') + '" placeholder="State name" /></div>' +
      '<div class="form-row"><label>PIN Code <span class="req">*</span></label><input class="input" id="s3-pin" value="' + (a.pinCode || '') + '" placeholder="6-digit PIN" /></div>' +
      '<div class="form-row"><label>Emergency Contact <span class="req">*</span></label><input class="input" id="s3-emergency" value="' + (a.emergencyContact || '') + '" placeholder="10-digit number" /></div>' +
    '</div>';
}

function renderStep4(data) {
  var p = data.previous || {};
  return '' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Previous School</label><input class="input" id="s4-school" value="' + (p.school || '') + '" placeholder="School name" /></div>' +
      '<div class="form-row"><label>Previous Class</label><input class="input" id="s4-class" value="' + (p.class || '') + '" placeholder="e.g. 9" /></div>' +
      '<div class="form-row"><label>Board</label><input class="input" id="s4-board" value="' + (p.board || '') + '" placeholder="e.g. CBSE, ICSE" /></div>' +
      '<div class="form-row"><label>Previous Roll Number</label><input class="input" id="s4-roll" value="' + (p.rollNumber || '') + '" placeholder="Previous roll number" /></div>' +
    '</div>';
}

function renderStep5(data) {
  var docs = data.documents || {};
  var photo = docs.photo || {};
  var aadhaar = docs.aadhaar || {};
  var birthCert = docs.birthCertificate || {};
  var transferCert = docs.transferCertificate || {};
  var marksheet = docs.marksheet || {};

  var photoStatus = photo.status || 'Pending';
  var photoUrl = photo.url || '';
  var aadhaarStatus = aadhaar.status || 'Pending';
  var aadhaarDeclared = aadhaar.declared || false;
  var birthCertStatus = birthCert.status || 'Pending';
  var birthCertDeclared = birthCert.declared || false;
  var transferCertStatus = transferCert.status || 'Pending';
  var transferCertDeclared = transferCert.declared || false;
  var marksheetStatus = marksheet.status || 'Pending';
  var marksheetDeclared = marksheet.declared || false;

  var offlineDeclared = docs.offlineDeclared || false;

  return '' +
    '<div style="margin-bottom:16px;padding:12px;background:#fef3cd;border-radius:5px;border:1px solid #f6c23e;font-size:13px;color:#856404;">' +
      '<strong>Note:</strong> Passport photo is mandatory. Other documents can be submitted offline by selecting the declaration below.' +
    '</div>' +

    '<h4 style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1e293b;">1. Passport / Applicant Photo <span style="color:#dc3545;">*</span></h4>' +
    '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:16px;padding:12px;border:1px solid #e2e8f0;border-radius:5px;background:#fafbfe;">' +
      '<div style="flex-shrink:0;">' +
        (photoUrl ? '<img src="' + photoUrl + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" />' :
        '<div style="width:80px;height:80px;border-radius:50%;background:#f1f5f9;display:grid;place-items:center;color:#94a3b8;font-size:28px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="12" r="4"/></svg></div>') +
      '</div>' +
      '<div style="flex:1;">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="btn btn-sm btn-outline" onclick="window.admissionModule.uploadPhoto()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Photo</button>' +
          (photoUrl ? '<button class="btn btn-sm btn-danger" onclick="window.admissionModule.removePhoto()">Remove</button>' : '') +
        '</div>' +
        '<div style="font-size:12px;color:#64748b;margin-top:4px;">Max size: 500 KB • JPG, PNG only • ' + (photoStatus === 'Uploaded' ? 'Status: <span class="badge green">Uploaded</span>' : 'Status: <span class="badge amber">' + photoStatus + '</span>') + '</div>' +
        '<div id="photo-upload-status" style="font-size:12px;color:#dc3545;margin-top:4px;"></div>' +
      '</div>' +
    '</div>' +

    '<h4 style="margin:20px 0 12px;font-size:13px;font-weight:600;color:#1e293b;">2. Other Documents</h4>' +
    '<div style="display:grid;gap:10px;grid-template-columns:1fr 1fr;margin-bottom:16px;">' +
      '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:5px;"><div style="font-weight:500;">Aadhaar Card</div><div>' + getStatusBadge(aadhaarStatus) + (aadhaarDeclared ? ' (Offline)' : '') + '</div></div>' +
      '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:5px;"><div style="font-weight:500;">Birth Certificate</div><div>' + getStatusBadge(birthCertStatus) + (birthCertDeclared ? ' (Offline)' : '') + '</div></div>' +
      '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:5px;"><div style="font-weight:500;">Transfer Certificate</div><div>' + getStatusBadge(transferCertStatus) + (transferCertDeclared ? ' (Offline)' : '') + '</div></div>' +
      '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:5px;"><div style="font-weight:500;">Previous Marksheet</div><div>' + getStatusBadge(marksheetStatus) + (marksheetDeclared ? ' (Offline)' : '') + '</div></div>' +
    '</div>' +

    '<div style="display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;">' +
      '<input type="checkbox" id="s5-offline-declaration" style="margin-top:2px;width:18px;height:18px;" ' + (offlineDeclared ? 'checked' : '') + ' onchange="window.admissionModule.toggleOfflineDeclaration(this.checked)">' +
      '<label for="s5-offline-declaration" style="font-size:13px;cursor:pointer;">In case of offline submission, I declare and skip the online document upload for the above documents. (Photo is still mandatory online.)</label>' +
    '</div>';
}

function renderStep6(data) {
  var s = data.student || {};
  var p = data.parent || {};
  var a = data.address || {};
  var prv = data.previous || {};
  var docs = data.documents || {};

  var photoStatus = docs.photo ? docs.photo.status : 'Pending';
  var photoUrl = docs.photo ? docs.photo.url : '';

  var reviewSections = [
    { title: 'Student Information', fields: [
      ['Name', s.name || '—'],
      ['Date of Birth', formatDate(s.dob)],
      ['Gender', s.gender || '—'],
      ['Aadhaar', s.aadhaar || '—'],
      ['Class', s.class || '—'],
      ['Section', s.section || '—']
    ]},
    { title: 'Parent / Guardian', fields: [
      ['Father\'s Name', p.fatherName || '—'],
      ['Mother\'s Name', p.motherName || '—'],
      ['Guardian', (p.guardianName || '—') + (p.guardianRelation ? ' (' + p.guardianRelation + ')' : '')],
      ['Contact', p.contact || '—'],
      ['Email', p.email || '—']
    ]},
    { title: 'Address & Contact', fields: [
      ['Present Address', a.present || '—'],
      ['Permanent Address', a.permanent || '—'],
      ['Village/Town', a.village || '—'],
      ['District', a.district || '—'],
      ['State', a.state || '—'],
      ['PIN Code', a.pinCode || '—'],
      ['Emergency Contact', a.emergencyContact || '—']
    ]},
    { title: 'Previous Academic', fields: [
      ['Previous School', prv.school || '—'],
      ['Previous Class', prv.class || '—'],
      ['Board', prv.board || '—'],
      ['Previous Roll #', prv.rollNumber || '—']
    ]},
    { title: 'Documents', fields: [
      ['Passport Photo', photoStatus + (photoUrl ? ' (Uploaded)' : '')],
      ['Aadhaar Card', (docs.aadhaar ? docs.aadhaar.status : 'Pending') + (docs.aadhaar && docs.aadhaar.declared ? ' (Offline)' : '')],
      ['Birth Certificate', (docs.birthCertificate ? docs.birthCertificate.status : 'Pending') + (docs.birthCertificate && docs.birthCertificate.declared ? ' (Offline)' : '')],
      ['Transfer Certificate', (docs.transferCertificate ? docs.transferCertificate.status : 'Pending') + (docs.transferCertificate && docs.transferCertificate.declared ? ' (Offline)' : '')],
      ['Previous Marksheet', (docs.marksheet ? docs.marksheet.status : 'Pending') + (docs.marksheet && docs.marksheet.declared ? ' (Offline)' : '')]
    ]}
  ];

  var html = '' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0;">' +
      '<div><strong>Academic Session:</strong> ' + getCurrentSession() + '</div>' +
      '<div><strong>Admission Date:</strong> ' + formatDate(s.admissionDate) + '</div>' +
    '</div>';

  reviewSections.forEach(function(section) {
    html += '<div style="margin-bottom:16px;">';
    html += '<h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">' + section.title + '</h4>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:13px;">';
    section.fields.forEach(function(field) {
      html += '<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;min-width:120px;">' + field[0] + ':</span><span style="font-weight:500;">' + field[1] + '</span></div>';
    });
    html += '</div>';
    html += '</div>';
  });

  if (photoUrl) {
    html += '<div style="margin-top:8px;"><img src="' + photoUrl + '" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" /></div>';
  }

  return html;
}

function renderStep7(data) {
  var s = data.student || {};
  var p = data.parent || {};
  var a = data.address || {};
  var docs = data.documents || {};

  var photoStatus = docs.photo ? docs.photo.status : 'Pending';

  var missingFields = [];
  if (!s.name) missingFields.push('Student Name');
  if (!s.dob) missingFields.push('Date of Birth');
  if (!s.gender) missingFields.push('Gender');
  if (!s.class) missingFields.push('Class');
  if (!p.fatherName) missingFields.push('Father\'s Name');
  if (!p.motherName) missingFields.push('Mother\'s Name');
  if (!p.contact) missingFields.push('Contact Number');
  if (!a.present) missingFields.push('Present Address');
  if (!a.village) missingFields.push('Village/Town');
  if (!a.district) missingFields.push('District');
  if (!a.state) missingFields.push('State');
  if (!a.pinCode) missingFields.push('PIN Code');
  if (!a.emergencyContact) missingFields.push('Emergency Contact');
  if (photoStatus !== 'Uploaded') missingFields.push('Passport Photo (must be uploaded)');

  var hasMissing = missingFields.length > 0;

  var html = '' +
    '<div style="text-align:center;margin-bottom:20px;">' +
      '<div style="font-size:48px;color:#dc3545;margin-bottom:12px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
      '<h2 style="margin:0 0 4px;">Ready to Submit</h2>' +
      '<p style="margin:0;color:#64748b;">Please verify all information before final submission.</p>' +
    '</div>';

  if (hasMissing) {
    html += '<div style="padding:12px;background:#fde8ea;border-radius:5px;border:1px solid #fecaca;color:#b02a37;margin-bottom:16px;">';
    html += '<strong>Missing required fields:</strong><ul style="margin:8px 0 0 20px;">';
    missingFields.forEach(function(field) {
      html += '<li>' + field + '</li>';
    });
    html += '</ul></div>';
  } else {
    html += '<div style="padding:12px;background:#e6f4ea;border-radius:5px;border:1px solid #b7e4c7;color:#1e7e34;margin-bottom:16px;">';
    html += '<strong>All required fields are completed.</strong> Click "Submit Admission" to finalize.';
    html += '</div>';
  }

  html += '<div style="background:#f8fafc;padding:12px;border-radius:5px;border:1px solid #e2e8f0;font-size:13px;">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;">';
  html += '<div><strong>Student:</strong> ' + (s.name || '—') + '</div>';
  html += '<div><strong>Class:</strong> ' + (s.class || '—') + '</div>';
  html += '<div><strong>Father:</strong> ' + (p.fatherName || '—') + '</div>';
  html += '<div><strong>Mother:</strong> ' + (p.motherName || '—') + '</div>';
  html += '<div><strong>Contact:</strong> ' + (p.contact || '—') + '</div>';
  html += '<div><strong>Photo:</strong> ' + photoStatus + '</div>';
  html += '</div></div>';

  return html;
}

// ---- Navigation ----
function goToStep(step) {
  // Save current step data before moving
  collectStepData();

  // Validate before moving forward
  if (step > formStep) {
    var validation = validateStep(formStep, formData);
    if (!validation.valid) {
      showValidationError(validation.message);
      return;
    }
  }

  formStep = step;
  renderStepContent();
  // Update the step indicator and title
  var formBody = document.getElementById('admission-form-body');
  if (formBody) {
    var container = formBody.parentElement;
    if (container) {
      // Re-render the entire step container
      var stepContainer = document.getElementById('form-step-content');
      if (stepContainer) {
        stepContainer.innerHTML = renderStep(formStep);
        // Re-bind content
        renderStepContent();
      }
    }
  }
}

function collectStepData() {
  var data = JSON.parse(JSON.stringify(formData || {}));

  // Step 1
  var s1Name = document.getElementById('s1-name');
  var s1Dob = document.getElementById('s1-dob');
  var s1Gender = document.getElementById('s1-gender');
  var s1Aadhaar = document.getElementById('s1-aadhaar');
  var s1Class = document.getElementById('s1-class');
  var s1Section = document.getElementById('s1-section');
  var s1AdmissionDate = document.getElementById('s1-admission-date');

  if (s1Name) {
    data.student = data.student || {};
    data.student.name = s1Name.value.trim();
    data.student.dob = s1Dob ? s1Dob.value : '';
    data.student.gender = s1Gender ? s1Gender.value : '';
    data.student.aadhaar = s1Aadhaar ? s1Aadhaar.value.trim() : '';
    data.student.class = s1Class ? s1Class.value : '';
    data.student.section = s1Section ? s1Section.value : '';
    data.student.admissionDate = s1AdmissionDate ? s1AdmissionDate.value : '';
  }

  // Step 2
  var s2Father = document.getElementById('s2-father');
  var s2Mother = document.getElementById('s2-mother');
  var s2GuardianName = document.getElementById('s2-guardian-name');
  var s2GuardianRelation = document.getElementById('s2-guardian-relation');
  var s2Contact = document.getElementById('s2-contact');
  var s2Email = document.getElementById('s2-email');

  if (s2Father) {
    data.parent = data.parent || {};
    data.parent.fatherName = s2Father.value.trim();
    data.parent.motherName = s2Mother ? s2Mother.value.trim() : '';
    data.parent.guardianName = s2GuardianName ? s2GuardianName.value.trim() : '';
    data.parent.guardianRelation = s2GuardianRelation ? s2GuardianRelation.value.trim() : '';
    data.parent.contact = s2Contact ? s2Contact.value.trim() : '';
    data.parent.email = s2Email ? s2Email.value.trim() : '';
  }

  // Step 3
  var s3Present = document.getElementById('s3-present');
  var s3Permanent = document.getElementById('s3-permanent');
  var s3Village = document.getElementById('s3-village');
  var s3District = document.getElementById('s3-district');
  var s3State = document.getElementById('s3-state');
  var s3Pin = document.getElementById('s3-pin');
  var s3Emergency = document.getElementById('s3-emergency');

  if (s3Present) {
    data.address = data.address || {};
    data.address.present = s3Present.value.trim();
    data.address.permanent = s3Permanent ? s3Permanent.value.trim() : '';
    data.address.village = s3Village ? s3Village.value.trim() : '';
    data.address.district = s3District ? s3District.value.trim() : '';
    data.address.state = s3State ? s3State.value.trim() : '';
    data.address.pinCode = s3Pin ? s3Pin.value.trim() : '';
    data.address.emergencyContact = s3Emergency ? s3Emergency.value.trim() : '';
  }

  // Step 4
  var s4School = document.getElementById('s4-school');
  var s4Class = document.getElementById('s4-class');
  var s4Board = document.getElementById('s4-board');
  var s4Roll = document.getElementById('s4-roll');

  if (s4School) {
    data.previous = data.previous || {};
    data.previous.school = s4School.value.trim();
    data.previous.class = s4Class ? s4Class.value.trim() : '';
    data.previous.board = s4Board ? s4Board.value.trim() : '';
    data.previous.rollNumber = s4Roll ? s4Roll.value.trim() : '';
  }

  formData = data;
}

function validateStep(step, data) {
  var s = data.student || {};
  var p = data.parent || {};
  var a = data.address || {};
  var docs = data.documents || {};
  var photoStatus = docs.photo ? docs.photo.status : 'Pending';

  switch(step) {
    case 1:
      if (!s.name) return { valid: false, message: 'Student Name is required.' };
      if (!s.dob) return { valid: false, message: 'Date of Birth is required.' };
      if (!s.gender) return { valid: false, message: 'Gender is required.' };
      if (!s.class) return { valid: false, message: 'Class is required.' };
      return { valid: true };
    case 2:
      if (!p.fatherName) return { valid: false, message: 'Father\'s Name is required.' };
      if (!p.motherName) return { valid: false, message: 'Mother\'s Name is required.' };
      if (!p.contact || p.contact.length < 10) return { valid: false, message: 'Valid 10-digit contact number is required.' };
      return { valid: true };
    case 3:
      if (!a.present) return { valid: false, message: 'Present Address is required.' };
      if (!a.village) return { valid: false, message: 'Village/Town is required.' };
      if (!a.district) return { valid: false, message: 'District is required.' };
      if (!a.state) return { valid: false, message: 'State is required.' };
      if (!a.pinCode || a.pinCode.length < 6) return { valid: false, message: 'Valid 6-digit PIN Code is required.' };
      if (!a.emergencyContact || a.emergencyContact.length < 10) return { valid: false, message: 'Valid 10-digit Emergency Contact is required.' };
      return { valid: true };
    case 5:
      if (photoStatus !== 'Uploaded') {
        return { valid: false, message: 'Passport photo is mandatory. Please upload a photo.' };
      }
      return { valid: true };
    case 6:
      var v1 = validateStep(1, data);
      if (!v1.valid) return v1;
      var v2 = validateStep(2, data);
      if (!v2.valid) return v2;
      var v3 = validateStep(3, data);
      if (!v3.valid) return v3;
      var v5 = validateStep(5, data);
      if (!v5.valid) return v5;
      return { valid: true };
    default:
      return { valid: true };
  }
}

function showValidationError(message) {
  var body = document.getElementById('admission-form-body');
  if (body) {
    var existing = document.getElementById('validation-error');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.id = 'validation-error';
    div.style.cssText = 'padding:12px;background:#fde8ea;border-radius:5px;border:1px solid #fecaca;color:#b02a37;margin-bottom:16px;text-align:center;';
    div.innerHTML = '<strong>' + message + '</strong>';
    body.prepend(div);

    setTimeout(function() {
      if (div.parentNode) div.remove();
    }, 4000);
  } else {
    window.showToast(message, 'error');
  }
}

// ---- Document Upload Functions ----
function uploadPhoto() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      window.showToast('File size exceeds 500 KB limit.', 'error');
      return;
    }

    var statusEl = document.getElementById('photo-upload-status');
    if (statusEl) {
      statusEl.innerHTML = 'Uploading to Cloudinary... <span class="spinner" style="display:inline-block;width:14px;height:14px;border-width:2px;margin-left:8px;"></span>';
      statusEl.style.color = '#1e293b';
    }

    uploadToCloudinary(file, function(progress) {
      if (statusEl) {
        statusEl.innerHTML = 'Uploading... ' + Math.round(progress) + '%';
      }
    })
    .then(function(result) {
      formData.documents = formData.documents || {};
      formData.documents.photo = {
        status: 'Uploaded',
        url: result.url,
        publicId: result.publicId,
        fileName: file.name,
        fileSize: file.size
      };

      // Update UI preview
      var preview = document.querySelector('#admission-form-body img');
      if (preview) {
        preview.src = result.url;
        preview.style.display = 'block';
      } else {
        var container = document.querySelector('#admission-form-body .photo-upload-preview');
        if (container) {
          container.innerHTML = '<img src="' + result.url + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" />';
        }
      }

      if (statusEl) {
        statusEl.innerHTML = '✓ Uploaded successfully to Cloudinary';
        statusEl.style.color = '#1e7e34';
      }

      window.showToast('Photo uploaded successfully.', 'success');
    })
    .catch(function(error) {
      console.error('Upload error:', error);
      if (statusEl) {
        statusEl.innerHTML = 'Upload failed: ' + error.message;
        statusEl.style.color = '#dc3545';
      }
      window.showToast('Upload failed: ' + error.message, 'error');
    });
  };
  input.click();
}

function removePhoto() {
  if (confirm('Remove the uploaded photo?')) {
    formData.documents = formData.documents || {};
    formData.documents.photo = { status: 'Pending' };

    var img = document.querySelector('#admission-form-body img');
    if (img) {
      img.src = '';
      img.style.display = 'none';
    }

    var statusEl = document.getElementById('photo-upload-status');
    if (statusEl) {
      statusEl.innerHTML = 'Photo removed. Please upload a new one.';
      statusEl.style.color = '#dc3545';
    }

    window.showToast('Photo removed.', 'info');
  }
}

function toggleOfflineDeclaration(checked) {
  formData.documents = formData.documents || {};
  formData.documents.offlineDeclared = checked;

  if (checked) {
    var docTypes = ['aadhaar', 'birthCertificate', 'transferCertificate', 'marksheet'];
    docTypes.forEach(function(type) {
      if (!formData.documents[type]) {
        formData.documents[type] = {};
      }
      formData.documents[type].status = 'Offline Declaration';
      formData.documents[type].declared = true;
    });
    window.showToast('Offline declaration enabled for documents.', 'info');
    // Re-render step 5
    renderStepContent();
  } else {
    var docTypes = ['aadhaar', 'birthCertificate', 'transferCertificate', 'marksheet'];
    docTypes.forEach(function(type) {
      if (formData.documents[type] && formData.documents[type].declared) {
        formData.documents[type].status = 'Pending';
        formData.documents[type].declared = false;
      }
    });
    window.showToast('Offline declaration disabled.', 'info');
    renderStepContent();
  }
}

// ---- Submit Admission ----
function submitAdmission() {
  collectStepData();

  var v1 = validateStep(1, formData);
  if (!v1.valid) { showValidationError(v1.message); return; }
  var v2 = validateStep(2, formData);
  if (!v2.valid) { showValidationError(v2.message); return; }
  var v3 = validateStep(3, formData);
  if (!v3.valid) { showValidationError(v3.message); return; }
  var v5 = validateStep(5, formData);
  if (!v5.valid) { showValidationError(v5.message); return; }

  var docs = formData.documents || {};
  var photoStatus = docs.photo ? docs.photo.status : 'Pending';
  if (photoStatus !== 'Uploaded') {
    showValidationError('Passport photo must be uploaded before submission.');
    return;
  }

  var now = Date.now();
  var s = formData.student || {};

  // If editing, update existing
  if (currentMode === 'edit' && currentEditId) {
    var updateData = {
      student: formData.student || {},
      parent: formData.parent || {},
      address: formData.address || {},
      previous: formData.previous || {},
      documents: formData.documents || {},
      status: 'Submitted',
      submittedAt: now,
      updatedAt: now,
      academicSession: getCurrentSession()
    };

    db.ref(ADMISSIONS_PATH + '/' + currentEditId).update(updateData)
      .then(function() {
        // Update students node
        var item = allAdmissions.find(function(a) { return a.id === currentEditId; });
        if (item && item.studentId) {
          var studentData = {
            name: s.name,
            class: s.class,
            section: s.section,
            updatedAt: now
          };
          db.ref(STUDENTS_PATH + '/' + item.studentId).update(studentData);
        }
        window.location.hash = 'admission';
        window.showToast('Admission updated successfully.', 'success');
        loadAdmissions();
      })
      .catch(function(error) {
        window.showToast('Error submitting: ' + error.message, 'error');
      });
    return;
  }

  // ---- New Admission ----
  var year = getCurrentAcademicYear();

  // 1. Get Enrollment ID counter for this year
  db.ref(ENROLLMENT_COUNTERS_PATH + '/' + year).transaction(function(current) {
    return (current || 0) + 1;
  }).then(function(result) {
    if (!result.committed) {
      window.showToast('Error generating Enrollment ID. Please try again.', 'error');
      return;
    }
    var counter = result.snapshot.val();
    var enrollmentId = generateEnrollmentId(year, counter);

    // 2. Get Roll Number counter for class-section
    var classVal = s.class || 'NA';
    var sectionVal = s.section || 'NA';
    var rollCounterKey = 'rollCounters/' + year + '/' + getCounterKey(classVal, sectionVal);

    db.ref(COUNTERS_PATH + '/' + rollCounterKey).transaction(function(current) {
      return (current || 0) + 1;
    }).then(function(rollResult) {
      if (!rollResult.committed) {
        window.showToast('Error generating Roll Number. Please try again.', 'error');
        return;
      }
      var rollCounter = rollResult.snapshot.val();
      var rollNumber = generateRollNumber(classVal, sectionVal, rollCounter);

      // 3. Create records
      var admissionId = db.ref(ADMISSIONS_PATH).push().key;
      var studentId = db.ref(STUDENTS_PATH).push().key;

      var finalData = {
        student: formData.student || {},
        parent: formData.parent || {},
        address: formData.address || {},
        previous: formData.previous || {},
        documents: formData.documents || {},
        enrollmentId: enrollmentId,
        rollNumber: rollNumber,
        studentId: studentId,
        status: 'Submitted',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
        academicSession: getCurrentSession()
      };

      var studentRecord = {
        studentId: studentId,
        admissionId: admissionId,
        enrollmentId: enrollmentId,
        name: s.name,
        class: s.class,
        section: s.section,
        rollNumber: rollNumber,
        status: 'Active',
        createdAt: now,
        updatedAt: now
      };

      var updates = {};
      updates[ADMISSIONS_PATH + '/' + admissionId] = finalData;
      updates[STUDENTS_PATH + '/' + studentId] = studentRecord;

      db.ref().update(updates)
        .then(function() {
          window.location.hash = 'admission';
          window.showToast('Admission completed successfully! Enrollment ID: ' + enrollmentId, 'success');
          loadAdmissions();
        })
        .catch(function(error) {
          window.showToast('Error saving admission: ' + error.message, 'error');
        });
    });
  });
}

// ---- PDF Download ----
function downloadPDF(id) {
  var item = allAdmissions.find(function(a) { return a.id === id; });
  if (!item) {
    window.showToast('Record not found.', 'error');
    return;
  }

  var s = item.student || {};
  var p = item.parent || {};
  var a = item.address || {};
  var prv = item.previous || {};
  var docs = item.documents || {};
  var photoUrl = docs.photo ? docs.photo.url : '';

  var receiptDiv = document.createElement('div');
  receiptDiv.className = 'receipt print-area';
  receiptDiv.style.cssText = 'padding:40px;max-width:780px;margin:0 auto;background:#fff;font-family:Inter,sans-serif;';

  receiptDiv.innerHTML = '' +
    '<div class="receipt-head">' +
      '<div class="receipt-brand">' +
        '<div class="logo" style="width:52px;height:52px;background:#dc3545;color:#fff;border-radius:5px;display:grid;place-items:center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>' +
        '<div><div class="school-name" style="font-size:20px;font-weight:800;">Janaki Professional Academy</div><div class="school-meta" style="font-size:12px;color:#64748b;">ERP · Admission Receipt</div></div>' +
      '</div>' +
      '<div class="receipt-tag"><h3 style="margin:0;font-size:15px;text-transform:uppercase;letter-spacing:0.08em;color:#dc3545;">Admission Confirmed</h3><div class="r-num" style="font-size:12.5px;color:#64748b;">Enrollment: ' + (item.enrollmentId || 'N/A') + '</div></div>' +
    '</div>' +
    '<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0;">' +
      (photoUrl ? '<img src="' + photoUrl + '" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" />' : '') +
      '<div><strong>' + s.name + '</strong><br><span style="color:#64748b;font-size:13px;">' + (s.class || 'N/A') + (s.section ? ' - ' + s.section : '') + '</span></div>' +
    '</div>' +
    '<div class="receipt-section"><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Admission Details</h4>' +
      '<div class="receipt-info-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px;font-size:13px;">' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Enrollment ID</span><span class="v" style="font-weight:600;">' + (item.enrollmentId || '—') + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Roll Number</span><span class="v" style="font-weight:600;">' + (item.rollNumber || '—') + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Academic Session</span><span class="v" style="font-weight:600;">' + (item.academicSession || 'N/A') + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Date</span><span class="v" style="font-weight:600;">' + formatDate(s.admissionDate) + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="receipt-section"><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Student Information</h4>' +
      '<div class="receipt-info-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px;font-size:13px;">' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Name</span><span class="v" style="font-weight:600;">' + s.name + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Date of Birth</span><span class="v" style="font-weight:600;">' + formatDate(s.dob) + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Gender</span><span class="v" style="font-weight:600;">' + (s.gender || 'N/A') + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Aadhaar</span><span class="v" style="font-weight:600;">' + (s.aadhaar || 'N/A') + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Class</span><span class="v" style="font-weight:600;">' + (s.class || 'N/A') + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Section</span><span class="v" style="font-weight:600;">' + (s.section || 'N/A') + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="receipt-section"><h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Parent / Guardian</h4>' +
      '<div class="receipt-info-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px;font-size:13px;">' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Father</span><span class="v" style="font-weight:600;">' + (p.fatherName || 'N/A') + '</span></div>' +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Mother</span><span class="v" style="font-weight:600;">' + (p.motherName || 'N/A') + '</span></div>' +
        (p.guardianName ? '<div><span class="k" style="color:#64748b;min-width:120px;">Guardian</span><span class="v" style="font-weight:600;">' + p.guardianName + (p.guardianRelation ? ' (' + p.guardianRelation + ')' : '') + '</span></div>' : '') +
        '<div><span class="k" style="color:#64748b;min-width:120px;">Contact</span><span class="v" style="font-weight:600;">' + (p.contact || 'N/A') + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div style="margin:20px 0;text-align:center;">' +
      '<div id="qr-code-container-pdf" style="display:inline-block;padding:10px;border:1px solid #e2e8f0;border-radius:5px;"></div>' +
      '<div style="font-size:11px;color:#94a3b8;margin-top:6px;">Scan to verify authenticity</div>' +
    '</div>' +
    '<div class="receipt-foot" style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#64748b;">' +
      '<div class="note">This is a system-generated receipt. The QR code contains a unique verification token.</div>' +
      '<div class="sign"><div class="line" style="width:180px;border-top:1.5px solid #1e293b;margin-bottom:6px;"></div>Authorized Signatory</div>' +
    '</div>';

  document.body.appendChild(receiptDiv);

  var token = item.token || generateToken();
  var qrContainer = document.getElementById('qr-code-container-pdf');
  var verifyUrl = window.location.origin + '/verify.html?token=' + token;

  if (typeof QRCode !== 'undefined') {
    new QRCode(qrContainer, {
      text: verifyUrl,
      width: 120,
      height: 120,
      colorDark: '#1e293b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    qrContainer.textContent = 'QR Code not available';
  }

  html2canvas(receiptDiv, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  }).then(function(canvas) {
    var imgData = canvas.toDataURL('image/png');
    var pdf = new jspdf.jsPDF('p', 'mm', 'a4');
    var pdfWidth = pdf.internal.pageSize.getWidth();
    var pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('Admission_' + (s.name || 'student') + '_' + (item.enrollmentId || '') + '.pdf');
    document.body.removeChild(receiptDiv);
  }).catch(function(error) {
    console.error('PDF generation error:', error);
    window.showToast('Error generating PDF. Please try again.', 'error');
    document.body.removeChild(receiptDiv);
  });
}

// ---- Export ----
export { render, renderForm };
