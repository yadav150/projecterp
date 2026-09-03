// Sidebar toggle for mobile navigation
document.addEventListener("DOMContentLoaded", function() {
  var menuBtn = document.getElementById("menu-btn");
  var sidebar = document.getElementById("sidebar");

  if (menuBtn && sidebar) {
    // Toggle sidebar on menu button click
    menuBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });

    // Close sidebar when a nav item is clicked
    var navItems = sidebar.querySelectorAll(".nav-item");
    navItems.forEach(function(item) {
      item.addEventListener("click", function() {
        sidebar.classList.remove("open");
      });
    });

    // Close sidebar when clicking outside
    document.addEventListener("click", function(e) {
      if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        e.target !== menuBtn &&
        !menuBtn.contains(e.target)
      ) {
        sidebar.classList.remove("open");
      }
    });

    // Close sidebar on escape key
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }
    });
  }
});
