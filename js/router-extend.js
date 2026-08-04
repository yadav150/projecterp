// Extension for app.js routes – no modifications to app.js needed
import { AttendanceView } from "./views/attendance.js";

// Get the routes object from app.js via the global window object
// We'll expose routes as a global from app.js

// This function will be called after app.js loads
export function extendRoutes() {
  if (window.__routes) {
    window.__routes.attendance = () => AttendanceView();
  } else {
    // Fallback: store routes to be applied later
    window.__pendingRoutes = window.__pendingRoutes || {};
    window.__pendingRoutes.attendance = () => AttendanceView();
  }
}

// Auto-run when this module loads
extendRoutes();
