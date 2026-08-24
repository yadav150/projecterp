// Authentication Guard – Checks session and redirects to login if needed
(function() {
  'use strict';

  // ----- Configuration -----
  const LOGIN_PAGE = 'admin.html';
  const SESSION_KEY = 'erp_session';
  const USER_ID_KEY = 'erp_user_id';
  const LOGIN_TIME_KEY = 'erp_login_time';
  const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

  // ----- DOM Elements -----
  const guardContainer = document.createElement('div');
  guardContainer.id = 'auth-guard';
  guardContainer.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: opacity 0.6s ease, visibility 0.6s ease;
    opacity: 1;
    visibility: visible;
    flex-direction: column;
    gap: 24px;
  `;

  const spinnerWrapper = document.createElement('div');
  spinnerWrapper.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: auth-spin 0.85s linear infinite;
  `;

  const spinnerText = document.createElement('div');
  spinnerText.textContent = 'Verifying session ...';
  spinnerText.style.cssText = `
    color: #ffffff;
    font-size: 15px;
    font-weight: 500;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    letter-spacing: 0.02em;
  `;

  // Add spin keyframe
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes auth-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);

  spinnerWrapper.appendChild(spinner);
  spinnerWrapper.appendChild(spinnerText);
  guardContainer.appendChild(spinnerWrapper);
  document.body.prepend(guardContainer);

  // ----- Helper: Hide guard with smooth fade -----
  function hideGuard() {
    guardContainer.style.opacity = '0';
    guardContainer.style.visibility = 'hidden';
    setTimeout(() => {
      if (guardContainer.parentNode) {
        guardContainer.parentNode.removeChild(guardContainer);
      }
    }, 700);
  }

  // ----- Helper: Redirect to login -----
  function redirectToLogin() {
    // Clear any stale session data
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
    sessionStorage.removeItem(LOGIN_TIME_KEY);

    // Update spinner text
    spinnerText.textContent = 'Redirecting to login ...';

    setTimeout(function() {
      window.location.href = LOGIN_PAGE;
    }, 600);
  }

  // ----- Check session validity -----
  function isSessionValid() {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session !== 'authenticated') return false;

    const loginTime = parseInt(sessionStorage.getItem(LOGIN_TIME_KEY), 10);
    if (isNaN(loginTime)) return false;

    const elapsed = Date.now() - loginTime;
    if (elapsed > SESSION_TIMEOUT_MS) return false;

    return true;
  }

  // ----- Main auth check -----
  function checkAuth() {
    // Check session storage first (fast path)
    if (isSessionValid()) {
      // Session is valid – allow access
      hideGuard();
      return;
    }

    // ----- If Firebase is available, verify with Firebase Auth -----
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const auth = firebase.auth();

      // Wait for Firebase auth state to resolve
      const unsubscribe = auth.onAuthStateChanged(function(user) {
        unsubscribe();

        if (user) {
          // User is authenticated with Firebase – store session
          sessionStorage.setItem(SESSION_KEY, 'authenticated');
          sessionStorage.setItem(USER_ID_KEY, user.uid);
          sessionStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
          hideGuard();
        } else {
          // Not authenticated – redirect to login
          redirectToLogin();
        }
      }, function(error) {
        // Error checking auth – treat as unauthenticated
        console.warn('Auth guard: error checking Firebase auth', error);
        redirectToLogin();
      });

      // Safety timeout: if Firebase auth doesn't respond within 5 seconds, redirect
      setTimeout(function() {
        // If guard is still visible, assume auth is stuck and redirect
        if (guardContainer.style.visibility !== 'hidden') {
          console.warn('Auth guard: Firebase auth timeout – redirecting to login');
          redirectToLogin();
        }
      }, 5000);

      return;
    }

    // ----- No Firebase available – fallback to session only -----
    // If session is invalid or missing, redirect
    redirectToLogin();
  }

  // ----- Run check after a tiny delay to let Firebase load -----
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(checkAuth, 50);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(checkAuth, 50);
    });
  }

  // ----- Expose for debugging -----
  window.__authGuard = {
    checkAuth: checkAuth,
    hideGuard: hideGuard,
    redirectToLogin: redirectToLogin,
    isSessionValid: isSessionValid
  };

  console.log('Auth guard active.');

})();
