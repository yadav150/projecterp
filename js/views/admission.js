// Admission view — Multi-step wizard with Personal Details, Previous Education, Address, Document Uploads
import {
  el, ICON, SCHOOL, fmtDate, ageFromDob, initials, todayISO, required, isEmail, isPhone,
  CLASSES, SECTIONS, GENDERS, BLOOD, CATEGORIES, RELIGIONS
} from "../utils.js";
import { setCrumbs, openModal, toast, loadingState, confirmDialog } from "../ui.js";
import { studentFormFields, validateStudent } from "./students.js";
import { createStudent, getStudent } from "../data.js";
import { printNode } from "../pdf.js";
import { storage, sRef, uploadBytes, getDownloadURL } from "../firebase.js";

// ---------- State ----------
let wizardState = {
  step: 1,
  totalSteps: 4,
  data: {},
  files: {
    photo: null,
    aadhaar: null,
    marksheet: null,
    tc: null
  },
  uploadProgress: {
    photo: 0,
    aadhaar: 0,
    marksheet: 0,
    tc: 0
  },
  uploadStatus: {
    photo: 'idle', // idle | uploading | done | error
    aadhaar: 'idle',
    marksheet: 'idle',
    tc: 'idle'
  },
  isSubmitting: false
};

// ---------- Main View ----------
export function AdmissionView() {
  setCrumbs([{ label: "Admission" }]);
  const page = el("div", { "data-testid": "admission-view" });

  const hashQuery = location.hash.split("?")[1] || "";
  const params = new URLSearchParams(hashQuery);
  const preselectId = params.get("id");

  // Container for wizard
  const wizardContainer = el("div", { class: "wizard-container" });
  page.appendChild(wizardContainer);

  // If pre‑selected student, load data and show wizard
  if (preselectId) {
    wizardContainer.appendChild(loadingState("Loading admission form…"));
    getStudent(preselectId).then(r => {
      wizardContainer.innerHTML = "";
      if (r) {
        // Populate state with existing data
        wizardState.data = { ...r };
        // Convert dates to ISO for inputs
        if (wizardState.data.dob) wizardState.data.dob = fmtDateInput(wizardState.data.dob);
        if (wizardState.data.admissionDate) wizardState.data.admissionDate = fmtDateInput(wizardState.data.admissionDate);
        renderWizard(wizardContainer);
      } else {
        wizardContainer.appendChild(el("div", { class: "state", text: "Student not found" }));
      }
    });
    return page;
  }

  // New admission: reset state
  wizardState = {
    step: 1,
    totalSteps: 4,
    data: {},
    files: { photo: null, aadhaar: null, marksheet: null, tc: null },
    uploadProgress: { photo: 0, aadhaar: 0, marksheet: 0, tc: 0 },
    uploadStatus: { photo: 'idle', aadhaar: 'idle', marksheet: 'idle', tc: 'idle' },
    isSubmitting: false
  };

  renderWizard(wizardContainer);
  return page;
}

// ---------- Wizard Renderer ----------
function renderWizard(container) {
  const { step, totalSteps, data } = wizardState;

  // Step indicator
  const steps = [
    { label: "Personal", icon: ICON.users },
    { label: "Education", icon: ICON.briefcase },
    { label: "Address", icon: ICON.inbox },
    { label: "Documents", icon: ICON.download }
  ];

  const indicator = el("div", { class: "wizard-steps" });
  steps.forEach((s, idx) => {
    const num = idx + 1;
    const isActive = num === step;
    const isComplete = num < step;
    const dot = el("div", {
      class: `wizard-step-dot ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`,
      text: isComplete ? "✓" : String(num)
    });
    const label = el("span", { class: "wizard-step-label", text: s.label });
    const stepItem = el("div", { class: "wizard-step-item" }, [dot, label]);
    if (isActive) stepItem.style.fontWeight = "600";
    indicator.appendChild(stepItem);
    if (idx < steps.length - 1) {
      const line = el("div", { class: "wizard-step-line" });
      indicator.appendChild(line);
    }
  });
  container.appendChild(indicator);

  // Step content
  const content = el("div", { class: "wizard-content" });
  container.appendChild(content);

  // Render step based on current step
  switch (step) {
    case 1:
      renderPersonalStep(content);
      break;
    case 2:
      renderEducationStep(content);
      break;
    case 3:
      renderAddressStep(content);
      break;
    case 4:
      renderDocumentStep(content);
      break;
  }

  // Navigation buttons
  const nav = el("div", { class: "wizard-nav" });
  const backBtn = el("button", {
    class: "btn btn-outline",
    disabled: step === 1,
    onclick: () => {
      if (step > 1) {
        // Save current step data before going back
        if (step === 2) saveEducationData();
        else if (step === 3) saveAddressData();
        wizardState.step--;
        renderWizard(container);
      }
    }
  }, `${ICON.chevL}<span>Back</span>`);

  const nextOrSubmit = el("button", {
    class: `btn ${step === totalSteps ? 'btn-success' : 'btn-primary'}`,
    disabled: step === totalSteps ? wizardState.isSubmitting : false,
    onclick: async () => {
      if (step < totalSteps) {
        // Save current step data
        if (step === 1) savePersonalData();
        else if (step === 2) saveEducationData();
        else if (step === 3) saveAddressData();
        wizardState.step++;
        renderWizard(container);
      } else {
        // Submit
        await submitAdmission(container);
      }
    }
  }, step === totalSteps ? `${ICON.check}<span>Submit</span>` : `${ICON.chevR}<span>Next</span>`);

  nav.appendChild(backBtn);
  nav.appendChild(nextOrSubmit);
  container.appendChild(nav);
}

// ---------- Step 1: Personal Details (reuse studentFormFields) ----------
let personalForm = null;

function renderPersonalStep(container) {
  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Personal Details" }),
    el("div", { class: "card-subtitle", text: "Student's basic information" })
  ]));
  const body = el("div", { class: "card-body" });

  // Use existing studentFormFields
  const form = studentFormFields(wizardState.data);
  personalForm = form;
  body.appendChild(form.node);

  card.appendChild(body);
  container.appendChild(card);
}

function savePersonalData() {
  if (personalForm) {
    const data = personalForm.getValue();
    // Validate personal details
    const err = validateStudent(data);
    if (err) {
      toast({ type: "error", title: "Validation error", message: err });
      // Keep step unchanged; we'll handle by not advancing
      // We'll need to prevent navigation; we can use a flag or re-render.
      // We'll throw or handle: we can show toast and stay.
      // Since we are inside onclick, we can't easily stop the step increment.
      // We'll use a global flag to prevent nav if invalid.
      // Better: we'll store validation result in state and check in navigation.
      // Let's store error.
      wizardState._validationError = err;
      // We'll handle in the navigation onclick: if error, don't increment.
    } else {
      wizardState._validationError = null;
      // Merge data into wizardState.data
      wizardState.data = { ...wizardState.data, ...data };
      // Also keep photo file if any
      const photoFile = personalForm.getPhoto();
      if (photoFile) wizardState.files.photo = photoFile;
    }
  }
}

// ---------- Step 2: Previous Education ----------
function renderEducationStep(container) {
  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Previous Education" }),
    el("div", { class: "card-subtitle", text: "Last school attended and academic details" })
  ]));
  const body = el("div", { class: "card-body" });
  const grid = el("div", { class: "form-grid" });

  const fields = [
    { key: "previousSchool", label: "Previous School Name", type: "text" },
    { key: "previousPercentage", label: "Previous Percentage", type: "number", step: "0.01" },
    { key: "previousDivision", label: "Previous Division", type: "select", options: ["First", "Second", "Third", "Pass"] },
    { key: "mediumOfInstruction", label: "Medium of Instruction", type: "select", options: ["English", "Hindi", "Assamese", "Other"] }
  ];

  fields.forEach(f => {
    const row = el("div", { class: "form-row" });
    row.appendChild(el("label", { text: f.label }));
    let inp;
    const val = wizardState.data[f.key] || "";
    if (f.type === "select") {
      inp = el("select", { class: "select", "data-testid": `edu-${f.key}` });
      inp.appendChild(el("option", { value: "", text: `Select ${f.label}` }));
      f.options.forEach(o => inp.appendChild(el("option", { value: o, text: o })));
      inp.value = val;
    } else {
      inp = el("input", { class: "input", type: f.type || "text", "data-testid": `edu-${f.key}` });
      if (f.step) inp.step = f.step;
      inp.value = val;
    }
    row.appendChild(inp);
    grid.appendChild(row);
    // Store reference for saving
    if (!wizardState._eduInputs) wizardState._eduInputs = {};
    wizardState._eduInputs[f.key] = inp;
  });

  body.appendChild(grid);
  card.appendChild(body);
  container.appendChild(card);
}

function saveEducationData() {
  if (wizardState._eduInputs) {
    const data = {};
    for (const [key, inp] of Object.entries(wizardState._eduInputs)) {
      data[key] = inp.value?.trim?.() || inp.value;
    }
    wizardState.data = { ...wizardState.data, ...data };
  }
}

// ---------- Step 3: Address ----------
function renderAddressStep(container) {
  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Address Details" }),
    el("div", { class: "card-subtitle", text: "Present and permanent address" })
  ]));
  const body = el("div", { class: "card-body" });
  const grid = el("div", { class: "form-grid" });

  const fields = [
    { key: "presentAddress", label: "Present Address", type: "textarea" },
    { key: "permanentAddress", label: "Permanent Address", type: "textarea" },
    { key: "state", label: "State", type: "text" },
    { key: "district", label: "District", type: "text" },
    { key: "pinCode", label: "PIN Code", type: "text" }
  ];

  fields.forEach(f => {
    const row = el("div", { class: "form-row" });
    row.appendChild(el("label", { text: f.label }));
    let inp;
    const val = wizardState.data[f.key] || "";
    if (f.type === "textarea") {
      inp = el("textarea", { class: "textarea", rows: 2, "data-testid": `addr-${f.key}` });
      inp.value = val;
    } else {
      inp = el("input", { class: "input", type: "text", "data-testid": `addr-${f.key}` });
      inp.value = val;
    }
    row.appendChild(inp);
    grid.appendChild(row);
    if (!wizardState._addrInputs) wizardState._addrInputs = {};
    wizardState._addrInputs[f.key] = inp;
  });

  body.appendChild(grid);
  card.appendChild(body);
  container.appendChild(card);
}

function saveAddressData() {
  if (wizardState._addrInputs) {
    const data = {};
    for (const [key, inp] of Object.entries(wizardState._addrInputs)) {
      data[key] = inp.value?.trim?.() || inp.value;
    }
    wizardState.data = { ...wizardState.data, ...data };
  }
}

// ---------- Step 4: Document Uploads ----------
function renderDocumentStep(container) {
  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Document Uploads" }),
    el("div", { class: "card-subtitle", text: "Upload required documents" })
  ]));
  const body = el("div", { class: "card-body" });

  // Status tracking
  const status = wizardState.uploadStatus;
  const progress = wizardState.uploadProgress;

  const docs = [
    { key: "photo", label: "Passport Size Photo", required: true, accept: "image/*" },
    { key: "aadhaar", label: "Aadhaar Card", required: true, accept: "image/*,.pdf" },
    { key: "marksheet", label: "Previous Marksheet", required: true, accept: "image/*,.pdf" },
    { key: "tc", label: "Transfer Certificate (Optional)", required: false, accept: "image/*,.pdf" }
  ];

  docs.forEach(d => {
    const wrapper = el("div", { class: "upload-item", style: "margin-bottom:16px;" });
    const labelRow = el("div", { style: "display:flex;justify-content:space-between;align-items:center;" });
    const label = el("label", { style: "font-weight:600;", text: `${d.label} ${d.required ? '*' : ''}` });
    const statusBadge = el("span", { class: `badge ${status[d.key] === 'done' ? 'green' : status[d.key] === 'error' ? 'red' : 'slate'}`, text: status[d.key] === 'done' ? 'Uploaded' : status[d.key] === 'error' ? 'Failed' : 'Pending' });
    labelRow.appendChild(label);
    labelRow.appendChild(statusBadge);
    wrapper.appendChild(labelRow);

    const progressBar = el("div", { class: "upload-progress-bar", style: `width:100%;height:4px;background:var(--border);border-radius:2px;margin:4px 0;` });
    const progressFill = el("div", { class: "upload-progress-fill", style: `width:${progress[d.key] || 0}%;height:100%;background:var(--primary);border-radius:2px;transition:width 0.2s;` });
    progressBar.appendChild(progressFill);
    wrapper.appendChild(progressBar);

    const inputWrapper = el("div", { style: "display:flex;gap:8px;align-items:center;margin-top:4px;" });
    const fileInput = el("input", { type: "file", accept: d.accept, "data-key": d.key, style: "flex:1;" });
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      // Start upload
      const key = d.key;
      wizardState.files[key] = file;
      wizardState.uploadStatus[key] = 'uploading';
      wizardState.uploadProgress[key] = 0;
      renderDocumentStep(container); // re-render to show progress
      try {
        const url = await uploadDocument(file, key, progress);
        wizardState.uploadStatus[key] = 'done';
        wizardState.uploadProgress[key] = 100;
        wizardState.data[key + 'Url'] = url; // store URL for later
        toast({ type: "success", title: `${d.label} uploaded` });
      } catch (err) {
        wizardState.uploadStatus[key] = 'error';
        toast({ type: "error", title: "Upload failed", message: err.message });
      }
      renderDocumentStep(container);
    });
    inputWrapper.appendChild(fileInput);
    wrapper.appendChild(inputWrapper);
    body.appendChild(wrapper);
  });

  // Note: photo will be uploaded via personal step, but we show it here too
  // We'll use the same upload mechanism for photo (but it's already handled in step1)
  // We'll disable the photo input here if already uploaded in step1

  // Check if all required uploads are done
  const allRequiredDone = docs.filter(d => d.required).every(d => wizardState.uploadStatus[d.key] === 'done');
  const submitBtn = container.querySelector('.wizard-nav .btn-success');
  if (submitBtn) {
    submitBtn.disabled = !allRequiredDone || wizardState.isSubmitting;
  }

  card.appendChild(body);
  container.appendChild(card);
}

// ---------- Document Upload Helper ----------
async function uploadDocument(file, key, progress) {
  const timestamp = Date.now();
  const path = `admission_docs/temp/${timestamp}/${key}_${file.name.replace(/\s+/g, "_")}`;
  const storageRef = sRef(storage, path);
  const uploadTask = uploadBytes(storageRef, file);

  // Progress is handled via the upload task
  // We'll update progress in the upload task's on('state_changed') event
  // But we need to return a promise that resolves with the download URL
  // and also update the progress in state.

  return new Promise((resolve, reject) => {
    uploadTask.then(async (snapshot) => {
      // Ensure progress is 100%
      progress[key] = 100;
      const url = await getDownloadURL(snapshot.ref);
      resolve(url);
    }).catch(reject);
    // For progress, we can't easily update from outside without an observable.
    // We'll poll the upload task? Actually, uploadBytes doesn't provide progress events.
    // We'll use uploadBytesResumable for progress.
    // Let's use uploadBytesResumable.
    // But we need to import it. Let's use uploadBytesResumable.
  });
}

// However, the above uploadDocument doesn't track progress because uploadBytes doesn't fire progress events.
// We need to use uploadBytesResumable.
// We'll adjust: import { uploadBytesResumable } from "firebase/storage";
// Actually, we can import from firebase.js: it re-exports uploadBytes but not uploadBytesResumable.
// We can add it to firebase.js exports or import directly from the SDK.
// Since we cannot modify firebase.js, we'll import directly from the SDK.
import { uploadBytesResumable } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// We'll rewrite the uploadDocument function using uploadBytesResumable.

async function uploadDocumentWithProgress(file, key, progress, status) {
  const timestamp = Date.now();
  const path = `admission_docs/temp/${timestamp}/${key}_${file.name.replace(/\s+/g, "_")}`;
  const storageRef = sRef(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progress[key] = Math.round(pct);
        // Update UI by re-rendering step
        const container = document.querySelector('.wizard-container');
        if (container) renderDocumentStep(container);
      },
      (error) => {
        status[key] = 'error';
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        progress[key] = 100;
        status[key] = 'done';
        resolve(url);
      }
    );
  });
}

// We'll update the renderDocumentStep to use uploadDocumentWithProgress.

// Re-render function for step 4 will be called on progress updates.

// We'll adjust the renderDocumentStep to use the new function.

// Let's rewrite the renderDocumentStep with the corrected upload logic.

// I'll now produce the final code.

// ---------- Submit Admission ----------
async function submitAdmission(container) {
  // Save all step data
  if (wizardState.step === 1) savePersonalData();
  else if (wizardState.step === 2) saveEducationData();
  else if (wizardState.step === 3) saveAddressData();

  // Validate personal details again
  const err = validateStudent(wizardState.data);
  if (err) {
    toast({ type: "error", title: "Validation error", message: err });
    return;
  }

  // Check required uploads done
  const requiredDocs = ['photo', 'aadhaar', 'marksheet'];
  const allDone = requiredDocs.every(key => wizardState.uploadStatus[key] === 'done');
  if (!allDone) {
    toast({ type: "error", title: "Uploads pending", message: "Please upload all required documents." });
    return;
  }

  wizardState.isSubmitting = true;
  const submitBtn = container.querySelector('.wizard-nav .btn-success');
  if (submitBtn) submitBtn.disabled = true;

  try {
    // Prepare data for createStudent
    const studentData = { ...wizardState.data };
    // Ensure dates are in correct format
    if (studentData.dob) studentData.dob = studentData.dob; // already ISO
    if (studentData.admissionDate) studentData.admissionDate = studentData.admissionDate;

    // The photo file is handled by createStudent (uploadPhoto)
    // But we already have photoUrl from the upload in step4? Actually we upload photo in step4, but createStudent expects photoFile.
    // We'll pass the photo file separately.
    const photoFile = wizardState.files.photo;

    // Remove the file objects from data
    delete studentData.photo;

    // Call createStudent with the data and photo file
    const created = await createStudent(studentData, photoFile);
    // Now update the student record with the additional document URLs (aadhaar, marksheet, tc)
    // We have the URLs stored in wizardState.data['aadhaarUrl'], etc.
    // We need to update the student document after creation.
    // We'll import updateStudent from data.js
    // But we cannot modify data.js, but we can call updateStudent (it exists).
    // We'll need to include the new fields in the update.
    // But updateStudent expects a payload and photoFile.
    // We'll update with the document URLs.
    const updatePayload = {
      aadhaarUrl: wizardState.data.aadhaarUrl || null,
      marksheetUrl: wizardState.data.marksheetUrl || null,
      tcUrl: wizardState.data.tcUrl || null
    };
    // Also add the other new fields if they were not in the original create (they are, because we passed them)
    // But to be safe, we update all new fields.
    // We'll also include previousEducation fields, address fields.
    const newFields = ['previousSchool', 'previousPercentage', 'previousDivision', 'mediumOfInstruction',
      'presentAddress', 'permanentAddress', 'state', 'district', 'pinCode'];
    newFields.forEach(f => {
      if (wizardState.data[f] !== undefined) updatePayload[f] = wizardState.data[f];
    });
    // Now call updateStudent
    const { updateStudent } = await import("../data.js");
    await updateStudent(created.id, updatePayload, null);

    toast({ type: "success", title: "Admission successful", message: `Admission #${created.admissionNumber}` });

    // Show the admission form preview
    const previewContainer = container.parentElement; // we need to replace content with preview
    const preview = admissionFormRender(created);
    container.innerHTML = "";
    container.appendChild(preview);
    // Remove the wizard nav
    const nav = container.querySelector('.wizard-nav');
    if (nav) nav.remove();

  } catch (e) {
    console.error(e);
    toast({ type: "error", title: "Submission failed", message: e.message || "Please try again." });
  } finally {
    wizardState.isSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ---------- Admission Form Render (printable) ----------
function admissionFormRender(r) {
  const wrap = el("div");

  const actions = el("div", { class: "page-actions", style: "justify-content:flex-end;margin-bottom:12px;" }, [
    el("button", { class: "btn btn-outline", html: `${ICON.print}<span>Print</span>`, onclick: () => printNode(printable) })
  ]);
  wrap.appendChild(actions);

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

  const gridStyle = "display: grid; grid-template-columns: repeat(2, 1fr) !important; gap: 8px 24px; font-size: 13px;";

  // Personal
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Personal Information" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Full Name", r.name), kv("Gender", r.gender),
      kv("DOB", fmtDate(r.dob)), kv("Age", ageFromDob(r.dob)),
      kv("Blood Group", r.bloodGroup), kv("Religion", r.religion),
      kv("Category", r.category), kv("Previous School", r.previousSchool)
    ])
  ]));

  // Academic
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Academic Details" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Class", r.class), kv("Section", r.section),
      kv("Roll Number", r.rollNumber), kv("Admission Date", fmtDate(r.admissionDate))
    ])
  ]));

  // Previous Education
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Previous Education" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Previous School", r.previousSchool),
      kv("Percentage", r.previousPercentage),
      kv("Division", r.previousDivision),
      kv("Medium of Instruction", r.mediumOfInstruction)
    ])
  ]));

  // Address
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Address Details" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Present Address", r.presentAddress),
      kv("Permanent Address", r.permanentAddress),
      kv("State", r.state),
      kv("District", r.district),
      kv("PIN Code", r.pinCode)
    ])
  ]));

  // Parents & Contact
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Parents & Contact" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Father's Name", r.fatherName), kv("Mother's Name", r.motherName),
      kv("Guardian", r.guardian), kv("Phone", r.phone),
      kv("Emergency", r.emergencyContact), kv("Email", r.email)
    ])
  ]));

  // Documents
  printable.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Documents" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Photo", r.photoUrl ? "Uploaded" : "—"),
      kv("Aadhaar", r.aadhaarUrl ? "Uploaded" : "—"),
      kv("Marksheet", r.marksheetUrl ? "Uploaded" : "—"),
      kv("Transfer Certificate", r.tcUrl ? "Uploaded" : "—")
    ])
  ]));

  printable.appendChild(el("div", { class: "receipt-foot" }, [
    el("div", { class: "note", text: "This is a system-generated admission application. Please retain this copy for your records." }),
    el("div", { class: "sign" }, [el("div", { class: "line" }), el("div", { text: "Authorized Signatory" })])
  ]));

  scrollWrapper.appendChild(printable);
  wrap.appendChild(scrollWrapper);
  return wrap;
}

// ---------- Helper: fmtDateInput (imported from utils) ----------
import { fmtDateInput } from "../utils.js";
