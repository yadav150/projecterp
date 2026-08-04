// App entry: router + view lifecycle
import { firebaseHealthCheck } from "./firebase.js";
import { DashboardView } from "./views/dashboard.js";
import { StudentsView } from "./views/students.js";
import { AdmissionView } from "./views/admission.js";
import { TeachersView } from "./views/teachers.js";
import { FeesView } from "./views/fees.js";
import { SalaryView } from "./views/salary.js";
import { ReceiptsView } from "./views/receipts.js";
import { ReportsView } from "./views/reports.js";

const routes = window.__routes = {
  dashboard: () => DashboardView(),
  students: (p) => StudentsView(p),
  admission: () => AdmissionView(),
  teachers: (p) => TeachersView(p),
  fees: () => FeesView(),
  salary: () => SalaryView(),
  receipts: () => ReceiptsView()
};

// Apply any pending routes that were registered before app.js loaded
if (window.__pendingRoutes) {
  Object.assign(routes, window.__pendingRoutes);
  window.__pendingRoutes = null;
}w.__pendingRoutes = null;
}

const page = document.getElementById("page");
const navItems = () => Array.from(document.querySelectorAll(".nav-item"));

function parseHash() {
  const raw = (location.hash || "#/dashboard").replace(/^#\/?/, "");
  const [pathRaw] = raw.split("?");
  const parts = pathRaw.split("/").filter(Boolean);
  return { route: parts[0] || "dashboard", id: parts[1] || null };
}

function render() {
  const { route, id } = parseHash();
  navItems().forEach(a => a.classList.toggle("active", a.dataset.route === route));
  const factory = routes[route] || routes.dashboard;
  // unmount previous
  const prev = page.firstChild;
  if (prev) prev.dispatchEvent(new CustomEvent("view:unmount"));
  page.innerHTML = "";
  const node = factory({ id });
  page.appendChild(node);
  // mobile: close sidebar after nav
  document.getElementById("sidebar").classList.remove("open");
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.hash = "#/dashboard";
  render();
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
  // Firebase status
  firebaseHealthCheck().then(ok => {
    const statusEl = document.querySelector(".fw-status");
    const txt = document.getElementById("fw-status-text");
    if (ok) { statusEl.classList.add("online"); txt.textContent = "Connected to Firebase"; }
    else { statusEl.classList.add("error"); txt.textContent = "Firebase unreachable"; }
  });
});

// Kick off if DOMContentLoaded already fired
if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
