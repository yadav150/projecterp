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

  const printable = el("div", { class: "receipt print-area", id: "admission-print", "data-testid": "admission-print", style: "max-width: 100%;" });
  printable.appendChild(el("div", { class: "receipt-head" }, [
    el("div", { class: "receipt-brand" }, [
      el("div", { class: "logo" }, [el("span", { html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` })]),
      el("div", {}, [
        el("div", { class: "school-name", text: SCHOOL.name }),
        el("div", { class: "school-meta", text: `${SCHOOL.address}` }),
        el("div", { class: "school-meta", text: `${SCHOOL.phone} · ${SCHOOL.email} · ${SCHOOL.website}` })
      ])
    ]),
    el("div", { class: "receipt-tag" }, [
      el("h3", { text: "Admission Form" }),
      el("div", { class: "r-num", text: `Adm ID: ${r.admissionId}` }),
      el("div", { class: "r-num", text: `Adm #: ${r.admissionNumber}` }),
      el("div", { class: "r-num", text: `Date: ${fmtDate(r.admissionDate || r.createdAt)}` })
    ])
  ]));

  const kv = (k, v) => el("div", {}, [el("span", { class: "k", text: k }), el("span", { class: "v", text: v || "—" })]);

  const photoBox = el("div", { style: "display:flex;gap:20px;align-items:flex-start;margin-bottom:18px;" }, [
    (() => { const a = el("div", { class: "avatar lg" }); if (r.photoUrl) a.appendChild(el("img", { src: r.photoUrl })); else a.textContent = initials(r.name); return a; })(),
    el("div", { style: "flex:1" }, [
      el("div", { style: "font-size:18px;font-weight:800;letter-spacing:-0.02em;", text: r.name }),
      el("div", { style: "color:var(--muted);font-size:13px;margin-top:4px;", text: `${r.class || "—"} · Section ${r.section || "—"} · Roll ${r.rollNumber || "—"}` })
    ])
  ]);
  printable.appendChild(photoBox);

  // Force two‑column grid with !important
  const gridStyle = "display: grid; grid-template-columns: repeat(2, 1fr) !important; gap: 8px 24px; font-size: 13px;";

  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Personal Information" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Full Name", r.name), kv("Gender", r.gender),
      kv("DOB", fmtDate(r.dob)), kv("Age", ageFromDob(r.dob)),
      kv("Blood Group", r.bloodGroup), kv("Religion", r.religion),
      kv("Category", r.category), kv("Previous School", r.previousSchool)
    ])
  ]));
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Academic Details" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Class", r.class), kv("Section", r.section),
      kv("Roll Number", r.rollNumber), kv("Admission Date", fmtDate(r.admissionDate))
    ])
  ]));
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Parents & Contact" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Father's Name", r.fatherName), kv("Mother's Name", r.motherName),
      kv("Guardian", r.guardian), kv("Phone", r.phone),
      kv("Emergency", r.emergencyContact), kv("Email", r.email)
    ])
  ]));
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Address" }),
    el("div", { style: "font-size:13px;color:var(--text);", text: r.address || "—" })
  ]));

  printable.appendChild(el("div", { class: "receipt-foot" }, [
    el("div", { class: "note", text: "This is a system-generated admission application. Please retain this copy for your records." }),
    el("div", { class: "sign" }, [el("div", { class: "line" }), el("div", { text: "Authorized Signatory" })])
  ]));

  scrollWrapper.appendChild(printable);
  wrap.appendChild(scrollWrapper);
  return wrap;
}
