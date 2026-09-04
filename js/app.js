// js/app.js
(function() {
  'use strict';

  var pageContainer = document.getElementById('page');
  var navItems = document.querySelectorAll('.nav-item');
  var crumbs = document.getElementById('crumbs');
  var logoutBtn = document.getElementById('logout-btn');

  // ---- Firebase Auth State ----
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user && logoutBtn) {
        logoutBtn.style.display = 'inline-flex';
      }
    });
  }

  // ---- Global Logout ----
  window.logout = function() {
    if (firebase.auth) {
      firebase.auth().signOut().then(function() {
        window.location.href = 'admin.html';
      });
    } else {
      sessionStorage.clear();
      window.location.href = 'admin.html';
    }
  };

  // ---- Global Toast ----
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

  // ---- Global Modal (kept for other uses, but admission form uses full page) ----
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

    renderPage(page);
  }

  function renderPage(page) {
    // Check for sub-routes
    if (page === 'admission') {
      // Check for new/edit sub-route via hash
      var hash = window.location.hash;
      if (hash.includes('/new')) {
        renderAdmissionForm('new');
        return;
      } else if (hash.includes('/edit/')) {
        var id = hash.split('/edit/')[1];
        if (id) {
          renderAdmissionForm('edit', id);
          return;
        }
      }
      // Default: show admission list
      renderAdmission();
      return;
    }

    switch (page) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'students':
        renderStudents();
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

  // ---- Dashboard ----
  function renderDashboard() {
    var db = window.db;
    if (!db) {
      pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Firebase...</div></div>';
      return;
    }

    pageContainer.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Overview of Janaki Professional Academy</p></div>
        <div class="page-actions"><button class="btn btn-outline" onclick="window.showToast('Refreshing...', 'info')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refresh</button></div>
      </div>
      <div class="summary-grid" id="summary-grid">
        <div class="stat"><div class="stat-top"><span class="stat-label">Total Students</span><span class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></div><div class="stat-value" id="stat-students">--</div><div class="stat-foot">Loading...</div></div>
        <div class="stat"><div class="stat-top"><span class="stat-label">Total Admissions</span><span class="stat-icon sky"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></span></div><div class="stat-value" id="stat-admissions">--</div><div class="stat-foot">Total records</div></div>
        <div class="stat"><div class="stat-top"><span class="stat-label">Enrolled</span><span class="stat-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span></div><div class="stat-value" id="stat-enrolled">--</div><div class="stat-foot">Active students</div></div>
        <div class="stat"><div class="stat-top"><span class="stat-label">Pending</span><span class="stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span></div><div class="stat-value" id="stat-pending">--</div><div class="stat-foot">Awaiting confirmation</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Recent Admissions</div><div class="card-subtitle">Latest enrolled students</div></div></div>
        <div class="card-body"><div id="recent-admissions">Loading...</div></div>
      </div>
    `;

    db.ref('admissions').once('value').then(function(snapshot) {
      var total = snapshot.numChildren();
      var enrolled = 0, pending = 0;
      snapshot.forEach(function(child) {
        var data = child.val();
        if (data.status === 'Submitted') enrolled++;
        else pending++;
      });
      document.getElementById('stat-admissions').textContent = total;
      document.getElementById('stat-enrolled').textContent = enrolled;
      document.getElementById('stat-pending').textContent = pending;
      document.getElementById('stat-students').textContent = total;
    }).catch(function() {
      document.getElementById('stat-admissions').textContent = 'Error';
    });

    db.ref('admissions').orderByChild('submittedAt').limitToLast(5).once('value').then(function(snapshot) {
      var html = '';
      if (!snapshot.exists()) {
        html = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No admissions yet</div></div>';
      } else {
        var items = [];
        snapshot.forEach(function(child) {
          var data = child.val();
          data.id = child.key;
          items.push(data);
        });
        items.reverse();
        html = '<ul style="list-style:none;padding:0;margin:0;">';
        items.forEach(function(item) {
          var name = (item.student && item.student.name) || 'Unknown';
          var cls = (item.student && item.student.class) || 'N/A';
          html += '<li style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);"><span><strong>' + name + '</strong> - ' + cls + '</span><span class="badge green">Submitted</span></li>';
        });
        html += '</ul>';
      }
      document.getElementById('recent-admissions').innerHTML = html;
    });
  }

  // ---- Students ----
  function renderStudents() {
    pageContainer.innerHTML = '' +
      '<div class="page-header"><div><h1 class="page-title">Students</h1><p class="page-subtitle">Manage all enrolled students</p></div></div>' +
      '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr><th>Enrollment ID</th><th>Name</th><th>Class</th><th>Roll</th><th>Status</th></tr></thead><tbody id="students-body"><tr><td colspan="5"><div class="state"><div class="spinner"></div></div></td></tr></tbody></table></div></div>';

    var db = window.db;
    if (!db) return;

    db.ref('students').once('value').then(function(snapshot) {
      var tbody = document.getElementById('students-body');
      if (!snapshot.exists()) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="state-title">No students found</div></div></td></tr>';
        return;
      }
      var html = '';
      var items = [];
      snapshot.forEach(function(child) {
        var data = child.val();
        data.id = child.key;
        items.push(data);
      });
      items.sort(function(a, b) { return (a.enrollmentId || '').localeCompare(b.enrollmentId || ''); });
      items.forEach(function(data) {
        html += '<tr><td><strong>' + (data.enrollmentId || '—') + '</strong></td><td>' + (data.name || 'N/A') + '</td><td>' + (data.class || 'N/A') + '</td><td>' + (data.rollNumber || '—') + '</td><td><span class="badge green">Active</span></td></tr>';
      });
      tbody.innerHTML = html;
    });
  }

  // ---- Admission List ----
  function renderAdmission() {
    import('./admission/admission-router.js').then(function(module) {
      if (module && typeof module.render === 'function') {
        module.render(pageContainer);
      }
    }).catch(function(error) {
      console.error('Admission module load error:', error);
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not loaded</div><div class="state-sub">' + error.message + '</div></div>';
    });
  }

  // ---- Admission Form (full page) ----
  function renderAdmissionForm(mode, id) {
    import('./admission/admission-router.js').then(function(module) {
      if (module && typeof module.renderForm === 'function') {
        module.renderForm(pageContainer, mode, id);
      } else {
        pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Admission Form...</div></div>';
        // Fallback: wait for module to define renderForm
        setTimeout(function() {
          if (window.admissionModule && typeof window.admissionModule.renderForm === 'function') {
            window.admissionModule.renderForm(pageContainer, mode, id);
          } else {
            pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Form not available</div></div>';
          }
        }, 500);
      }
    }).catch(function(error) {
      console.error('Form load error:', error);
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Error loading form</div></div>';
    });
  }

  // ---- Other modules (lazy load) ----
  function renderTeachers() {
    pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Teachers Module...</div></div>';
    import('./teachers.js').then(function(module) {
      if (module && typeof module.render === 'function') {
        module.render(pageContainer);
      }
    }).catch(function() {
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not loaded</div></div>';
    });
  }

  function renderFees() {
    pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Fee Module...</div></div>';
    import('./fees.js').then(function(module) {
      if (module && typeof module.render === 'function') {
        module.render(pageContainer);
      }
    }).catch(function() {
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not loaded</div></div>';
    });
  }

  function renderSalary() {
    pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Salary Module...</div></div>';
    import('./salary.js').then(function(module) {
      if (module && typeof module.render === 'function') {
        module.render(pageContainer);
      }
    }).catch(function() {
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not loaded</div></div>';
    });
  }

  function renderReceipts() {
    pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Receipts Module...</div></div>';
    import('./receipts.js').then(function(module) {
      if (module && typeof module.render === 'function') {
        module.render(pageContainer);
      }
    }).catch(function() {
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not loaded</div></div>';
    });
  }

  function renderAttendance() {
    pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Attendance Module...</div></div>';
    import('./attendance.js').then(function(module) {
      if (module && typeof module.render === 'function') {
        module.render(pageContainer);
      }
    }).catch(function() {
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not loaded</div></div>';
    });
  }

  function renderAdministration() {
    pageContainer.innerHTML = '<div class="state"><div class="spinner"></div><div class="state-title">Loading Administration Module...</div></div>';
    import('./administration.js').then(function(module) {
      if (module && typeof module.render === 'function') {
        module.render(pageContainer);
      }
    }).catch(function() {
      pageContainer.innerHTML = '<div class="state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div class="state-title">Module not loaded</div></div>';
    });
  }

  // ---- Navigation ----
  navItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      var route = this.getAttribute('data-route');
      if (route) {
        if (route === 'admission') {
          window.location.hash = 'admission';
        } else {
          window.location.hash = route;
        }
        navigate(route);
      }
    });
  });

  window.addEventListener('hashchange', function() {
    var hash = window.location.hash.replace('#/', '');
    if (!hash) hash = 'dashboard';
    // Handle sub-routes
    if (hash.startsWith('admission')) {
      navigate('admission');
    } else {
      navigate(hash);
    }
  });

  // ---- Bootstrap ----
  document.addEventListener('DOMContentLoaded', function() {
    var initialRoute = window.location.hash.replace('#/', '') || 'dashboard';
    if (initialRoute.startsWith('admission')) {
      navigate('admission');
    } else {
      navigate(initialRoute);
    }
  });
})();
