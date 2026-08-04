// app.js – Dynamic imports with error handling
console.log("app.js starting...");

import { firebaseHealthCheck } from "./firebase.js";

const page = document.getElementById("page");
const navItems = () => Array.from(document.querySelectorAll(".nav-item"));

// Show loading state
page.innerHTML = `<div class="state"><div class="spinner"></div><div class="state-sub">Loading application...</div></div>`;

// Define routes dynamically
const routes = window.__routes = {};
const errors = [];

// List of all view modules
const viewModules = [
  { name: 'dashboard', path: './views/dashboard.js' },
  { name: 'students', path: './views/students.js' },
  { name: 'admission', path: './views/admission.js' },
  { name: 'teachers', path: './views/teachers.js' },
  { name: 'fees', path: './views/fees.js' },
  { name: 'salary', path: './views/salary.js' },
  { name: 'receipts', path: './views/receipts.js' }
];

// Load all views
async function loadViews() {
  for (const { name, path } of viewModules) {
    try {
      const module = await import(path);
      const viewName = name.charAt(0).toUpperCase() + name.slice(1) + 'View';
      const viewFn = module[viewName] || module.default;
      if (typeof viewFn === 'function') {
        routes[name] = (p) => viewFn(p);
        console.log(`✅ ${name} loaded`);
      } else {
        errors.push(`View "${name}" does not export a function`);
        console.error(`❌ ${name}: no export`);
      }
    } catch (e) {
      errors.push(`Failed to load "${name}": ${e.message}`);
      console.error(`❌ ${name}:`, e);
    }
  }
  // After loading, if there are errors, display them
  if (errors.length) {
    page.innerHTML = `<div class="state"><div class="state-title">Some views failed to load</div><div class="state-sub">${errors.join('<br>')}</div></div>`;
  } else {
    // No errors, proceed to render
    if (!location.hash) location.hash = "#/dashboard";
    render();
  }
}

function parseHash() {
  const raw = (location.hash || "#/dashboard").replace(/^#\/?/, "");
  const [pathRaw] = raw.split("?");
  const parts = pathRaw.split("/").filter(Boolean);
  return { route: parts[0] || "dashboard", id: parts[1] || null };
}

function render() {
  try {
    const { route, id } = parseHash();
    navItems().forEach(a => a.classList.toggle("active", a.dataset.route === route));
    const factory = routes[route] || routes.dashboard;
    if (!factory) {
      page.innerHTML = `<div class="state"><div class="state-title">Route not found</div><div class="state-sub">${route}</div></div>`;
      return;
    }
    const prev = page.firstChild;
    if (prev) prev.dispatchEvent(new CustomEvent("view:unmount"));
    page.innerHTML = "";
    const node = factory({ id });
    page.appendChild(node);
    document.getElementById("sidebar").classList.remove("open");
  } catch (e) {
    page.innerHTML = `<div class="state"><div class="state-title">Render error</div><div class="state-sub">${e.message}</div></div>`;
  }
}

window.addEventListener("hashchange", render);

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  // Sidebar toggle
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // Firebase connection status
  const statusEl = document.querySelector(".fw-status");
  const txt = document.getElementById("fw-status-text");
  if (statusEl && txt) {
    statusEl.classList.remove("online", "error");
    txt.textContent = "Connecting…";
    firebaseHealthCheck().then(ok => {
      if (ok) {
        statusEl.classList.add("online");
        txt.textContent = "Connected to Firebase";
      } else {
        statusEl.classList.add("error");
        txt.textContent = "Firebase unreachable";
      }
    });
  }

  // Load views after DOM ready
  loadViews();
});

if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
