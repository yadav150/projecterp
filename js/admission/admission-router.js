// js/admission/admission-router.js
(function() {
  'use strict';

  var db = window.db;
  if (!db) {
    console.error('Firestore not available');
    return;
  }

  var ADMISSIONS_COLLECTION = 'admissions';

  // Helper to generate a unique token (short UUID)
  function generateToken() {
    return Math.random().toString(36).substring(2, 8) + '-' +
           Math.random().toString(36).substring(2, 8) + '-' +
           Date.now().toString(36);
  }

  // Render the admission page
  function render(container) {
    if (!container) return;

    var html = '' +
      '<div class="page-header">' +
        '<div><h1 class="page-title">Admission</h1><p class="page-subtitle">Manage student admissions and enrollments</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="window.admissionModule.openAddModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Admission</button></div>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search admissions..." id="admission-search" oninput="window.admissionModule.filterTable()"></div>' +
        '<select class="select" id="admission-status-filter" onchange="window.admissionModule.filterTable()"><option value="">All Statuses</option><option value="Enrolled">Enrolled</option><option value="Pending">Pending</option></select>' +
      '</div>' +
      '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Student</th><th>Class</th><th>Roll</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="admission-body"><tr><td colspan="6"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

    container.innerHTML = html;

    // Expose module functions
    window.admissionModule = {
      render: render,
      openAddModal: openAddModal,
      openEditModal: openEditModal,
      deleteRecord: deleteRecord,
      filterTable: filterTable,
      downloadPDF: downloadPDF
    };

    loadAdmissions();
  }

  var allAdmissions = [];

  function loadAdmissions() {
    db.collection(ADMISSIONS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function(snapshot) {
        allAdmissions = [];
        snapshot.forEach(function(doc) {
          var data = doc.data();
          data.id = doc.id;
          allAdmissions.push(data);
        });
        renderTableRows(allAdmissions);
      })
      .catch(function(error) {
        console.error('Error loading admissions:', error);
        var tbody = document.getElementById('admission-body');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="6"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading data</div><div class="state-sub">' + error.message + '</div></div></td></tr>';
        }
      });
  }

  function renderTableRows(admissions) {
    var tbody = document.getElementById('admission-body');
    if (!tbody) return;

    if (!admissions || admissions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No admissions found</div></div></td></tr>';
      return;
    }

    var rows = '';
    admissions.forEach(function(item) {
      var statusBadge = item.status === 'Enrolled' ? '<span class="badge green">Enrolled</span>' : '<span class="badge amber">Pending</span>';
      var initials = item.name ? item.name.split(' ').map(function(n){return n.charAt(0)}).join('').toUpperCase() : '?';
      rows += '' +
        '<tr>' +
          '<td><div class="cell-user"><span class="avatar">' + initials + '</span><div><div class="u-name">' + (item.name || 'N/A') + '</div></div></div></td>' +
          '<td>' + (item.class || 'N/A') + '</td>' +
          '<td>' + (item.roll || 'N/A') + '</td>' +
          '<td>' + (item.date || 'N/A') + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="icon-btn-sm" onclick="window.admissionModule.openEditModal(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="icon-btn-sm" onclick="window.admissionModule.downloadPDF(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></button>' +
            '<button class="icon-btn-sm danger" onclick="window.admissionModule.deleteRecord(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
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
      var matchName = (item.name || '').toLowerCase().includes(query);
      var matchStatus = status === '' || item.status === status;
      return matchName && matchStatus;
    });

    renderTableRows(filtered);
  }

  function openAddModal() {
    var bodyHtml = '' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>Full Name <span class="req">*</span></label><input class="input" id="add-name" placeholder="Enter student name" /></div>' +
        '<div class="form-row"><label>Class <span class="req">*</span></label><input class="input" id="add-class" placeholder="e.g. 10-A" /></div>' +
        '<div class="form-row"><label>Roll Number <span class="req">*</span></label><input class="input" id="add-roll" placeholder="Enter roll number" /></div>' +
        '<div class="form-row"><label>Status</label><select class="select" id="add-status"><option value="Enrolled">Enrolled</option><option value="Pending">Pending</option></select></div>' +
      '</div>';

    var footerHtml = '' +
      '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" id="save-add-btn">Save Admission</button>';

    window.openModal('New Admission', bodyHtml, footerHtml, false);

    document.getElementById('save-add-btn').addEventListener('click', function() {
      var name = document.getElementById('add-name').value.trim();
      var cls = document.getElementById('add-class').value.trim();
      var roll = document.getElementById('add-roll').value.trim();
      var status = document.getElementById('add-status').value;

      if (!name || !cls || !roll) {
        window.showToast('Please fill in all required fields.', 'error');
        return;
      }

      var token = generateToken();
      var admissionData = {
        name: name,
        class: cls,
        roll: roll,
        status: status,
        token: token,
        date: new Date().toISOString().split('T')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      db.collection(ADMISSIONS_COLLECTION).add(admissionData)
        .then(function() {
          window.closeModal();
          window.showToast('Admission added successfully for ' + name + '.', 'success');
          loadAdmissions(); // refresh
        })
        .catch(function(error) {
          window.showToast('Error saving admission: ' + error.message, 'error');
        });
    });
  }

  function openEditModal(id) {
    var item = allAdmissions.find(function(a) { return a.id === id; });
    if (!item) {
      window.showToast('Record not found.', 'error');
      return;
    }

    var bodyHtml = '' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>Full Name <span class="req">*</span></label><input class="input" id="edit-name" value="' + (item.name || '') + '" /></div>' +
        '<div class="form-row"><label>Class <span class="req">*</span></label><input class="input" id="edit-class" value="' + (item.class || '') + '" /></div>' +
        '<div class="form-row"><label>Roll Number <span class="req">*</span></label><input class="input" id="edit-roll" value="' + (item.roll || '') + '" /></div>' +
        '<div class="form-row"><label>Status</label><select class="select" id="edit-status"><option value="Enrolled"' + (item.status === 'Enrolled' ? ' selected' : '') + '>Enrolled</option><option value="Pending"' + (item.status === 'Pending' ? ' selected' : '') + '>Pending</option></select></div>' +
      '</div>';

    var footerHtml = '' +
      '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" id="save-edit-btn">Update Admission</button>';

    window.openModal('Edit Admission', bodyHtml, footerHtml, false);

    document.getElementById('save-edit-btn').addEventListener('click', function() {
      var name = document.getElementById('edit-name').value.trim();
      var cls = document.getElementById('edit-class').value.trim();
      var roll = document.getElementById('edit-roll').value.trim();
      var status = document.getElementById('edit-status').value;

      if (!name || !cls || !roll) {
        window.showToast('Please fill in all required fields.', 'error');
        return;
      }

      db.collection(ADMISSIONS_COLLECTION).doc(id).update({
        name: name,
        class: cls,
        roll: roll,
        status: status
      })
      .then(function() {
        window.closeModal();
        window.showToast('Admission updated successfully.', 'success');
        loadAdmissions();
      })
      .catch(function(error) {
        window.showToast('Error updating: ' + error.message, 'error');
      });
    });
  }

  function deleteRecord(id) {
    var item = allAdmissions.find(function(a) { return a.id === id; });
    if (!item) return;

    if (confirm('Are you sure you want to delete the admission record for ' + (item.name || 'this student') + '?')) {
      db.collection(ADMISSIONS_COLLECTION).doc(id).delete()
        .then(function() {
          window.showToast('Admission record deleted.', 'error');
          loadAdmissions();
        })
        .catch(function(error) {
          window.showToast('Error deleting: ' + error.message, 'error');
        });
    }
  }

  // ---- PDF Download with QR ----
  function downloadPDF(id) {
    var item = allAdmissions.find(function(a) { return a.id === id; });
    if (!item) {
      window.showToast('Record not found.', 'error');
      return;
    }

    // Create a temporary receipt container
    var receiptDiv = document.createElement('div');
    receiptDiv.className = 'receipt';
    receiptDiv.style.cssText = 'padding:40px;max-width:780px;margin:0 auto;background:#fff;font-family:Inter,sans-serif;';
    receiptDiv.innerHTML = '' +
      '<div class="receipt-head">' +
        '<div class="receipt-brand">' +
          '<div class="logo" style="width:52px;height:52px;background:#dc3545;color:#fff;border-radius:5px;display:grid;place-items:center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>' +
          '<div><div class="school-name" style="font-size:20px;font-weight:800;">Janaki Professional Academy</div><div class="school-meta" style="font-size:12px;color:#64748b;">ERP · Admission Receipt</div></div>' +
        '</div>' +
        '<div class="receipt-tag"><h3 style="margin:0;font-size:15px;text-transform:uppercase;letter-spacing:0.08em;color:#dc3545;">Admission Confirmed</h3><div class="r-num" style="font-size:12.5px;color:#64748b;">Token: ' + item.token + '</div></div>' +
      '</div>' +
      '<div class="receipt-section">' +
        '<h4 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Student Details</h4>' +
        '<div class="receipt-info-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px;font-size:13px;">' +
          '<div><span class="k" style="color:#64748b;min-width:100px;">Name</span><span class="v" style="font-weight:600;">' + item.name + '</span></div>' +
          '<div><span class="k" style="color:#64748b;min-width:100px;">Class</span><span class="v" style="font-weight:600;">' + item.class + '</span></div>' +
          '<div><span class="k" style="color:#64748b;min-width:100px;">Roll Number</span><span class="v" style="font-weight:600;">' + item.roll + '</span></div>' +
          '<div><span class="k" style="color:#64748b;min-width:100px;">Status</span><span class="v" style="font-weight:600;">' + item.status + '</span></div>' +
          '<div><span class="k" style="color:#64748b;min-width:100px;">Date</span><span class="v" style="font-weight:600;">' + item.date + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div style="margin:20px 0;text-align:center;">' +
        '<div id="qr-code-container" style="display:inline-block;padding:10px;border:1px solid #e2e8f0;border-radius:5px;"></div>' +
        '<div style="font-size:11px;color:#94a3b8;margin-top:6px;">Scan to verify authenticity</div>' +
      '</div>' +
      '<div class="receipt-foot" style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#64748b;">' +
        '<div class="note">This is a system-generated receipt. The QR code contains a unique verification token.</div>' +
        '<div class="sign"><div class="line" style="width:180px;border-top:1.5px solid #1e293b;margin-bottom:6px;"></div>Authorized Signatory</div>' +
      '</div>';

    document.body.appendChild(receiptDiv);

    // Generate QR code
    var qrContainer = document.getElementById('qr-code-container');
    var verifyUrl = window.location.origin + '/verify.html?token=' + item.token;
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

    // Use html2canvas to capture receipt
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
      pdf.save('Admission_' + item.name + '_' + item.token + '.pdf');
      document.body.removeChild(receiptDiv);
    }).catch(function(error) {
      console.error('PDF generation error:', error);
      window.showToast('Error generating PDF. Please try again.', 'error');
      document.body.removeChild(receiptDiv);
    });
  }

  // Export
  var admissionModule = {
    render: render,
    openAddModal: openAddModal,
    openEditModal: openEditModal,
    deleteRecord: deleteRecord,
    filterTable: filterTable,
    downloadPDF: downloadPDF
  };

  window.admissionModule = admissionModule;
  export { render };
})();
