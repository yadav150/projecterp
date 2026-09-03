// js/toggle.js
document.addEventListener("DOMContentLoaded", function() {
  var menuBtn = document.getElementById("menu-btn");
  var sidebar = document.getElementById("sidebar");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });

    var navItems = sidebar.querySelectorAll(".nav-item");
    navItems.forEach(function(item) {
      item.addEventListener("click", function() {
        sidebar.classList.remove("open");
      });
    });

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

    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }
    });
  }
});
