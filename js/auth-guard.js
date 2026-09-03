// js/auth-guard.js
(function() {
  'use strict';
  var LOGIN_PAGE = 'admin.html';

  function showGuard() {
    var guard = document.createElement('div');
    guard.id = 'auth-guard';
    guard.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);flex-direction:column;gap:24px;';
    var spinner = document.createElement('div');
    spinner.style.cssText =
      'width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#ffffff;border-radius:50%;animation:auth-spin 0.85s linear infinite;';
    var text = document.createElement('div');
    text.textContent = 'Authenticating ...';
    text.style.cssText =
      'color:#ffffff;font-size:15px;font-weight:500;font-family:Inter,system-ui,-apple-system,sans-serif;letter-spacing:0.02em;';
    var style = document.createElement('style');
    style.textContent = '@keyframes auth-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    guard.appendChild(spinner);
    guard.appendChild(text);
    document.body.prepend(guard);
    return guard;
  }

  function hideGuard(guard) {
    if (!guard) return;
    guard.style.transition = 'opacity 0.5s ease';
    guard.style.opacity = '0';
    setTimeout(function() {
      if (guard.parentNode) guard.parentNode.removeChild(guard);
    }, 500);
  }

  var guardEl = showGuard();

  if (typeof firebase !== 'undefined' && firebase.auth) {
    var unsubscribe = firebase.auth().onAuthStateChanged(function(user) {
      unsubscribe();
      if (user) {
        hideGuard(guardEl);
        document.addEventListener('DOMContentLoaded', function() {
          var dot = document.getElementById('fw-status-dot');
          var text = document.getElementById('fw-status-text');
          if (dot) dot.className = 'dot';
          if (text) text.textContent = 'Online';
        });
      } else {
        window.location.href = LOGIN_PAGE;
      }
    });
  } else {
    var session = sessionStorage.getItem('erp_session');
    if (session === 'authenticated') {
      hideGuard(guardEl);
    } else {
      window.location.href = LOGIN_PAGE;
    }
  }
})();
