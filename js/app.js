// App entry with dynamic imports – shows errors for missing views
import { firebaseHealthCheck, db, dbRef, onValue } from "./firebase.js";

const page = document.getElementById("page");
const navItems = () => Array.from(document.querySelectorAll(".nav-item"));

// Show loading state
page.innerHTML = `<div class="state"><div class="spinner"></div><div class="state-sub">Loading application...</div></div>`;

// Define routes using dynamic imports
const routes = window.__routes = {};

// Import views dynamically
const viewModules = {
  dashboard: () => import("./views/dashboard.js"),
  students: () => import("./views/students.js"),
  admission: () => import("./views/admission.js"),
  teachers: () => import("./views/teachers.js"),
  fees: () => import("./views/fees.js"),
  salary: () => import("./views/salary.js"),
  receipts: () => import("./views/receipts.js")
};

// Load all views and build routes
async function loadRoutes() {
  const errors = [];
  for (const [name, importer] of Object.entries(viewModules)) {
    try {
      const module = await importer();
      const viewName = name.charAt(0).toUpperCase() + name.slice(1) + 'View';
      // Try to find the exported view function
      const viewFn = module[viewName] || module.default;
      if (typeof viewFn === 'function') {
        routes[name] = (p) => viewFn(p);
      } else {
        errors.push(`View "${name}" does not export "${viewName}"`);
      }
    } catch (e) {
      errors.push(`Failed to load view "${name}": ${e.message}`);
      console.error(`Error loading ${name}:`, e);
    }
  }
  if (errors.length) {
    page.innerHTML = `<div class="state"><div class="state-title">Error loading views</div><div class="state-sub">${errors.join('<br>')}</div></div>`;
    return false;
  }
  return true;
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
    console.error("Render error:", e);
    page.innerHTML = `<div class="state"><div class="state-title">Render error</div><div class="state-sub">${e.message}</div></div>`;
  }
}

window.addEventListener("hashchange", render);

// Initialize
window.addEventListener("DOMContentLoaded", async () => {
  // Load views first
  const ok = await loadRoutes();
  if (!ok) return;

  // If no hash, set default
  if (!location.hash) location.hash = "#/dashboard";
  render();

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
    try {
      const connectedRef = dbRef(db, ".info/connected");
      onValue(connectedRef, (snap) => {
        const connected = snap.val();
        if (connected === true) {
          statusEl.classList.add("online");
          statusEl.classList.remove("error");
          txt.textContent = "Connected to Firebase";
        } else {
          statusEl.classList.add("error");
          statusEl.classList.remove("online");
          txt.textContent = "Firebase unreachable";
        }
      });
    } catch (e) {
      console.warn("Connection monitor failed:", e);
    }// App entry with dynamic imports – shows errors for missing views
import { firebaseHealthCheck, db, dbRef, onValue } from "./firebase.js";

const page = document.getElementById("page");
const navItems = () => Array.from(document.querySelectorAll(".nav-item"));

// Show loading state
page.innerHTML = `<div class="state"><div class="spinner"></div><div class="state-sub">Loading application...</div></div>`;

// Define routes using dynamic imports
const routes = window.__routes = {};

// Import views dynamically
const viewModules = {
  dashboard: () => import("./views/dashboard.js"),
  students: () => import("./views/students.js"),
  admission: () => import("./views/admission.js"),
  teachers: () => import("./views/teachers.js"),
  fees: () => import("./views/fees.js"),
  salary: () => import("./views/salary.js"),
  receipts: () => import("./views/receipts.js")
};

// Load all views and build routes
async function loadRoutes() {
  const errors = [];
  for (const [name, importer] of Object.entries(viewModules)) {
    try {
      const module = await importer();
      const viewName = name.charAt(0).toUpperCase() + name.slice(1) + 'View';
      // Try to find the exported view function
      const viewFn = module[viewName] || module.default;
      if (typeof viewFn === 'function') {
        routes[name] = (p) => viewFn(p);
      } else {
        errors.push(`View "${name}" does not export "${viewName}"`);
      }
    } catch (e) {
      errors.push(`Failed to load view "${name}": ${e.message}`);
      console.error(`Error loading ${name}:`, e);
    }
  }
  if (errors.length) {
    page.innerHTML = `<div class="state"><div class="state-title">Error loading views</div><div class="state-sub">${errors.join('<br>')}</div></div>`;
    return false;
  }
  return true;
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
    console.error("Render error:", e);
    page.innerHTML = `<div class="state"><div class="state-title">Render error</div><div class="state-sub">${e.message}</div></div>`;
  }
}

window.addEventListener("hashchange", render);

// Initialize
window.addEventListener("DOMContentLoaded", async () => {
  // Load views first
  const ok = await loadRoutes();
  if (!ok) return;

  // If no hash, set default
  if (!location.hash) location.hash = "#/dashboard";
  render();

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
    try {
      const connectedRef = dbRef(db, ".info/connected");
      onValue(connectedRef, (snap) => {
        const connected = snap.val();
        if (connected === true) {
          statusEl.classList.add("online");
          statusEl.classList.remove("error");
          txt.textContent = "Connected to Firebase";
        } else {
          statusEl.classList.add("error");
          statusEl.classList.remove("online");
          txt.textContent = "Firebase unreachable";
        }
      });
    } catch (e) {
      console.warn("Connection monitor failed:", e);
    }
    firebaseHealthCheck().then(ok => {
      if (ok) {
        statusEl.classList.add("online");
        statusEl.classList.remove("error");
        txt.textContent = "Connected to Firebase";
      }
    });
  }
});

if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
    firebaseHealthCheck().then(ok => {
      if (ok) {
        statusEl.classList.add("online");
        statusEl.classList.remove("error");
        txt.textContent = "Connected to Firebase";
      }
    });
  }
});

if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
