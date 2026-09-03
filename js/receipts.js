// js/receipts.js
(function() {
  'use strict';

  var db = window.db;
  if (!db) {
    console.error('Firestore not available');
    return;
  }

  var COLLECTION = 'receipts';

  var allData = [];

  function render(container) {
    if (!container) return;

    var html = '' +
      '<div class="page-header">' +
        '<div><h1 class="page-title">Receipts</h1><p class="page-subtitle">Transaction history and receipts</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" onclick="window.receiptsModule.openAddModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Generate Receipt</button></div>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search by student..." id="receipts-search" oninput="window.receiptsModule.filterTable()"></div>' +
      '</div>' +
      '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Receipt #</th><th>Student</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead><tbody id="receipts-body"><tr><td colspan="5"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

    container.innerHTML = html;

    window.receiptsModule = {
      render: render,
      openAddModal: openAddModal,
      openEditModal: openEditModal,
      deleteRecord: deleteRecord,
      filterTable: filterTable
    };

    loadData();
  }

  function loadData() {
    db.collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .get()
      .then(function(snapshot) {
        allData = [];
        snapshot.forEach(function(doc) {
          var data = doc.data();
          data.id = doc.id;
          allData.push(data);
        });
        renderTableRows(allData);
      })
      .catch(function(error) {
        console.error('Error loading receipts:', error);
        var tbody = document.getElementById('receipts-body');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading data</div></div></td></tr>';
        }
      });
  }

  function renderTableRows(items) {
    var tbody = document.getElementById('receipts-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No receipts found</div></div></td></tr>';
      return;
    }

    var rows = '';
    items.forEach(function(item) {
      rows += '' +
        '<tr>' +
          '<td>' + (item.receiptNumber || 'N/A') + '</td>' +
          '<td>' + (item.studentName || 'N/A') + '</td>' +
          '<td>₹' + (item.amount || 0) + '</td>' +
          '<td>' + (item.date || 'N/A') + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="icon-btn-sm" onclick="window.receiptsModule.openEditModal(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button class="icon-btn-sm danger" onclick="window.receiptsModule.deleteRecord(\'' + item.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>' +
          '</div></td>' +
        '</tr>';
    });
    tbody.innerHTML = rows;
  }

  function filterTable() {
    var search = document.getElementById('receipts-search');
    var query = search ? search.value.toLowerCase() : '';
    var filtered = allData.filter(function(item) {
      return (item.studentName || '').toLowerCase().includes(query) ||
             (item.receiptNumber || '').toLowerCase().includes(query);
    });
    renderTableRows(filtered);
  }

  function openAddModal() {
    // Auto-generate receipt number
    var now = new Date();
    var receiptNumber = 'RCP-' + now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + '-' + String(Date.now()).slice(-6);

    var bodyHtml = '' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>Receipt Number</label><input class="input" id="add-receipt" value="' + receiptNumber + '" readonly style="background:#f1f5f9;" /></div>' +
        '<div class="form-row"><label>Student Name <span class="req">*</span></label><input class="input" id="add-student" placeholder="Student name" /></div>' +
        '<div class="form-row"><label>Amount (₹) <span class="req">*</span></label><input class="input" type="number" id="add-amount" placeholder="0" /></div>' +
        '<div class="form-row"><label>Date <span class="req">*</span></label><input class="input" type="date" id="add-date" value="' + now.toISOString().split('T')[0] + '" /></div>' +
      '</div>';

    var footerHtml = '' +
      '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" id="save-add-btn">Save Receipt</button>';

    window.openModal('Generate Receipt', bodyHtml, footerHtml, false);

    document.getElementById('save-add-btn').addEventListener('click', function() {
      var receiptNumber = document.getElementById('add-receipt').value.trim();
      var studentName = document.getElementById('add-student').value.trim();
      var amount = parseFloat(document.getElementById('add-amount').value);
      var date = document.getElementById('add-date').value;

      if (!studentName || isNaN(amount) || amount <= 0 || !date) {
        window.showToast('Please fill in all required fields correctly.', 'error');
        return;
      }

      var data = {
        receiptNumber: receiptNumber,
        studentName: studentName,
        amount: amount,
        date: date,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      db.collection(COLLECTION).add(data)
        .then(function() {
          window.closeModal();
          window.showToast('Receipt generated successfully.', 'success');
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
        '<div class="form-row"><label>Receipt Number</label><input class="input" id="edit-receipt" value="' + (item.receiptNumber || '') + '" readonly style="background:#f1f5f9;" /></div>' +
        '<div class="form-row"><label>Student Name <span class="req">*</span></label><input class="input" id="edit-student" value="' + (item.studentName || '') + '" /></div>' +
        '<div class="form-row"><label>Amount (₹) <span class="req">*</span></label><input class="input" type="number" id="edit-amount" value="' + (item.amount || 0) + '" /></div>' +
        '<div class="form-row"><label>Date <span class="req">*</span></label><input class="input" type="date" id="edit-date" value="' + (item.date || '') + '" /></div>' +
      '</div>';

    var footerHtml = '' +
      '<button class="btn btn-outline" onclick="window.closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" id="save-edit-btn">Update Receipt</button>';

    window.openModal('Edit Receipt', bodyHtml, footerHtml, false);

    document.getElementById('save-edit-btn').addEventListener('click', function() {
      var studentName = document.getElementById('edit-student').value.trim();
      var amount = parseFloat(document.getElementById('edit-amount').value);
      var date = document.getElementById('edit-date').value;

      if (!studentName || isNaN(amount) || amount <= 0 || !date) {
        window.showToast('Please fill in all required fields correctly.', 'error');
        return;
      }

      db.collection(COLLECTION).doc(id).update({
        studentName: studentName,
        amount: amount,
        date: date
      })
      .then(function() {
        window.closeModal();
        window.showToast('Receipt updated successfully.', 'success');
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

    if (confirm('Delete receipt for ' + (item.studentName || 'this student') + '?')) {
      db.collection(COLLECTION).doc(id).delete()
        .then(function() {
          window.showToast('Receipt deleted.', 'error');
          loadData();
        })
        .catch(function(error) {
          window.showToast('Error deleting: ' + error.message, 'error');
        });
    }
  }

  window.receiptsModule = {
    render: render,
    openAddModal: openAddModal,
    openEditModal: openEditModal,
    deleteRecord: deleteRecord,
    filterTable: filterTable
  };

  export { render };
})();
