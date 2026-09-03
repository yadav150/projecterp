// js/administration.js
var db = window.db;

var PATH = 'settings'; // or 'administration'
var allData = [];

function render(container) {
  if (!container) return;
  if (!db) {
    container.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Database not available</div></div>';
    return;
  }

  var html = '' +
    '<div class="page-header">' +
      '<div><h1 class="page-title">Administration</h1><p class="page-subtitle">System settings and user management</p></div>' +
      '<div class="page-actions"><button class="btn btn-primary" onclick="window.administrationModule.openAddModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Setting</button></div>' +
    '</div>' +
    '<div class="filter-bar">' +
      '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search settings..." id="admin-search" oninput="window.administrationModule.filterTable()"></div>' +
    '</div>' +
    '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Key</th><th>Value</th><th>Actions</th></tr></thead><tbody id="admin-body"><tr><td colspan="3"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

  container.innerHTML = html;

  window.administrationModule = {
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
    console.error('Error loading settings:', error);
    var tbody = document.getElementById('admin-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="3"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading data</div></div></td></tr>';
    }
  });
}

function renderTableRows(items) {
  var tbody = document.getElementById('admin-body');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No settings found</div></div></td></tr>';
    return;
  }

  var rows = '';
  items.forEach(function(item) {
    rows += '' +
      '<tr>' +
        '<td><strong>' + (item.key || 'N/A') + '</strong></td>' +
        '<td>' + (item.value || 'N/A') + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-btn-sm" onclick="window.administrationModule.openEditModal(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
          '<button class="icon-btn-sm danger" onclick="window.administrationModule.deleteRecord(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
        '</div></td>' +
      '</tr>';
  });
  tbody.innerHTML = rows;
}

function filterTable() {
  var search = document.getElementById('admin-search');
  var query = search ? search.value.toLowerCase() : '';
  var filtered = allData.filter(function(item) {
    return (item.key || '').toLowerCase().includes(query) ||
           (item.value || '').toLowerCase().includes(query);
  });
  renderTableRows(filtered);
}

function openAddModal() {
  var bodyHtml = '' +
    '<div class="form-grid">' +
      '<div class="form-row"><label>Setting Key <span class="req">*</span></label><input class="input" id="add-key" placeholder="e.g. school_name" /></div>' +
      '<div class="form-row"><label>Value <span class="req">*</span></label><input class="input" id="add-value" placeholder="Setting value" /></div>' +
    '</div>';

  var footerHtml = '' +
    '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" id="save-add-btn">Save Setting</button>';

  window.openModal('Add Setting', bodyHtml, footerHtml, false);

  document.getElementById('save-add-btn').addEventListener('click', function() {
    var key = document.getElementById('add-key').value.trim();
    var value = document.getElementById('add-value').value.trim();

    if (!key || !value) {
      window.showToast('Please fill in all required fields.', 'error');
      return;
    }

    var data = {
      key: key,
      value: value,
      createdAt: Date.now()
    };

    db.ref(PATH).push(data)
      .then(function() {
        window.closeModal();
        window.showToast('Setting saved successfully.', 'success');
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
      '<div class="form-row"><label>Setting Key <span class="req">*</span></label><input class="input" id="edit-key" value="' + (item.key || '') + '" /></div>' +
      '<div class="form-row"><label>Value <span class="req">*</span></label><input class="input" id="edit-value" value="' + (item.value || '') + '" /></div>' +
    '</div>';

  var footerHtml = '' +
    '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" id="save-edit-btn">Update Setting</button>';

  window.openModal('Edit Setting', bodyHtml, footerHtml, false);

  document.getElementById('save-edit-btn').addEventListener('click', function() {
    var key = document.getElementById('edit-key').value.trim();
    var value = document.getElementById('edit-value').value.trim();

    if (!key || !value) {
      window.showToast('Please fill in all required fields.', 'error');
      return;
    }

    db.ref(PATH + '/' + id).update({
      key: key,
      value: value
    })
    .then(function() {
      window.closeModal();
      window.showToast('Setting updated successfully.', 'success');
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

  if (confirm('Delete setting "' + (item.key || '') + '"?')) {
    db.ref(PATH + '/' + id).remove()
      .then(function() {
        window.showToast('Setting deleted.', 'error');
        loadData();
      })
      .catch(function(error) {
        window.showToast('Error deleting: ' + error.message, 'error');
      });
  }
}

window.administrationModule = {
  render: render,
  openAddModal: openAddModal,
  openEditModal: openEditModal,
  deleteRecord: deleteRecord,
  filterTable: filterTable
};

export { render };
