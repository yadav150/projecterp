// App entry: router + view lifecycle
import { firebaseHealthCheck } from "./firebase.js";
import { DashboardView } from "./views/dashboard.js";
import { StudentsView } from "./views/students.js";
import { AdmissionView } from "./views/admission.js";
import { TeachersView } from "./views/teachers.js";
import { FeesView } from "./views/fees.js";
import { SalaryView } from "./views/salary.js";
import { ReceiptsView } from "./views/receipts.js";

// ---------- Route Definitions ----------
const routes = {
  dashboard: () => DashboardView(),
  students: (p) => StudentsView(p),
  admission: () => AdmissionView(),
  teachers: (p) => TeachersView(p),
  fees: () => FeesView(),
  salary: () => SalaryView(),
  receipts: () => ReceiptsView()
};

const page = document.getElementById("page");
const navItems = () => Array.from(document.querySelectorAll(".nav-item"));

// ---------- Hash Parsing ----------
function parseHash() {
  const raw = (location.hash || "#/dashboard").replace(/^#\/?/, "");
  const [pathRaw] = raw.split("?");
  const parts = pathRaw.split("/").filter(Boolean);
  return { route: parts[0] || "dashboard", id: parts[1] || null };
}

// ---------- Render Function ----------
function render() {
  const { route, id } = parseHash();

  // Highlight active nav item
  navItems().forEach(a => a.classList.toggle("active", a.dataset.route === route));

  const factory = routes[route] || routes.dashboard;

  // Unmount previous view
  const prev = page.firstChild;
  if (prev) prev.dispatchEvent(new CustomEvent("view:unmount"));

  // Mount new view
  page.innerHTML = "";
  const node = factory({ id });
  page.appendChild(node);

  // Close sidebar on mobile after navigation
  document.getElementById("sidebar").classList.remove("open");
}

// ---------- Event Listeners ----------
window.addEventListener("hashchange", render);

window.addEventListener("DOMContentLoaded", () => {
  // Set default hash if none
  if (!location.hash) location.hash = "#/dashboard";

  // Initial render
  render();

  // Mobile menu toggle (simple fallback – toggle.js overrides with capture phase)
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // Firebase connection status
  firebaseHealthCheck()
    .then(ok => {
      const statusEl = document.querySelector(".fw-status");
      const txt = document.getElementById("fw-status-text");
      if (ok) {
        statusEl.classList.add("online");
        statusEl.classList.remove("error");
        txt.textContent = "Connected to Firebase";
      } else {
        statusEl.classList.add("error");
        statusEl.classList.remove("online");
        txt.textContent = "Firebase unreachable";
      }
    })
    .catch(() => {
      const statusEl = document.querySelector(".fw-status");
      const txt = document.getElementById("fw-status-text");
      statusEl.classList.add("error");
      statusEl.classList.remove("online");
      txt.textContent = "Firebase unreachable";
    });
});

// Kick off if DOMContentLoaded already fired (e.g., when loaded via module)
if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
