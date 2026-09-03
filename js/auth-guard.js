// Authentication Guard – Checks session and redirects to login if needed
(function() {
  'use strict';

  var LOGIN_PAGE = 'admin.html';
  var SESSION_KEY = 'erp_session';
  var USER_ID_KEY = 'erp_user_id';
  var LOGIN_TIME_KEY = 'erp_login_time';
  var SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;

  // Check session early before rendering the guard
  function isSessionValid() {
    var session = sessionStorage.getItem(SESSION_KEY);
    if (session !== 'authenticated') return false;
    var loginTime = parseInt(sessionStorage.getItem(LOGIN_TIME_KEY), 10);
    if (isNaN(loginTime)) return false;
    var elapsed = Date.now() - loginTime;
    if (elapsed > SESSION_TIMEOUT_MS) return false;
    return true;
  }

  // If session is valid, skip the guard entirely
  if (isSessionValid()) {
    return;
  }

  // ----- Create guard overlay only if session is invalid -----
  var guardContainer = document.createElement('div');
  guardContainer.id = 'auth-guard';
  guardContainer.style.cssText =
    'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:opacity 0.6s ease,visibility 0.6s ease;opacity:1;visibility:visible;flex-direction:column;gap:24px;';

  var spinnerWrapper = document.createElement('div');
  spinnerWrapper.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:16px;';

  var spinner = document.createElement('div');
  spinner.style.cssText =
    'width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#ffffff;border-radius:50%;animation:auth-spin 0.85s linear infinite;';

  var spinnerText = document.createElement('div');
  spinnerText.textContent = 'Verifying session ...';
  spinnerText.style.cssText =
    'color:#ffffff;font-size:15px;font-weight:500;font-family:Inter,system-ui,-apple-system,sans-serif;letter-spacing:0.02em;';

  var styleSheet = document.createElement('style');
  styleSheet.textContent =
    '@keyframes auth-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(styleSheet);

  spinnerWrapper.appendChild(spinner);
  spinnerWrapper.appendChild(spinnerText);
  guardContainer.appendChild(spinnerWrapper);
  document.body.prepend(guardContainer);

  function hideGuard() {
    guardContainer.style.opacity = '0';
    guardContainer.style.visibility = 'hidden';
    setTimeout(function() {
      if (guardContainer.parentNode) {
        guardContainer.parentNode.removeChild(guardContainer);
      }
    }, 700);
  }

  function redirectToLogin() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
    sessionStorage.removeItem(LOGIN_TIME_KEY);
    spinnerText.textContent = 'Redirecting to login ...';
    setTimeout(function() {
      window.location.href = LOGIN_PAGE;
    }, 600);
  }

  // Re-check session (in case it became valid while guard was rendering)
  if (isSessionValid()) {
    hideGuard();
    return;
  }

  // Check with Firebase if available
  if (typeof firebase !== 'undefined' && firebase.auth) {
    var auth = firebase.auth();
    var unsubscribe = auth.onAuthStateChanged(function(user) {
      unsubscribe();
      if (user) {
        // User is signed in – store session and hide guard
        sessionStorage.setItem(SESSION_KEY, 'authenticated');
        sessionStorage.setItem(USER_ID_KEY, user.uid || 'firebase_user');
        sessionStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
        hideGuard();
      } else {
        redirectToLogin();
      }
    });
  } else {
    // Fallback: check session one more time, else redirect
    if (isSessionValid()) {
      hideGuard();
    } else {
      redirectToLogin();
    }
  }
})();
