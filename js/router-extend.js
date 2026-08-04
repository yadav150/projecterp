// Route extensions – add new modules without editing app.js
import { AttendanceView } from "./views/attendance.js";
import { ReportsView } from "./views/reports.js";
import { ImportExportView } from "./views/import-export.js";
import { IDCardView } from "./views/id-card.js";

export function extendRoutes() {
  if (window.__routes) {
    // Existing route
    window.__routes.attendance = () => AttendanceView();
    // New routes
    window.__routes.reports = () => ReportsView();
    window.__routes["import-export"] = () => ImportExportView();
    window.__routes["id-card"] = () => IDCardView();
  } else {
    window.__pendingRoutes = window.__pendingRoutes || {};
    window.__pendingRoutes.attendance = () => AttendanceView();
    window.__pendingRoutes.reports = () => ReportsView();
    window.__pendingRoutes["import-export"] = () => ImportExportView();
    window.__pendingRoutes["id-card"] = () => IDCardView();
  }
}

// Auto-run
extendRoutes();
