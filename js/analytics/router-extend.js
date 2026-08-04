// Extension for app.js routes – add all new routes here
// This file is loaded after app.js and adds routes without modifying app.js

import { AttendanceView } from "../views/attendance.js";
import { AdministrationView } from "../views/administration.js";

export function extendRoutes() {
  if (window.__routes) {
    // Add new routes
    window.__routes.attendance = () => AttendanceView();
    window.__routes.administration = () => AdministrationView();
  } else {
    // Fallback: store pending routes to be applied when app.js loads
    window.__pendingRoutes = window.__pendingRoutes || {};
    window.__pendingRoutes.attendance = () => AttendanceView();
    window.__pendingRoutes.administration = () => AdministrationView();
  }
}

// Auto-run when this module loads
extendRoutes();
