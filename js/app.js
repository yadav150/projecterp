// Minimal app.js – static content only
console.log("app.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("page");
  if (page) {
    page.innerHTML = `
      <div style="padding:40px;text-align:center;font-family:sans-serif;">
        <h1>Janaki Professional Academy ERP</h1>
        <p>App is running. Static test successful.</p>
        <p style="font-size:12px;color:#64748b;">If you see this, JavaScript is working.</p>
      </div>
    `;
  } else {
    console.error("Element #page not found");
  }

  // Update status
  const statusEl = document.querySelector(".fw-status");
  const txt = document.getElementById("fw-status-text");
  if (statusEl && txt) {
    statusEl.classList.add("online");
    txt.textContent = "Static mode";
  }

  // Sidebar toggle
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
});
