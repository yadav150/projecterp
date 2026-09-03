// js/app.js
(function() {
  'use strict';

  var pageContainer = document.getElementById('page');
  var navItems = document.querySelectorAll('.nav-item');
  var crumbs = document.getElementById('crumbs');
  var logoutBtn = document.getElementById('logout-btn');

  // Auth and logout same as before

  // ... (global toast and modal functions – keep as before)

  // ---- Router ----
  function navigate(route) { /* same as before */ }
  function renderPage(page) { /* same switch */ }

  // ---- Dashboard ----
  function renderDashboard() {
    var db = window.db;
    if (!db) {
      pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Firebase...</div></div>';
      return;
    }

    pageContainer.innerHTML = '' +
      '<div class="page-header">...</div>' + // same as before
      '<div class="summary-grid" id="summary-grid">' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Total Students</span><span class="stat-icon green">...</span></div><div class="stat-value" id="stat-students">--</div><div class="stat-foot">Loading...</div></div>' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Total Admissions</span><span class="stat-icon sky">...</span></div><div class="stat-value" id="stat-admissions">--</div><div class="stat-foot">Total records</div></div>' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Enrolled</span><span class="stat-icon amber">...</span></div><div class="stat-value" id="stat-enrolled">--</div><div class="stat-foot">Active students</div></div>' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Pending</span><span class="stat-icon red">...</span></div><div class="stat-value" id="stat-pending">--</div><div class="stat-foot">Awaiting confirmation</div></div>' +
      '</div>' +
      '<div class="card"><div class="card-header"><div><div class="card-title">Recent Admissions</div><div class="card-subtitle">Latest enrolled students</div></div></div><div class="card-body"><div id="recent-admissions">Loading...</div></div></div>';

    // Load stats
    db.ref('admissions').once('value').then(function(snapshot) {
      var total = snapshot.numChildren();
      var enrolled = 0, pending = 0;
      snapshot.forEach(function(child) {
        var data = child.val();
        if (data.status === 'Enrolled') enrolled++;
        else if (data.status === 'Pending') pending++;
      });
      document.getElementById('stat-admissions').textContent = total;
      document.getElementById('stat-enrolled').textContent = enrolled;
      document.getElementById('stat-pending').textContent = pending;
      document.getElementById('stat-students').textContent = total;
    }).catch(function() {
      document.getElementById('stat-admissions').textContent = 'Error';
    });

    // Recent 5 – fetch all and sort by createdAt descending
    db.ref('admissions').once('value').then(function(snapshot) {
      var html = '';
      if (!snapshot.exists()) {
        html = '<div class="state"><svg>...</svg><div class="state-title">No admissions yet</div></div>';
      } else {
        var items = [];
        snapshot.forEach(function(child) {
          var data = child.val();
          data.id = child.key;
          items.push(data);
        });
        items.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        items = items.slice(0, 5);
        html = '<ul style="list-style:none;padding:0;margin:0;">';
        items.forEach(function(item) {
          html += '<li style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);"><span><strong>' + item.name + '</strong> - ' + item.class + '</span><span class="badge ' + (item.status === 'Enrolled' ? 'green' : 'amber') + '">' + item.status + '</span></li>';
        });
        html += '</ul>';
      }
      document.getElementById('recent-admissions').innerHTML = html;
    });
  }

  // ---- Students ----
  function renderStudents() {
    pageContainer.innerHTML = '' +
      '<div class="page-header"><div><h1 class="page-title">Students</h1><p class="page-subtitle">Manage all enrolled students</p></div><div class="page-actions"><button class="btn btn-primary" onclick="window.showToast(\'Student registration coming soon.\', \'info\')">...</button></div></div>' +
      '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Class</th><th>Roll</th><th>Status</th><th>Actions</th></tr></thead><tbody id="students-body"><tr><td colspan="5"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

    var db = window.db;
    if (!db) return;

    db.ref('admissions').once('value').then(function(snapshot) {
      var tbody = document.getElementById('students-body');
      if (!snapshot.exists()) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg>...</svg><div class="state-title">No students found</div></div></td></tr>';
        return;
      }
      var html = '';
      var items = [];
      snapshot.forEach(function(child) {
        var data = child.val();
        data.id = child.key;
        items.push(data);
      });
      items.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      items.forEach(function(data) {
        var initials = data.name ? data.name.split(' ').map(function(n){return n.charAt(0)}).join('').toUpperCase() : '?';
        html += '<tr><td><div class="cell-user"><span class="avatar">' + initials + '</span><div><div class="u-name">' + (data.name || 'N/A') + '</div></div></div></td><td>' + (data.class || 'N/A') + '</td><td>' + (data.roll || 'N/A') + '</td><td><span class="badge ' + (data.status === 'Enrolled' ? 'green' : 'amber') + '">' + (data.status || 'N/A') + '</span></td><td><div class="row-actions"><button class="icon-btn-sm" onclick="window.showToast(\'View details coming soon.\', \'info\')"><svg>...</svg></button></div></td></tr>';
      });
      tbody.innerHTML = html;
    });
  }

  // ---- Admission (lazy load) ----
  function renderAdmission() {
    if (typeof window.renderAdmissionModule === 'function') {
      window.renderAdmissionModule(pageContainer);
    } else {
      pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Admission Module...</div></div>';
      import('./admission/admission-router.js').then(function(module) {
        if (module && typeof module.render === 'function') {
          window.renderAdmissionModule = module.render;
          module.render(pageContainer);
        }
      }).catch(function() {
        pageContainer.innerHTML = '<div class="state"><svg>...</svg><div class="state-title">Module not loaded</div></div>';
      });
    }
  }

  // ---- Other modules – all lazy load with same pattern ----
  // (Teachers, Fees, Salary, Receipts, Attendance, Administration)
  // Each function must import the respective .js file and call module.render()

  // ---- Navigation & Bootstrap ----
  // (same as before)

})();
