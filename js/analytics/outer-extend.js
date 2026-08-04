// Analytics & Administration Route Extensions
// This file adds routes for Reports, Import/Export, and ID Card modules
// without modifying app.js or the existing router-extend.js

import { ReportsView } from "../views/reports.js";
import { ImportExportView } from "../views/import-export.js";
import { IDCardView } from "../views/id-card.js";

/**
 * Extend the global routes object with analytics/administration routes.
 * Checks if window.__routes exists (from app.js) and adds new routes.
 * If app.js hasn't loaded yet, stores routes in a pending queue.
 */
export function extendAnalyticsRoutes() {
  if (window.__routes) {
    // Add routes to existing routes object
    window.__routes.reports = () => ReportsView();
    window.__routes["import-export"] = () => ImportExportView();
    window.__routes["id-card"] = () => IDCardView();
  } else {
    // Store in pending queue if app.js hasn't initialized routes yet
    window.__pendingRoutes = window.__pendingRoutes || {};
    window.__pendingRoutes.reports = () => ReportsView();
    window.__pendingRoutes["import-export"] = () => ImportExportView();
    window.__pendingRoutes["id-card"] = () => IDCardView();
  }
}

// Auto-execute when this module loads
extendAnalyticsRoutes();
