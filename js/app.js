console.log("app.js loaded – minimal version");

import { firebaseHealthCheck } from "./firebase.js";
import { DashboardView } from "./views/dashboard.js";

const page = document.getElementById("page");
const navItems = () => Array.from(document.querySelectorAll(".nav-item"));

// Simple routes – only dashboard for now
const routes = {
  dashboard: () => DashboardView()
};

function parseHash() {
  const raw = (location.hash || "#/dashboard").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  return { route: parts[0] || "dashboard", id: parts[1] || null };
}

function render() {
  try {
    const { route, id } = parseHash();
    navItems().forEach(a => a.classList.toggle("active", a.dataset.route === route));
    const factory = routes[route] || routes.dashboard;
    const prev = page.firstChild;
    if (prev) prev.dispatchEvent(new CustomEvent("view:unmount"));
    page.innerHTML = "";
    const node = factory({ id });
    page.appendChild(node);
    document.getElementById("sidebar").classList.remove("open");
  } catch (e) {
    console.error("Render error:", e);
    page.innerHTML = `<div style="padding:40px;color:red;">Error: ${e.message}</div>`;
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.hash = "#/dashboard";
  render();

  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  firebaseHealthCheck().then(ok => {
    const statusEl = document.querySelector(".fw-status");
    const txt = document.getElementById("fw-status-text");
    if (ok) { statusEl.classList.add("online"); txt.textContent = "Connected"; }
    else { statusEl.classList.add("error"); txt.textContent = "Error"; }
  });
});

if (document.readyState !== "loading") {
  window.dispatchEvent(new Event("DOMContentLoaded"));
}
