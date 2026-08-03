// Standalone Analytics Integration – Non‑blocking, safe
import { AnalyticsView } from "./views/analytics.js";

(function() {
  // ----- 1. Inject sidebar link -----
  const sidebarNav = document.getElementById("sidebar-nav");
  if (sidebarNav) {
    const existingLink = sidebarNav.querySelector('[data-route="analytics"]');
    if (!existingLink) {
      const link = document.createElement("a");
      link.href = "#/analytics";
      link.className = "nav-item";
      link.dataset.route = "analytics";
      link.dataset.testid = "nav-analytics";
      link.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12v-2a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v2"/>
          <circle cx="12" cy="16" r="5"/>
          <path d="M12 11v5"/><path d="M9 16h6"/>
        </svg>
        <span>Analytics</span>
      `;
      sidebarNav.appendChild(link);
    }
  }

  // ----- 2. Parse hash -----
  function parseHash() {
    const raw = (location.hash || "#/dashboard").replace(/^#\/?/, "");
    const [pathRaw] = raw.split("?");
    const parts = pathRaw.split("/").filter(Boolean);
    return { route: parts[0] || "dashboard", id: parts[1] || null };
  }

  // ----- 3. Render Analytics view -----
  function renderAnalytics() {
    const { route } = parseHash();
    if (route === "analytics") {
      const page = document.getElementById("page");
      if (page) {
        // Unmount previous view (if any)
        const prev = page.firstChild;
        if (prev) prev.dispatchEvent(new CustomEvent("view:unmount"));
        page.innerHTML = "";
        const node = AnalyticsView();
        page.appendChild(node);
        // Update active nav
        document.querySelectorAll(".nav-item").forEach(a =>
          a.classList.toggle("active", a.dataset.route === "analytics")
        );
        document.getElementById("sidebar")?.classList.remove("open");
        return true;
      }
    }
    return false;
  }

  // ----- 4. Hash change listener (non‑blocking) -----
  window.addEventListener("hashchange", function() {
    // Let app.js handle the event first, then override for analytics
    setTimeout(() => {
      renderAnalytics();
    }, 10);
  });

  // ----- 5. Initial load (if hash is already analytics) -----
  window.addEventListener("DOMContentLoaded", function() {
    // Wait for app.js to mount the default view, then override if needed
    setTimeout(() => {
      renderAnalytics();
    }, 50);
  });
})();
