// js/teachers.js
(function() {
  'use strict';

  var db = window.db;
  if (!db) {
    console.error('Realtime Database not available');
    return;
  }

  var PATH = 'teachers';
  var allData = [];

  function render(container) {
    if (!container) return;

    var html = '' +
      '<div class="page-header">' +
        '<div><h1 class="page-title">Teachers</h1><p class="page-subtitle">Manage faculty members</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="window.teachersModule.openAddModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Teacher</button></div>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search teachers..." id="teachers-search" oninput="window.teachersModule.filterTable()"></div>' +
      '</div>' +
      '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Subject</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead><tbody id="teachers-body"><tr><td colspan="5"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

    container.innerHTML = html;

    window.teachersModule = {
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
      console.error('Error loading teachers:', error);
      var tbody = document.getElementById('teachers-body');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading data</div></div></td></tr>';
      }
    });
  }

  function renderTableRows(items) {
    var tbody = document.getElementById('teachers-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No teachers found</div></div></td></tr>';
      return;
    }

    var rows = '';
    items.forEach(function(item) {
      var initials = item.name ? item.name.split(' ').map(function(n){return n.charAt(0)}).join('').toUpperCase() : '?';
      rows += '' +
        '<tr>' +
          '<td><div class="cell-user"><span class="avatar">' + initials + '</span><div><div class="u-name">' + (item.name || 'N/A') + '</div></div></div></td>' +
          '<td>' + (item.subject || 'N/A') + '</td>' +
          '<td>' + (item.phone || 'N/A') + '</td>' +
          '<td>' + (item.email || 'N/A') + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="icon-btn-sm" onclick="window.teachersModule.openEditModal(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="icon-btn-sm danger" onclick="window.teachersModule.deleteRecord(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
          '</div></td>' +
        '</tr>';
    });
    tbody.innerHTML = rows;
  }

  function filterTable() {
    var search = document.getElementById('teachers-search');
    var query = search ? search.value.toLowerCase() : '';
    var filtered = allData.filter(function(item) {
      return (item.name || '').toLowerCase().includes(query) ||
             (item.subject || '').toLowerCase().includes(query) ||
             (item.phone || '').toLowerCase().includes(query) ||
             (item.email || '').toLowerCase().includes(query);
    });
    renderTableRows(filtered);
  }

  function openAddModal() {
    var bodyHtml = '' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>Full Name <span class="req">*</span></label><input class="input" id="add-name" placeholder="Enter teacher name" /></div>' +
        '<div class="form-row"><label>Subject <span class="req">*</span></label><input class="input" id="add-subject" placeholder="e.g. Mathematics" /></div>' +
        '<div class="form-row"><label>Phone</label><input class="input" id="add-phone" placeholder="Contact number" /></div>' +
        '<div class="form-row"><label>Email</label><input class="input" id="add-email" placeholder="email@example.com" /></div>' +
      '</div>';

    var footerHtml = '' +
      '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" id="save-add-btn">Save Teacher</button>';

    window.openModal('Add Teacher', bodyHtml, footerHtml, false);

    document.getElementById('save-add-btn').addEventListener('click', function() {
      var name = document.getElementById('add-name').value.trim();
      var subject = document.getElementById('add-subject').value.trim();
      var phone = document.getElementById('add-phone').value.trim();
      var email = document.getElementById('add-email').value.trim();

      if (!name || !subject) {
        window.showToast('Please fill in all required fields.', 'error');
        return;
      }

      var data = {
        name: name,
        subject: subject,
        phone: phone,
        email: email,
        createdAt: Date.now()
      };

      db.ref(PATH).push(data)
        .then(function() {
          window.closeModal();
          window.showToast('Teacher added successfully.', 'success');
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
        '<div class="form-row"><label>Full Name <span class="req">*</span></label><input class="input" id="edit-name" value="' + (item.name || '') + '" /></div>' +
        '<div class="form-row"><label>Subject <span class="req">*</span></label><input class="input" id="edit-subject" value="' + (item.subject || '') + '" /></div>' +
        '<div class="form-row"><label>Phone</label><input class="input" id="edit-phone" value="' + (item.phone || '') + '" /></div>' +
        '<div class="form-row"><label>Email</label><input class="input" id="edit-email" value="' + (item.email || '') + '" /></div>' +
      '</div>';

    var footerHtml = '' +
      '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" id="save-edit-btn">Update Teacher</button>';

    window.openModal('Edit Teacher', bodyHtml, footerHtml, false);

    document.getElementById('save-edit-btn').addEventListener('click', function() {
      var name = document.getElementById('edit-name').value.trim();
      var subject = document.getElementById('edit-subject').value.trim();
      var phone = document.getElementById('edit-phone').value.trim();
      var email = document.getElementById('edit-email').value.trim();

      if (!name || !subject) {
        window.showToast('Please fill in all required fields.', 'error');
        return;
      }

      db.ref(PATH + '/' + id).update({
        name: name,
        subject: subject,
        phone: phone,
        email: email
      })
      .then(function() {
        window.closeModal();
        window.showToast('Teacher updated successfully.', 'success');
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

    if (confirm('Delete teacher record for ' + (item.name || 'this teacher') + '?')) {
      db.ref(PATH + '/' + id).remove()
        .then(function() {
          window.showToast('Teacher record deleted.', 'error');
          loadData();
        })
        .catch(function(error) {
          window.showToast('Error deleting: ' + error.message, 'error');
        });
    }
  }

  window.teachersModule = {
    render: render,
    openAddModal: openAddModal,
    openEditModal: openEditModal,
    deleteRecord: deleteRecord,
    filterTable: filterTable
  };

  export { render };
})();
