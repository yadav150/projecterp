// Extension for app.js routes – no modifications to app.js needed
import { AttendanceView } from "./views/attendance.js";

// This function adds the attendance route if the routes object is available.
export function extendRoutes() {
  if (window.__routes) {
    window.__routes.attendance = () => AttendanceView();
    console.log("Attendance route added successfully");
  } else {
    // Store for later if routes not yet defined
    window.__pendingRoutes = window.__pendingRoutes || {};
    window.__pendingRoutes.attendance = () => AttendanceView();
    console.warn("__routes not ready, stored in pending");
  }
}

// Immediate addition if routes already exist.
if (window.__routes) {
  window.__routes.attendance = () => AttendanceView();
  console.log("Attendance route added (immediate)");
} else {
  // Store pending and watch for routes to become available.
  window.__pendingRoutes = window.__pendingRoutes || {};
  window.__pendingRoutes.attendance = () => AttendanceView();

  const checkRoutes = setInterval(() => {
    if (window.__routes) {
      // Apply all pending routes.
      if (window.__pendingRoutes) {
        Object.entries(window.__pendingRoutes).forEach(([key, factory]) => {
          if (!window.__routes[key]) {
            window.__routes[key] = factory;
            console.log(key + " route added from pending");
          }
        });
        window.__pendingRoutes = {};
      }
      clearInterval(checkRoutes);
    }
  }, 100);
}

// Auto-run when this module loads.
extendRoutes();
