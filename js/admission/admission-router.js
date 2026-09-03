// js/admission/admission-router.js
(function() {
  'use strict';

  var admissions = [
    { id: 1, name: 'Priya Sharma', class: '12-A', roll: '001', status: 'Enrolled', date: '2025-04-01' },
    { id: 2, name: 'Rohit Singh', class: '10-B', roll: '045', status: 'Enrolled', date: '2025-04-02' },
    { id: 3, name: 'Ananya Patel', class: '8-C', roll: '012', status: 'Pending', date: '2025-04-03' }
  ];

  var nextId = 4;

  function render(container) {
    if (!container) return;

    var html = '' +
      '<div class="page-header">' +
        '<div><h1 class="page-title">Admission</h1><p class="page-subtitle">Manage student admissions and enrollments</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="window.admissionModule.openAddModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Admission</button></div>' +
      '</div>' +
      '<div class="filter-bar"><div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search admissions..." id="admission-search" oninput="window.admissionModule.filterTable()"></div><select class="select" id="admission-status-filter" onchange="window.admissionModule.filterTable()"><option value="">All Statuses</option><option value="Enrolled">Enrolled</option><option value="Pending">Pending</option></select></div>' +
      '<div class="table-wrap"><div class="table-scroll"><table class="data-table" id="admission-table"><thead><tr><th>Student</th><th>Class</th><th>Roll No</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="admission-body"></tbody></table></div></div>';

    container.innerHTML = html;

    // Expose module functions to window
    window.admissionModule = {
      render: render,
      openAddModal: openAddModal,
      openEditModal: openEditModal,
      deleteRecord: deleteRecord,
      filterTable: filterTable
    };

    renderTableRows();
  }

  function renderTableRows(data) {
    var tbody = document.getElementById('admission-body');
    if (!tbody) return;

    var list = data || admissions;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="state" style="padding:40px 20px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No admissions found</div><div class="state-sub">Click "New Admission" to add a student.</div></div></td></tr>';
      return;
    }

    var rows = '';
    list.forEach(function(item) {
      var statusBadge = item.status === 'Enrolled' ? '<span class="badge green">Enrolled</span>' : '<span class="badge amber">Pending</span>';
      var initials = item.name.split(' ').map(function(n) { return n.charAt(0); }).join('').toUpperCase();

      rows += '' +
        '<tr>' +
          '<td><div class="cell-user"><span class="avatar">' + initials + '</span><div><div class="u-name">' + item.name + '</div></div></div></td>' +
          '<td>' + item.class + '</td>' +
          '<td>' + item.roll + '</td>' +
          '<td>' + item.date + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="icon-btn-sm" onclick="window.admissionModule.openEditModal(' + item.id + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="icon-btn-sm danger" onclick="window.admissionModule.deleteRecord(' + item.id + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
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

    var filtered = admissions.filter(function(item) {
      var matchName = item.name.toLowerCase().includes(query);
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

      admissions.push({
        id: nextId++,
        name: name,
        class: cls,
        roll: roll,
        status: status,
        date: new Date().toISOString().split('T')[0]
      });

      window.closeModal();
      renderTableRows();
      window.showToast('Admission added successfully for ' + name + '.', 'success');
    });
  }

  function openEditModal(id) {
    var item = admissions.find(function(a) { return a.id === id; });
    if (!item) {
      window.showToast('Record not found.', 'error');
      return;
    }

    var bodyHtml = '' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>Full Name <span class="req">*</span></label><input class="input" id="edit-name" value="' + item.name + '" /></div>' +
        '<div class="form-row"><label>Class <span class="req">*</span></label><input class="input" id="edit-class" value="' + item.class + '" /></div>' +
        '<div class="form-row"><label>Roll Number <span class="req">*</span></label><input class="input" id="edit-roll" value="' + item.roll + '" /></div>' +
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

      item.name = name;
      item.class = cls;
      item.roll = roll;
      item.status = status;

      window.closeModal();
      renderTableRows();
      window.showToast('Admission updated successfully.', 'success');
    });
  }

  function deleteRecord(id) {
    var item = admissions.find(function(a) { return a.id === id; });
    if (!item) return;

    if (confirm('Are you sure you want to delete the admission record for ' + item.name + '?')) {
      admissions = admissions.filter(function(a) { return a.id !== id; });
      renderTableRows();
      window.showToast('Admission record deleted.', 'error');
    }
  }

  // ---- Export for app.js ----
  var admissionModule = {
    render: render,
    openAddModal: openAddModal,
    openEditModal: openEditModal,
    deleteRecord: deleteRecord,
    filterTable: filterTable
  };

  // Make it globally accessible for the inline onclick handlers
  window.admissionModule = admissionModule;

  // Export for module import
  export { render };

})();
