// App entry: router + view lifecycle
import { firebaseHealthCheck, db, dbRef, onValue } from "./firebase.js";
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

  // Real-time Firebase connection status
  const statusEl = document.querySelector(".fw-status");
  const txt = document.getElementById("fw-status-text");
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
});

if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
