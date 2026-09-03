// js/salary.js
var db = window.db;

var PATH = 'salary';
var allData = [];

function render(container) {
  if (!container) return;
  if (!db) {
    container.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Database not available</div></div>';
    return;
  }

  var html = '' +
    '<div class="page-header">' +
      '<div><h1 class="page-title">Salary</h1><p class="page-subtitle">Staff payroll management</p></div>' +
      '<div class="page-actions"><button class="btn btn-primary" onclick="window.salaryModule.openAddModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Salary Entry</button></div>' +
    '</div>' +
    '<div class="filter-bar">' +
      '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search staff..." id="salary-search" oninput="window.salaryModule.filterTable()"></div>' +
    '</div>' +
    '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Staff Name</th><th>Amount (₹)</th><th>Month</th><th>Status</th><th>Actions</th></tr></thead><tbody id="salary-body"><tr><td colspan="5"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

  container.innerHTML = html;

  window.salaryModule = {
    render: render,
    openAddModal: openAddModal,
    openEditModal: openEditModal,
    deleteRecord: deleteRecord,
    filterTable: filterTable
  };

  loadData();
}

function loadData() {
  db.ref(PATH).once('value').then(function(snapshot) {
    allData = [];
    snapshot.forEach(function(child) {
      var data = child.val();
      data.id = child.key;
      allData.push(data);
    });
    renderTableRows(allData);
  }).catch(function(error) {
    console.error('Error loading salary:', error);
    var tbody = document.getElementById('salary-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading data</div></div></td></tr>';
    }
  });
}

function renderTableRows(items) {
  var tbody = document.getElementById('salary-body');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No salary records found</div></div></td></tr>';
    return;
  }

  var rows = '';
  items.forEach(function(item) {
    var statusBadge = item.status === 'Paid' ? '<span class="badge green">Paid</span>' : '<span class="badge red">Pending</span>';
    rows += '' +
      '<tr>' +
        '<td>' + (item.staffName || 'N/A') + '</td>' +
        '<td>₹' + (item.amount || 0) + '</td>' +
        '<td>' + (item.month || 'N/A') + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-btn-sm" onclick="window.salaryModule.openEditModal(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
          '<button class="icon-btn-sm danger" onclick="window.salaryModule.deleteRecord(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
        '</div></td>' +
      '</tr>';
  });
  tbody.innerHTML = rows;
}

function filterTable() {
  var search = document.getElementById('salary-search');
  var query = search ? search.value.toLowerCase() : '';
  var filtered = allData.filter(function(item) {
    return (item.staffName || '').toLowerCase().includes(query);
  });
  renderTableRows(filtered);
}

function openAddModal() {
  var bodyHtml = '' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Staff Name <span class="req">*</span></label><input class="input" id="add-staff" placeholder="Staff name" /></div>' +
      '<div class="form-row"><label>Amount (₹) <span class="req">*</span></label><input class="input" type="number" id="add-amount" placeholder="0" /></div>' +
      '<div class="form-row"><label>Month <span class="req">*</span></label><input class="input" type="month" id="add-month" /></div>' +
      '<div class="form-row"><label>Status</label><select class="select" id="add-status"><option value="Pending">Pending</option><option value="Paid">Paid</option></select></div>' +
    '</div>';

  var footerHtml = '' +
    '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" id="save-add-btn">Save Salary Entry</button>';

  window.openModal('Add Salary Entry', bodyHtml, footerHtml, false);

  document.getElementById('save-add-btn').addEventListener('click', function() {
    var staffName = document.getElementById('add-staff').value.trim();
    var amount = parseFloat(document.getElementById('add-amount').value);
    var month = document.getElementById('add-month').value;
    var status = document.getElementById('add-status').value;

    if (!staffName || isNaN(amount) || amount <= 0 || !month) {
      window.showToast('Please fill in all required fields correctly.', 'error');
      return;
    }

    var data = {
      staffName: staffName,
      amount: amount,
      month: month,
      status: status,
      createdAt: Date.now()
    };

    db.ref(PATH).push(data)
      .then(function() {
        window.closeModal();
        window.showToast('Salary entry added successfully.', 'success');
        loadData();
      })
      .catch(function(error) {
        window.showToast('Error saving: ' + error.message, 'error');
      });
  });
}

function openEditModal(id) {
  var item = allData.find(function(a) { return a.id === id; });
  if (!item) {
    window.showToast('Record not found.', 'error');
    return;
  }

  var bodyHtml = '' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Staff Name <span class="req">*</span></label><input class="input" id="edit-staff" value="' + (item.staffName || '') + '" /></div>' +
      '<div class="form-row"><label>Amount (₹) <span class="req">*</span></label><input class="input" type="number" id="edit-amount" value="' + (item.amount || 0) + '" /></div>' +
      '<div class="form-row"><label>Month <span class="req">*</span></label><input class="input" type="month" id="edit-month" value="' + (item.month || '') + '" /></div>' +
      '<div class="form-row"><label>Status</label><select class="select" id="edit-status"><option value="Pending"' + (item.status === 'Pending' ? ' selected' : '') + '>Pending</option><option value="Paid"' + (item.status === 'Paid' ? ' selected' : '') + '>Paid</option></select></div>' +
    '</div>';

  var footerHtml = '' +
    '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" id="save-edit-btn">Update Salary Entry</button>';

  window.openModal('Edit Salary Entry', bodyHtml, footerHtml, false);

  document.getElementById('save-edit-btn').addEventListener('click', function() {
    var staffName = document.getElementById('edit-staff').value.trim();
    var amount = parseFloat(document.getElementById('edit-amount').value);
    var month = document.getElementById('edit-month').value;
    var status = document.getElementById('edit-status').value;

    if (!staffName || isNaN(amount) || amount <= 0 || !month) {
      window.showToast('Please fill in all required fields correctly.', 'error');
      return;
    }

    db.ref(PATH + '/' + id).update({
      staffName: staffName,
      amount: amount,
      month: month,
      status: status
    })
    .then(function() {
      window.closeModal();
      window.showToast('Salary entry updated successfully.', 'success');
      loadData();
    })
    .catch(function(error) {
      window.showToast('Error updating: ' + error.message, 'error');
    });
  });
}

function deleteRecord(id) {
  var item = allData.find(function(a) { return a.id === id; });
  if (!item) return;

  if (confirm('Delete salary record for ' + (item.staffName || 'this staff') + '?')) {
    db.ref(PATH + '/' + id).remove()
      .then(function() {
        window.showToast('Salary record deleted.', 'error');
        loadData();
      })
      .catch(function(error) {
        window.showToast('Error deleting: ' + error.message, 'error');
      });
  }
}

window.salaryModule = {
  render: render,
  openAddModal: openAddModal,
  openEditModal: openEditModal,
  deleteRecord: deleteRecord,
  filterTable: filterTable
};

export { render };
