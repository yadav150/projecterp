// Admission module router – separate from main router-extend.js
// This file extends routes specifically for the Admission module

import { AdmissionView } from "./admission.js";

export function extendAdmissionRoutes() {
  if (window.__routes) {
    // Add admission route
    window.__routes.admission = () => AdmissionView();
  } else {
    // Fallback: store pending routes
    window.__pendingRoutes = window.__pendingRoutes || {};
    window.__pendingRoutes.admission = () => AdmissionView();
  }
}

// Auto-run when this module loads
extendAdmissionRoutes();
