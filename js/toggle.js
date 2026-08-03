// Safe mobile sidebar toggle – independent of app.js
// Uses capturing phase to override the existing listener.
(function() {
  const menuBtn = document.getElementById("menu-btn");
  const sidebar = document.getElementById("sidebar");

  if (!menuBtn || !sidebar) {
    console.warn("Toggle.js: menu-btn or sidebar not found.");
    return;
  }

  // Toggle on hamburger click (capture phase)
  menuBtn.addEventListener("click", function(e) {
    sidebar.classList.toggle("open");
    e.stopImmediatePropagation();
    e.stopPropagation();
  }, true);

  // Close sidebar when clicking outside (mobile only)
  document.addEventListener("click", function(e) {
    if (window.innerWidth < 860 && sidebar.classList.contains("open")) {
      const isClickInsideSidebar = sidebar.contains(e.target);
      const isClickOnMenuBtn = menuBtn.contains(e.target);
      if (!isClickInsideSidebar && !isClickOnMenuBtn) {
        sidebar.classList.remove("open");
      }
    }
  });

  // Close sidebar when resizing to desktop
  window.addEventListener("resize", function() {
    if (window.innerWidth >= 860) {
      sidebar.classList.remove("open");
    }
  });
})();
