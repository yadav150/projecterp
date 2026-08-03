// Admission view — Application form + printable output
import { el, ICON, SCHOOL, fmtDate, ageFromDob, initials } from "../utils.js";
import { setCrumbs, openModal, toast, loadingState } from "../ui.js";
import { openStudentForm, studentFormFields, validateStudent } from "./students.js";
import { createStudent, getStudent } from "../data.js";
import { printNode } from "../pdf.js";

export function AdmissionView() {
  setCrumbs([{ label: "Admission" }]);
  const page = el("div", { "data-testid": "admission-view" });
  const hashQuery = location.hash.split("?")[1] || "";
  const params = new URLSearchParams(hashQuery);
  const preselectId = params.get("id");

  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Student Admission" }),
      el("p", { class: "page-subtitle", text: "Fill the admission form. IDs are auto-generated on submit." })
    ])
  ]));

  const preview = el("div", { "data-testid": "admission-preview" });

  if (preselectId) {
    preview.appendChild(loadingState("Loading admission form…"));
    getStudent(preselectId).then(r => {
      preview.innerHTML = "";
      if (r) preview.appendChild(admissionFormRender(r));
      else preview.appendChild(el("div", { class: "state", text: "Student not found" }));
    });
    page.appendChild(preview);
    return page;
  }

  const formCard = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("div", {}, [
        el("div", { class: "card-title", text: "New Admission Form" }),
        el("div", { class: "card-subtitle", text: "Admission ID and Admission Number are automatically generated on submit." })
      ])
    ])
  ]);
  const formBody = el("div", { class: "card-body" });
  const fields = studentFormFields({});
  formBody.appendChild(fields.node);
  const actions = el("div", { class: "form-actions" }, [
    el("button", { class: "btn btn-outline", text: "Reset", onclick: () => location.reload() }),
    el("button", { class: "btn btn-primary", "data-testid": "submit-admission-btn", html: `${ICON.check}<span>Submit Admission</span>` })
  ]);
  formBody.appendChild(actions);
  formCard.appendChild(formBody);
  page.appendChild(formCard);
  page.appendChild(preview);

  const submitBtn = actions.querySelector("[data-testid=submit-admission-btn]");
  submitBtn.addEventListener("click", async () => {
    const data = fields.getValue();
    const err = validateStudent(data);
    if (err) { toast({ type: "error", title: "Validation error", message: err }); return; }
    submitBtn.disabled = true; submitBtn.textContent = "Submitting…";
    try {
      const created = await createStudent(data, fields.getPhoto());
      toast({ type: "success", title: "Admission successful", message: `Admission #${created.admissionNumber}` });
      preview.innerHTML = "";
      preview.appendChild(admissionFormRender(created));
      preview.scrollIntoView({ behavior: "smooth", block: "start" });
      formCard.style.display = "none";
    } catch (e) {
      console.error(e);
      toast({ type: "error", title: "Submission failed", message: e.message || "Please try again." });
      submitBtn.disabled = false; submitBtn.textContent = "Submit Admission";
    }
  });

  return page;
}

function admissionFormRender(r) {
  const wrap = el("div");

  // Actions: Print only
  const actions = el("div", { class: "page-actions", style: "justify-content:flex-end;margin-bottom:12px;" }, [
    el("button", { class: "btn btn-outline", html: `${ICON.print}<span>Print</span>`, onclick: () => printNode(printable) })
  ]);
  wrap.appendChild(actions);

  // Horizontal scroll wrapper for modal preview
  const scrollWrapper = el("div", {
    style: "overflow-x: auto; width: 100%; padding: 4px 0;"
  });

  // --- Print-Optimized Admission Form ---
  const printable = el("div", { 
    class: "admission-print-form", 
    id: "admission-print", 
    "data-testid": "admission-print",
    style: "max-width: 100%;"
  });

  // Add print-specific styles
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    /* Print-optimized admission form styles */
    .admission-print-form {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      color: #111827;
      background: #ffffff;
      padding: 12px 20px 16px 20px;
      max-width: 100%;
    }
    .admission-print-form .print-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .admission-print-form .print-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .admission-print-form .print-brand .logo {
      width: 44px;
      height: 44px;
      background: #4f46e5;
      color: #fff;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .admission-print-form .print-brand .logo svg {
      width: 22px;
      height: 22px;
    }
    .admission-print-form .print-brand .school-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .admission-print-form .print-brand .school-meta {
      font-size: 10px;
      color: #6b7280;
      line-height: 1.3;
    }
    .admission-print-form .print-tag {
      text-align: right;
      flex-shrink: 0;
    }
    .admission-print-form .print-tag h3 {
      margin: 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #4f46e5;
    }
    .admission-print-form .print-tag .r-num {
      font-size: 10.5px;
      color: #6b7280;
      margin-top: 2px;
      line-height: 1.4;
    }
    .admission-print-form .photo-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e5e7eb;
    }
    .admission-print-form .photo-row .avatar-lg {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #eef2ff;
      color: #4f46e5;
      font-weight: 700;
      font-size: 20px;
      display: grid;
      place-items: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .admission-print-form .photo-row .avatar-lg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .admission-print-form .photo-row .student-name {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .admission-print-form .photo-row .student-class {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }
    .admission-print-form .section {
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .admission-print-form .section h4 {
      margin: 0 0 5px 0;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6b7280;
      font-weight: 700;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }
    .admission-print-form .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3px 20px;
      font-size: 12px;
      padding: 4px 0;
    }
    .admission-print-form .info-grid .kv {
      display: flex;
      gap: 4px;
      padding: 2px 0;
      border-bottom: 1px dotted #f3f4f6;
    }
    .admission-print-form .info-grid .k {
      color: #6b7280;
      min-width: 80px;
      font-weight: 500;
      font-size: 10.5px;
    }
    .admission-print-form .info-grid .v {
      color: #111827;
      font-weight: 500;
      font-size: 11.5px;
    }
    .admission-print-form .address-block {
      font-size: 12px;
      color: #111827;
      padding: 4px 0 2px 0;
    }
    .admission-print-form .print-footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .admission-print-form .print-footer .note {
      font-size: 9.5px;
      color: #6b7280;
      max-width: 280px;
      line-height: 1.4;
    }
    .admission-print-form .print-footer .signature {
      text-align: center;
      font-size: 10px;
      color: #6b7280;
    }
    .admission-print-form .print-footer .signature .line {
      width: 140px;
      border-top: 1.5px solid #111827;
      margin: 0 auto 4px auto;
    }

    /* Print-specific overrides */
    @media print {
      .admission-print-form {
        padding: 8px 12px 12px 12px !important;
        margin: 0 auto !important;
        width: 100% !important;
      }
      .admission-print-form .section {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .admission-print-form .info-grid {
        gap: 2px 16px !important;
      }
      .admission-print-form .info-grid .kv {
        padding: 1px 0 !important;
      }
      .admission-print-form .photo-row {
        margin-bottom: 8px !important;
        padding-bottom: 6px !important;
      }
    }
  `;
  printable.appendChild(styleEl);

  // --- Header ---
  printable.appendChild(el("div", { class: "print-header" }, [
    el("div", { class: "print-brand" }, [
      el("div", { class: "logo" }, [
        el("span", { html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` })
      ]),
      el("div", {}, [
        el("div", { class: "school-name", text: SCHOOL.name }),
        el("div", { class: "school-meta", text: SCHOOL.address }),
        el("div", { class: "school-meta", text: `${SCHOOL.phone} · ${SCHOOL.email}` })
      ])
    ]),
    el("div", { class: "print-tag" }, [
      el("h3", { text: "Admission Form" }),
      el("div", { class: "r-num", text: `Adm ID: ${r.admissionId}` }),
      el("div", { class: "r-num", text: `Adm #: ${r.admissionNumber}` }),
      el("div", { class: "r-num", text: `Date: ${fmtDate(r.admissionDate || r.createdAt)}` })
    ])
  ]));

  // --- Photo + Name ---
  printable.appendChild(el("div", { class: "photo-row" }, [
    (() => { 
      const a = el("div", { class: "avatar-lg" }); 
      if (r.photoUrl) a.appendChild(el("img", { src: r.photoUrl, alt: "" })); 
      else a.textContent = initials(r.name || "S"); 
      return a; 
    })(),
    el("div", {}, [
      el("div", { class: "student-name", text: r.name || "—" }),
      el("div", { class: "student-class", text: `${r.class || "—"} · Section ${r.section || "—"} · Roll ${r.rollNumber || "—"}` })
    ])
  ]));

  // Helper for grid items
  const kv = (k, v) => el("div", { class: "kv" }, [
    el("span", { class: "k", text: k }), 
    el("span", { class: "v", text: v || "—" })
  ]);

  // --- Personal Information (2 columns) ---
  printable.appendChild(el("div", { class: "section" }, [
    el("h4", { text: "Personal Information" }),
    el("div", { class: "info-grid" }, [
      kv("Full Name", r.name),
      kv("Gender", r.gender),
      kv("DOB", fmtDate(r.dob)),
      kv("Age", ageFromDob(r.dob)),
      kv("Blood Group", r.bloodGroup),
      kv("Religion", r.religion),
      kv("Category", r.category),
      kv("Previous School", r.previousSchool)
    ])
  ]));

  // --- Academic Details (2 columns) ---
  printable.appendChild(el("div", { class: "section" }, [
    el("h4", { text: "Academic Details" }),
    el("div", { class: "info-grid" }, [
      kv("Class", r.class),
      kv("Section", r.section),
      kv("Roll Number", r.rollNumber),
      kv("Admission Date", fmtDate(r.admissionDate))
    ])
  ]));

  // --- Parents & Contact (2 columns) ---
  printable.appendChild(el("div", { class: "section" }, [
    el("h4", { text: "Parents & Contact" }),
    el("div", { class: "info-grid" }, [
      kv("Father's Name", r.fatherName),
      kv("Mother's Name", r.motherName),
      kv("Guardian", r.guardian),
      kv("Phone", r.phone),
      kv("Emergency", r.emergencyContact),
      kv("Email", r.email)
    ])
  ]));

  // --- Address (full width) ---
  printable.appendChild(el("div", { class: "section" }, [
    el("h4", { text: "Address" }),
    el("div", { class: "address-block", text: r.address || "—" })
  ]));

  // --- Footer with Signature ---
  printable.appendChild(el("div", { class: "print-footer" }, [
    el("div", { class: "note", text: "This is a system-generated admission application. Please retain this copy for your records." }),
    el("div", { class: "signature" }, [
      el("div", { class: "line" }), 
      el("div", { text: "Authorized Signatory" })
    ])
  ]));

  scrollWrapper.appendChild(printable);
  wrap.appendChild(scrollWrapper);
  return wrap;
}
