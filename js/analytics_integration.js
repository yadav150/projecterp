// Standalone Analytics Integration – Safe, Non‑blocking
import { AnalyticsView } from "./views/analytics.js";

(function() {
  // 1. Inject sidebar link
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

  // 2. Render only when route is analytics
  function renderAnalytics() {
    const raw = (location.hash || "#/dashboard").replace(/^#\/?/, "");
    const [pathRaw] = raw.split("?");
    const route = pathRaw.split("/").filter(Boolean)[0] || "dashboard";
    if (route === "analytics") {
      const page = document.getElementById("page");
      if (page) {
        const prev = page.firstChild;
        if (prev) prev.dispatchEvent(new CustomEvent("view:unmount"));
        page.innerHTML = "";
        const node = AnalyticsView();
        page.appendChild(node);
        document.querySelectorAll(".nav-item").forEach(a =>
          a.classList.toggle("active", a.dataset.route === "analytics")
        );
        document.getElementById("sidebar")?.classList.remove("open");
        return true;
      }
    }
    return false;
  }

  // 3. Listen to hash changes (non‑blocking)
  window.addEventListener("hashchange", function() {
    // Let app.js render first, then override if needed
    setTimeout(() => renderAnalytics(), 10);
  });

  // 4. On initial load, if hash is analytics, render it after app.js
  window.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => renderAnalytics(), 50);
  });
})();
