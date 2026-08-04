// App entry: router + view lifecycle – with real-time Firebase connection monitor
import { firebaseHealthCheck } from "./firebase.js";
import { db, dbRef, onValue } from "./firebase.js"; // import db and dbRef
import { DashboardView } from "./views/dashboard.js";
import { StudentsView } from "./views/students.js";
import { AdmissionView } from "./views/admission.js";
import { TeachersView } from "./views/teachers.js";
import { FeesView } from "./views/fees.js";
import { SalaryView } from "./views/salary.js";
import { ReceiptsView } from "./views/receipts.js";

const routes = window.__routes = {
  dashboard: () => DashboardView(),
  students: (p) => StudentsView(p),
  admission: () => AdmissionView(),
  teachers: (p) => TeachersView(p),
  fees: () => FeesView(),
  salary: () => SalaryView(),
  receipts: () => ReceiptsView()
};

if (window.__pendingRoutes) {
  Object.assign(routes, window.__pendingRoutes);
  window.__pendingRoutes = null;
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
  const prev = page.firstChild;
  if (prev) prev.dispatchEvent(new CustomEvent("view:unmount"));
  page.innerHTML = "";
  const node = factory({ id });
  page.appendChild(node);
  document.getElementById("sidebar").classList.remove("open");
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.hash = "#/dashboard";
  render();
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  // ---- Real-time Firebase connection monitor ----
  const statusEl = document.querySelector(".fw-status");
  const txt = document.getElementById("fw-status-text");

  // Set initial state
  statusEl.classList.remove("online", "error");
  txt.textContent = "Connecting…";

  // Listen to .info/connected for real-time updates
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

  // Also run the health check once (for extra validation and to create the _meta node if needed)
  firebaseHealthCheck().then(ok => {
    if (ok) {
      statusEl.classList.add("online");
      statusEl.classList.remove("error");
      txt.textContent = "Connected to Firebase";
    }
  });
});

if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
