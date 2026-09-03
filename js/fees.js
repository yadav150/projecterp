// js/fees.js
var db = window.db;

var PATH = 'fees';
var allData = [];

function render(container) {
  if (!container) return;
  if (!db) {
    container.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Database not available</div></div>';
    return;
  }

  var html = '' +
    '<div class="page-header">' +
      '<div><h1 class="page-title">Fee Management</h1><p class="page-subtitle">Track payments and dues</p></div>' +
      '<div class="page-actions"><button class="btn btn-primary" onclick="window.feesModule.openAddModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Fee Record</button></div>' +
    '</div>' +
    '<div class="filter-bar">' +
      '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search by student..." id="fees-search" oninput="window.feesModule.filterTable()"></div>' +
    '</div>' +
    '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Student</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead><tbody id="fees-body"><tr><td colspan="5"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

  container.innerHTML = html;

  window.feesModule = {
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
    console.error('Error loading fees:', error);
    var tbody = document.getElementById('fees-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading data</div></div></td></tr>';
    }
  });
}

function renderTableRows(items) {
  var tbody = document.getElementById('fees-body');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No fee records found</div></div></td></tr>';
    return;
  }

  var rows = '';
  items.forEach(function(item) {
    var statusBadge = item.status === 'Paid' ? '<span class="badge green">Paid</span>' : '<span class="badge red">Pending</span>';
    rows += '' +
      '<tr>' +
        '<td>' + (item.studentName || 'N/A') + '</td>' +
        '<td>₹' + (item.amount || 0) + '</td>' +
        '<td>' + (item.dueDate || 'N/A') + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-btn-sm" onclick="window.feesModule.openEditModal(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
          '<button class="icon-btn-sm danger" onclick="window.feesModule.deleteRecord(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
        '</div></td>' +
      '</tr>';
  });
  tbody.innerHTML = rows;
}

function filterTable() {
  var search = document.getElementById('fees-search');
  var query = search ? search.value.toLowerCase() : '';
  var filtered = allData.filter(function(item) {
    return (item.studentName || '').toLowerCase().includes(query);
  });
  renderTableRows(filtered);
}

function openAddModal() {
  var bodyHtml = '' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Student Name <span class="req">*</span></label><input class="input" id="add-student" placeholder="Student name" /></div>' +
      '<div class="form-row"><label>Amount (₹) <span class="req">*</span></label><input class="input" type="number" id="add-amount" placeholder="0" /></div>' +
      '<div class="form-row"><label>Due Date <span class="req">*</span></label><input class="input" type="date" id="add-due" /></div>' +
      '<div class="form-row"><label>Status</label><select class="select" id="add-status"><option value="Pending">Pending</option><option value="Paid">Paid</option></select></div>' +
    '</div>';

  var footerHtml = '' +
    '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" id="save-add-btn">Save Fee Record</button>';

  window.openModal('Add Fee Record', bodyHtml, footerHtml, false);

  document.getElementById('save-add-btn').addEventListener('click', function() {
    var studentName = document.getElementById('add-student').value.trim();
    var amount = parseFloat(document.getElementById('add-amount').value);
    var dueDate = document.getElementById('add-due').value;
    var status = document.getElementById('add-status').value;

    if (!studentName || isNaN(amount) || amount <= 0 || !dueDate) {
      window.showToast('Please fill in all required fields correctly.', 'error');
      return;
    }

    var data = {
      studentName: studentName,
      amount: amount,
      dueDate: dueDate,
      status: status,
      createdAt: Date.now()
    };

    db.ref(PATH).push(data)
      .then(function() {
        window.closeModal();
        window.showToast('Fee record added successfully.', 'success');
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
      '<div class="form-row"><label>Student Name <span class="req">*</span></label><input class="input" id="edit-student" value="' + (item.studentName || '') + '" /></div>' +
      '<div class="form-row"><label>Amount (₹) <span class="req">*</span></label><input class="input" type="number" id="edit-amount" value="' + (item.amount || 0) + '" /></div>' +
      '<div class="form-row"><label>Due Date <span class="req">*</span></label><input class="input" type="date" id="edit-due" value="' + (item.dueDate || '') + '" /></div>' +
      '<div class="form-row"><label>Status</label><select class="select" id="edit-status"><option value="Pending"' + (item.status === 'Pending' ? ' selected' : '') + '>Pending</option><option value="Paid"' + (item.status === 'Paid' ? ' selected' : '') + '>Paid</option></select></div>' +
    '</div>';

  var footerHtml = '' +
    '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" id="save-edit-btn">Update Fee Record</button>';

  window.openModal('Edit Fee Record', bodyHtml, footerHtml, false);

  document.getElementById('save-edit-btn').addEventListener('click', function() {
    var studentName = document.getElementById('edit-student').value.trim();
    var amount = parseFloat(document.getElementById('edit-amount').value);
    var dueDate = document.getElementById('edit-due').value;
    var status = document.getElementById('edit-status').value;

    if (!studentName || isNaN(amount) || amount <= 0 || !dueDate) {
      window.showToast('Please fill in all required fields correctly.', 'error');
      return;
    }

    db.ref(PATH + '/' + id).update({
      studentName: studentName,
      amount: amount,
      dueDate: dueDate,
      status: status
    })
    .then(function() {
      window.closeModal();
      window.showToast('Fee record updated successfully.', 'success');
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

  if (confirm('Delete fee record for ' + (item.studentName || 'this student') + '?')) {
    db.ref(PATH + '/' + id).remove()
      .then(function() {
        window.showToast('Fee record deleted.', 'error');
        loadData();
      })
      .catch(function(error) {
        window.showToast('Error deleting: ' + error.message, 'error');
      });
  }
}

window.feesModule = {
  render: render,
  openAddModal: openAddModal,
  openEditModal: openEditModal,
  deleteRecord: deleteRecord,
  filterTable: filterTable
};

export { render };
