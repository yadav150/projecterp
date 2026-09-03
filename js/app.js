// js/app.js
(function() {
  'use strict';

  var pageContainer = document.getElementById('page');
  var navItems = document.querySelectorAll('.nav-item');
  var crumbs = document.getElementById('crumbs');

  // ---- Global Toast Controller ----
  window.showToast = function(message, type) {
    type = type || 'info';
    var root = document.getElementById('toast-root');
    if (!root) return;

    var icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    var toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'success') toast.classList.add('success');
    if (type === 'error') toast.classList.add('error');

    toast.innerHTML = '' +
      '<span style="flex-shrink:0;">' + (icons[type] || icons.info) + '</span>' +
      '<div><div class="t-title">' + (type.charAt(0).toUpperCase() + type.slice(1)) + '</div><div class="t-msg">' + message + '</div></div>' +
      '<button class="modal-close" style="margin-left:auto;flex-shrink:0;" onclick="this.parentElement.remove()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';

    root.appendChild(toast);

    setTimeout(function() {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(function() {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }
    }, 4500);
  };

  // ---- Global Modal Controller ----
  window.openModal = function(title, bodyHtml, footerHtml, large) {
    var root = document.getElementById('modal-root');
    if (!root) return;

    var modalClass = 'modal';
    if (large) modalClass += ' large';

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) window.closeModal();
    });

    backdrop.innerHTML = '' +
      '<div class="' + modalClass + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<div class="modal-title">' + title + '</div>' +
          '<button class="modal-close" onclick="window.closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="modal-body">' + bodyHtml + '</div>' +
        '<div class="modal-foot">' + (footerHtml || '<button class="btn btn-outline" onclick="window.closeModal()">Close</button>') + '</div>' +
      '</div>';

    root.innerHTML = '';
    root.appendChild(backdrop);
  };

  window.closeModal = function() {
    var root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  };

  // ---- Router ----
  function navigate(route) {
    var page = route || 'dashboard';

    // Update nav active state
    navItems.forEach(function(item) {
      item.classList.remove('active');
      var dataRoute = item.getAttribute('data-route');
      if (dataRoute === page) {
        item.classList.add('active');
      }
    });

    // Update breadcrumbs
    var label = page.charAt(0).toUpperCase() + page.slice(1);
    if (page === 'dashboard') label = 'Dashboard';
    crumbs.innerHTML = '<span>Home</span><span class="sep">/</span><span class="crumb-current">' + label + '</span>';

    // Render page
    renderPage(page);
  }

  function renderPage(page) {
    if (!pageContainer) return;

    switch (page) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'students':
        renderStudents();
        break;
      case 'admission':
        renderAdmission();
        break;
      case 'teachers':
        renderTeachers();
        break;
      case 'fees':
        renderFees();
        break;
      case 'salary':
        renderSalary();
        break;
      case 'receipts':
        renderReceipts();
        break;
      case 'attendance':
        renderAttendance();
        break;
      case 'administration':
        renderAdministration();
        break;
      default:
        renderDashboard();
    }
  }

  // ---- Page Renderers ----
  function renderDashboard() {
    pageContainer.innerHTML = '' +
      '<div class="page-header">' +
        '<div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Overview of Janaki Professional Academy</p></div>' +
        '<div class="page-actions"><button class="btn btn-outline" onclick="window.showToast(\'Refreshing data...\', \'info\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refresh</button></div>' +
      '</div>' +
      '<div class="summary-grid">' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Total Students</span><span class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></div><div class="stat-value">1,284</div><div class="stat-foot">+12 this month</div></div>' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Total Teachers</span><span class="stat-icon sky"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span></div><div class="stat-value">48</div><div class="stat-foot">+2 this quarter</div></div>' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Monthly Revenue</span><span class="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v.01M18 14v.01"/></svg></span></div><div class="stat-value">$42,500</div><div class="stat-foot">+8.2% vs last month</div></div>' +
        '<div class="stat"><div class="stat-top"><span class="stat-label">Attendance</span><span class="stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 22v-4M4 4l2.5 2.5M20 20l-2.5-2.5M4 20l2.5-2.5M20 4l-2.5 2.5M2 12h4M22 12h-4"/><circle cx="12" cy="12" r="3"/></svg></span></div><div class="stat-value">94%</div><div class="stat-foot">+1.5% week-over-week</div></div>' +
      '</div>' +
      '<div class="card"><div class="card-header"><div><div class="card-title">Recent Activity</div><div class="card-subtitle">Latest updates from across the academy</div></div></div><div class="card-body"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No recent updates</div><div class="state-sub">Check back later for new activities.</div></div></div></div>';
  }

  function renderStudents() {
    pageContainer.innerHTML = '' +
      '<div class="page-header"><div><h1 class="page-title">Students</h1><p class="page-subtitle">Manage all enrolled students</p></div><div class="page-actions"><button class="btn btn-primary" onclick="window.showToast(\'Student registration form coming soon.\', \'info\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Student</button></div></div>' +
      '<div class="filter-bar"><div class="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="Search students..." oninput="window.showToast(\'Searching...\', \'info\')"></div><select class="select" onchange="window.showToast(\'Filter applied.\', \'info\')"><option value="">All Classes</option><option value="10">Class 10</option><option value="12">Class 12</option></select></div>' +
      '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th class="sortable"><span class="th-inner">Name <span class="sort-ind">▼</span></span></th><th>Class</th><th>Roll No</th><th>Status</th><th>Actions</th></tr></thead><tbody><tr><td><div class="cell-user"><span class="avatar">AK</span><div><div class="u-name">Aarav Kumar</div><div class="u-sub">a.kumar@example.com</div></div></div></td><td>10-A</td><td>101</td><td><span class="badge green">Active</span></td><td><div class="row-actions"><button class="icon-btn-sm" onclick="window.showToast(\'View student details.\', \'info\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="icon-btn-sm" onclick="window.showToast(\'Edit student.\', \'info\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="icon-btn-sm danger" onclick="window.showToast(\'Delete student.\', \'error\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button></div></td></tr></tbody></table></div><div class="pagination"><span>Showing 1-1 of 1</span><div class="pagination-controls"><button disabled>Prev</button><button class="active">1</button><button disabled>Next</button></div></div></div>';
  }

  function renderAdmission() {
    // Delegate to the admission router if available, otherwise fallback.
    if (typeof window.renderAdmissionModule === 'function') {
      window.renderAdmissionModule(pageContainer);
    } else {
      pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Admission Module...</div></div>';
      // Try to load the module dynamically if not already loaded.
      import('./admission/admission-router.js').then(function(module) {
        if (module && typeof module.render === 'function') {
          window.renderAdmissionModule = module.render;
          module.render(pageContainer);
        }
      }).catch(function() {
        pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not found</div><div class="state-sub">The admission module could not be loaded.</div></div>';
      });
    }
  }

  function renderTeachers() {
    pageContainer.innerHTML = '<div class="page-header"><div><h1 class="page-title">Teachers</h1><p class="page-subtitle">Faculty management</p></div></div><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">Coming Soon</div><div class="state-sub">Teacher management will be available shortly.</div></div>';
  }

  function renderFees() {
    pageContainer.innerHTML = '<div class="page-header"><div><h1 class="page-title">Fee Management</h1><p class="page-subtitle">Track payments and dues</p></div></div><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v.01M18 14v.01"/></svg><div class="state-title">Fee Module in Development</div><div class="state-sub">Please check back later.</div></div>';
  }

  function renderSalary() {
    pageContainer.innerHTML = '<div class="page-header"><div><h1 class="page-title">Salary</h1><p class="page-subtitle">Staff payroll management</p></div></div><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><div class="state-title">Salary Module Pending</div><div class="state-sub">Will be activated in the next release.</div></div>';
  }

  function renderReceipts() {
    pageContainer.innerHTML = '<div class="page-header"><div><h1 class="page-title">Receipts</h1><p class="page-subtitle">Transaction history and receipts</p></div></div><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="14" y2="14"/></svg><div class="state-title">No Receipts Found</div><div class="state-sub">Generate a new receipt from the Admission section.</div></div>';
  }

  function renderAttendance() {
    pageContainer.innerHTML = '<div class="page-header"><div><h1 class="page-title">Attendance</h1><p class="page-subtitle">Daily attendance tracking</p></div></div><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 22v-4M4 4l2.5 2.5M20 20l-2.5-2.5M4 20l2.5-2.5M20 4l-2.5 2.5M2 12h4M22 12h-4"/><circle cx="12" cy="12" r="3"/></svg><div class="state-title">Attendance System In Progress</div><div class="state-sub">Will include check-in/check-out and reports.</div></div>';
  }

  function renderAdministration() {
    pageContainer.innerHTML = '<div class="page-header"><div><h1 class="page-title">Administration</h1><p class="page-subtitle">System settings and user management</p></div></div><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 22v-4M4 4l2.5 2.5M20 20l-2.5-2.5M4 20l2.5-2.5M20 4l-2.5 2.5M2 12h4M22 12h-4"/><circle cx="12" cy="12" r="3"/></svg><div class="state-title">Admin Panel Coming Soon</div><div class="state-sub">Manage users, roles, and academy settings.</div></div>';
  }

  // ---- Navigation Event Listeners ----
  navItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var route = this.getAttribute('data-route');
      if (route) {
        window.location.hash = route;
        navigate(route);
      }
    });
  });

  // ---- Hash Change Listener ----
  window.addEventListener('hashchange', function() {
    var hash = window.location.hash.replace('#/', '') || 'dashboard';
    navigate(hash);
  });

  // ---- Bootstrap ----
  document.addEventListener('DOMContentLoaded', function() {
    var initialRoute = window.location.hash.replace('#/', '') || 'dashboard';
    navigate(initialRoute);
  });

})();
