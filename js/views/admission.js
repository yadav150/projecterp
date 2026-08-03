// Admission view — Multi-step professional admission workflow
import { el, ICON, SCHOOL, fmtDate, todayISO, required, isEmail, isPhone } from "../utils.js";
import { setCrumbs, toast, loadingState, openModal } from "../ui.js";
import { createStudent, getStudent } from "../data.js";
import { uploadFile } from "../firebase.js";
import { printNode } from "../pdf.js";

// ---------- State ----------
let state = {
  step: 1,
  personal: {
    name: "",
    admissionClass: "",
    session: "",
    dateOfAdmission: todayISO(),
    dob: "",
    gender: "",
    bloodGroup: "",
    category: "",
    religion: "",
    nationality: "",
    mobile: "",
    email: "",
    fatherName: "",
    fatherOccupation: "",
    fatherPhone: "",
    motherName: "",
    motherOccupation: "",
    motherPhone: "",
    guardianName: "",
    guardianRelation: "",
    guardianPhone: ""
  },
  education: {
    previousSchool: "",
    previousClass: "",
    previousPercentage: "",
    previousDivision: "",
    medium: "",
    board: "",
    passingYear: "",
    rollNumber: "",
    registrationNumber: ""
  },
  address: {
    presentAddress: "",
    permanentAddress: "",
    sameAsPresent: false,
    district: "",
    state: "",
    pinCode: ""
  },
  documents: {
    photo: { file: null, url: null, progress: 0, status: "idle" },
    aadhaar: { file: null, url: null, progress: 0, status: "idle" },
    marksheet: { file: null, url: null, progress: 0, status: "idle" },
    tc: { file: null, url: null, progress: 0, status: "idle" }
  },
  payment: {
    admissionFee: "",
    registrationFee: "",
    otherCharges: "",
    discount: "",
    total: 0,
    paymentMethod: "",
    transactionId: "",
    paymentStatus: "Pending"
  },
  submitted: false
};

// ---------- Constants ----------
const CLASSES = ["Nursery", "LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const GENDERS = ["Male", "Female", "Other"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Other"];
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const SESSIONS = ["2025-26", "2026-27", "2027-28"];
const DIVISIONS = ["First", "Second", "Third", "Pass"];
const BOARDS = ["CBSE", "ICSE", "State Board", "IGCSE", "IB", "Other"];
const MEDIUMS = ["English", "Hindi", "Assamese", "Bengali", "Other"];
const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];
const PAYMENT_STATUS = ["Pending", "Paid", "Partial"];

// ---------- Main View ----------
export function AdmissionView() {
  setCrumbs([{ label: "Admission" }]);
  const page = el("div", { "data-testid": "admission-view" });

  const hashQuery = location.hash.split("?")[1] || "";
  const params = new URLSearchParams(hashQuery);
  const preselectId = params.get("id");

  if (preselectId) {
    const loading = el("div", { style: "padding:40px; text-align:center;" }, "Loading admission data…");
    page.appendChild(loading);
    getStudent(preselectId).then(r => {
      loading.remove();
      if (r) {
        state.personal = {
          ...state.personal,
          name: r.name || "",
          admissionClass: r.class || "",
          dateOfAdmission: r.admissionDate || todayISO(),
          dob: r.dob || "",
          gender: r.gender || "",
          bloodGroup: r.bloodGroup || "",
          category: r.category || "",
          religion: r.religion || "",
          nationality: r.nationality || "",
          mobile: r.phone || "",
          email: r.email || "",
          fatherName: r.fatherName || "",
          motherName: r.motherName || "",
          guardianName: r.guardian || "",
          fatherPhone: r.fatherPhone || "",
          motherPhone: r.motherPhone || "",
          guardianPhone: r.guardianPhone || ""
        };
        state.personal.session = SESSIONS[0] || "";
        state.address.presentAddress = r.address || "";
      }
      renderPage(page);
    });
    return page;
  }

  renderPage(page);
  return page;
}

// ---------- Render Main Page ----------
function renderPage(page) {
  page.innerHTML = "";
  const container = el("div", { style: "max-width: 900px; margin: 0 auto;" });

  container.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Student Admission" }),
      el("p", { class: "page-subtitle", text: "Complete the multi-step admission process." })
    ])
  ]));

  const stepper = renderStepper();
  container.appendChild(stepper);

  const card = el("div", { class: "card", style: "margin-top: 20px;" });
  const cardBody = el("div", { class: "card-body" });
  card.appendChild(cardBody);
  container.appendChild(card);

  function renderStepContent() {
    cardBody.innerHTML = "";
    const stepNode = renderStep(state.step);
    cardBody.appendChild(stepNode);
  }

  const navRow = el("div", { class: "form-actions", style: "margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;" });
  const prevBtn = el("button", { class: "btn btn-outline", text: "Previous", disabled: state.step === 1, onclick: () => goToStep(state.step - 1) });
  const nextBtn = el("button", { class: "btn btn-primary", text: state.step === 6 ? "Generate" : "Next", onclick: () => goToStep(state.step + 1) });
  navRow.appendChild(prevBtn);
  navRow.appendChild(el("div", { style: "flex:1;" }));
  navRow.appendChild(nextBtn);

  container.appendChild(navRow);
  page.appendChild(container);

  renderStepContent();

  function goToStep(step) {
    if (step < 1 || step > 6) return;
    if (step > state.step) {
      const valid = validateStep(state.step);
      if (!valid) { toast({ type: "error", title: "Please fill all required fields." }); return; }
      if (state.step === 4 && !areUploadsComplete()) {
        toast({ type: "error", title: "Please upload all required documents." }); return;
      }
      if (state.step === 5 && !validatePayment()) {
        toast({ type: "error", title: "Please complete payment details." }); return;
      }
    }
    state.step = step;
    renderStepContent();
    prevBtn.disabled = state.step === 1;
    nextBtn.textContent = state.step === 6 ? "Generate" : "Next";
  }

  // Override nextBtn click
  nextBtn.onclick = async () => {
    if (state.step === 6) {
      await handleGenerate(page);
      return;
    }
    if (!validateStep(state.step)) {
      toast({ type: "error", title: "Please fill all required fields." });
      return;
    }
    if (state.step === 4 && !areUploadsComplete()) {
      toast({ type: "error", title: "Please upload all required documents." });
      return;
    }
    if (state.step === 5 && !validatePayment()) {
      toast({ type: "error", title: "Please complete payment details." });
      return;
    }
    goToStep(state.step + 1);
  };

  // Stepper click handling
  const stepIndicators = stepper.querySelectorAll("[data-step]");
  stepIndicators.forEach(el => {
    el.addEventListener("click", function() {
      const targetStep = parseInt(this.dataset.step);
      if (targetStep < state.step) {
        goToStep(targetStep);
      } else if (targetStep > state.step) {
        let valid = true;
        for (let s = state.step; s < targetStep; s++) {
          if (!validateStep(s)) { valid = false; toast({ type: "error", title: "Please complete step " + s + " first." }); break; }
          if (s === 4 && !areUploadsComplete()) { valid = false; toast({ type: "error", title: "Please upload all required documents." }); break; }
          if (s === 5 && !validatePayment()) { valid = false; toast({ type: "error", title: "Please complete payment details." }); break; }
        }
        if (valid) goToStep(targetStep);
      }
    });
  });
}

// ---------- Stepper Render ----------
function renderStepper() {
  const steps = ["Personal", "Education", "Address", "Uploads", "Payment", "Generate"];
  const wrap = el("div", { style: "display: flex; justify-content: space-between; align-items: center; margin: 20px 0 10px 0; position: relative; padding: 0 10px;" });

  steps.forEach((label, index) => {
    const stepNum = index + 1;
    const isActive = stepNum === state.step;
    const isCompleted = stepNum < state.step;
    const dot = el("div", {
      style: `width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; background: ${isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--border)'}; color: ${isActive || isCompleted ? '#fff' : 'var(--text-2)'}; border: 2px solid ${isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--border)'}; cursor: pointer; transition: 0.2s;`,
      "data-step": stepNum,
      text: stepNum
    });
    const labelEl = el("div", {
      style: `font-size: 12px; font-weight: ${isActive ? '600' : '400'}; color: ${isActive ? 'var(--text)' : 'var(--muted)'}; margin-top: 4px; text-align: center; width: 60px;`,
      text: label
    });
    const stepWrap = el("div", { style: "display: flex; flex-direction: column; align-items: center; flex: 1; position: relative;" });
    stepWrap.appendChild(dot);
    stepWrap.appendChild(labelEl);

    if (index < steps.length - 1) {
      const line = el("div", {
        style: `position: absolute; top: 16px; left: calc(50% + 20px); right: calc(-50% + 20px); height: 2px; background: ${isCompleted ? 'var(--success)' : 'var(--border)'}; z-index: -1;`,
      });
      stepWrap.appendChild(line);
    }
    wrap.appendChild(stepWrap);
  });

  return wrap;
}

// ---------- Render Step ----------
function renderStep(step) {
  switch (step) {
    case 1: return renderPersonalDetails();
    case 2: return renderEducationalDetails();
    case 3: return renderAddress();
    case 4: return renderDocumentUploads();
    case 5: return renderPayment();
    case 6: return renderReview();
    default: return el("div", {}, "Step not found");
  }
}

// ---------- Renderers for each step ----------
function renderPersonalDetails() {
  const fields = [
    { key: "name", label: "Student Name", type: "text", required: true, value: state.personal.name },
    { key: "admissionClass", label: "Admission Class", type: "select", options: CLASSES, required: true, value: state.personal.admissionClass },
    { key: "session", label: "Session", type: "select", options: SESSIONS, required: true, value: state.personal.session },
    { key: "dateOfAdmission", label: "Date of Admission", type: "date", required: true, value: state.personal.dateOfAdmission },
    { key: "dob", label: "Date of Birth", type: "date", required: true, value: state.personal.dob },
    { key: "gender", label: "Gender", type: "select", options: GENDERS, required: true, value: state.personal.gender },
    { key: "bloodGroup", label: "Blood Group", type: "select", options: BLOOD, required: false, value: state.personal.bloodGroup },
    { key: "category", label: "Category", type: "select", options: CATEGORIES, required: true, value: state.personal.category },
    { key: "religion", label: "Religion", type: "select", options: RELIGIONS, required: true, value: state.personal.religion },
    { key: "nationality", label: "Nationality", type: "text", required: true, value: state.personal.nationality },
    { key: "mobile", label: "Mobile Number", type: "tel", required: true, value: state.personal.mobile },
    { key: "email", label: "Email", type: "email", required: false, value: state.personal.email },
    { key: "fatherName", label: "Father's Name", type: "text", required: true, value: state.personal.fatherName },
    { key: "fatherOccupation", label: "Father's Occupation", type: "text", required: false, value: state.personal.fatherOccupation },
    { key: "fatherPhone", label: "Father's Phone", type: "tel", required: false, value: state.personal.fatherPhone },
    { key: "motherName", label: "Mother's Name", type: "text", required: true, value: state.personal.motherName },
    { key: "motherOccupation", label: "Mother's Occupation", type: "text", required: false, value: state.personal.motherOccupation },
    { key: "motherPhone", label: "Mother's Phone", type: "tel", required: false, value: state.personal.motherPhone },
    { key: "guardianName", label: "Guardian's Name (if applicable)", type: "text", required: false, value: state.personal.guardianName },
    { key: "guardianRelation", label: "Guardian's Relation", type: "text", required: false, value: state.personal.guardianRelation },
    { key: "guardianPhone", label: "Guardian's Phone", type: "tel", required: false, value: state.personal.guardianPhone }
  ];

  const grid = buildFormGrid(fields, state.personal, (key, val) => { state.personal[key] = val; });
  return el("div", {}, [
    el("h3", { style: "margin-bottom: 16px; font-weight: 700;", text: "Personal Details" }),
    grid
  ]);
}

function renderEducationalDetails() {
  const fields = [
    { key: "previousSchool", label: "Previous School Name", type: "text", required: true, value: state.education.previousSchool },
    { key: "previousClass", label: "Previous Class", type: "text", required: true, value: state.education.previousClass },
    { key: "previousPercentage", label: "Previous Percentage", type: "number", required: true, value: state.education.previousPercentage },
    { key: "previousDivision", label: "Previous Division", type: "select", options: DIVISIONS, required: true, value: state.education.previousDivision },
    { key: "medium", label: "Medium of Instruction", type: "select", options: MEDIUMS, required: true, value: state.education.medium },
    { key: "board", label: "Board", type: "select", options: BOARDS, required: true, value: state.education.board },
    { key: "passingYear", label: "Passing Year", type: "number", required: true, value: state.education.passingYear },
    { key: "rollNumber", label: "Roll Number (optional)", type: "text", required: false, value: state.education.rollNumber },
    { key: "registrationNumber", label: "Registration Number (optional)", type: "text", required: false, value: state.education.registrationNumber }
  ];

  const grid = buildFormGrid(fields, state.education, (key, val) => { state.education[key] = val; });
  return el("div", {}, [
    el("h3", { style: "margin-bottom: 16px; font-weight: 700;", text: "Educational Details" }),
    grid
  ]);
}

function renderAddress() {
  const fields = [
    { key: "presentAddress", label: "Present Address", type: "textarea", required: true, value: state.address.presentAddress },
    { key: "permanentAddress", label: "Permanent Address", type: "textarea", required: true, value: state.address.permanentAddress },
    { key: "sameAsPresent", label: "Same as Present Address", type: "checkbox", value: state.address.sameAsPresent },
    { key: "district", label: "District", type: "text", required: true, value: state.address.district },
    { key: "state", label: "State", type: "text", required: true, value: state.address.state },
    { key: "pinCode", label: "PIN Code", type: "text", required: true, value: state.address.pinCode }
  ];

  const grid = buildFormGrid(fields, state.address, (key, val) => {
    state.address[key] = val;
    if (key === "sameAsPresent" && val === true) {
      state.address.permanentAddress = state.address.presentAddress;
      const permField = grid.querySelector('[name="permanentAddress"]');
      if (permField) permField.value = state.address.permanentAddress;
    }
  });

  const sameCheck = grid.querySelector('[name="sameAsPresent"]');
  if (sameCheck) {
    sameCheck.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.address.permanentAddress = state.address.presentAddress;
        const permField = grid.querySelector('[name="permanentAddress"]');
        if (permField) permField.value = state.address.permanentAddress;
      }
    });
  }

  return el("div", {}, [
    el("h3", { style: "margin-bottom: 16px; font-weight: 700;", text: "Address Details" }),
    grid
  ]);
}

function renderDocumentUploads() {
  const requiredDocs = ["photo", "aadhaar", "marksheet"];
  const optionalDocs = ["tc"];
  const docLabels = {
    photo: "Passport Size Photo",
    aadhaar: "Aadhaar Card",
    marksheet: "Previous Marksheet",
    tc: "Transfer Certificate (optional)"
  };
  const docAccept = {
    photo: "image/*",
    aadhaar: "image/*,application/pdf",
    marksheet: "image/*,application/pdf",
    tc: "image/*,application/pdf"
  };

  const wrap = el("div", {}, [
    el("h3", { style: "margin-bottom: 16px; font-weight: 700;", text: "Document Uploads" }),
    el("p", { style: "color: var(--muted); margin-bottom: 20px;", text: "Upload the required documents. All uploads are stored securely in Firebase Storage." })
  ]);

  const grid = el("div", { class: "form-grid", style: "grid-template-columns: 1fr;" });
  wrap.appendChild(grid);

  const allDocs = [...requiredDocs, ...optionalDocs];
  allDocs.forEach(docKey => {
    const doc = state.documents[docKey];
    const isRequired = requiredDocs.includes(docKey);
    const label = docLabels[docKey] || docKey;
    const accept = docAccept[docKey] || "*/*";

    const row = el("div", { class: "form-row", style: "border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 16px;" });
    row.appendChild(el("label", { style: "font-weight:600;", html: `${label} ${isRequired ? '<span class="req">*</span>' : ''}` }));

    const uploadArea = el("div", {
      style: `border: 2px dashed ${doc.status === 'error' ? 'var(--danger)' : 'var(--border)'}; border-radius: var(--radius); padding: 20px; text-align: center; background: #fafbfe; margin-top: 6px; transition: 0.2s;`
    });

    uploadArea.addEventListener("dragover", (e) => { e.preventDefault(); uploadArea.style.borderColor = "var(--primary)"; });
    uploadArea.addEventListener("dragleave", () => { uploadArea.style.borderColor = doc.status === 'error' ? 'var(--danger)' : 'var(--border)'; });
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'var(--border)';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(docKey, files[0]);
      }
    });

    const fileInput = el("input", { type: "file", accept: accept, style: "display:none;", "data-doc": docKey });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(docKey, e.target.files[0]);
      }
    });

    const previewContainer = el("div", { style: "margin-top: 10px; display: flex; flex-direction: column; align-items: center;" });

    function updateUploadArea() {
      const docData = state.documents[docKey];
      previewContainer.innerHTML = "";
      if (docData.status === "done" && docData.url) {
        const preview = el("div", { style: "display: flex; align-items: center; gap: 12px; width: 100%; justify-content: center;" });
        if (docData.file && docData.file.type.startsWith("image/")) {
          const img = el("img", { src: docData.url, style: "max-width: 100px; max-height: 100px; border-radius: 4px; border: 1px solid var(--border);" });
          preview.appendChild(img);
        } else {
          preview.appendChild(el("span", { text: "File uploaded: " + (docData.file ? docData.file.name : "") }));
        }
        const removeBtn = el("button", { class: "btn btn-danger btn-sm", text: "Remove", onclick: () => {
          state.documents[docKey] = { file: null, url: null, progress: 0, status: "idle" };
          updateUploadArea();
          document.getElementById("next-btn")?.removeAttribute("disabled");
        }});
        preview.appendChild(removeBtn);
        previewContainer.appendChild(preview);
        previewContainer.appendChild(el("span", { style: "color: var(--success); font-size: 12px; margin-top: 4px;", text: "✓ Uploaded successfully" }));
        const replaceBtn = el("button", { class: "btn btn-outline btn-sm", text: "Replace File", onclick: () => fileInput.click() });
        previewContainer.appendChild(replaceBtn);
        // Enable next button if all required are done
        if (areUploadsComplete()) {
          const nextBtn = document.querySelector('.btn-primary');
          if (nextBtn) nextBtn.disabled = false;
        }
      } else if (docData.status === "uploading") {
        const progressBar = el("div", { style: "width: 100%; height: 6px; background: var(--border); border-radius: 4px; overflow: hidden; margin: 8px 0;" });
        const progressFill = el("div", { style: `width: ${docData.progress}%; height: 100%; background: var(--primary); transition: width 0.3s;` });
        progressBar.appendChild(progressFill);
        previewContainer.appendChild(progressBar);
        previewContainer.appendChild(el("span", { style: "font-size: 12px; color: var(--muted);", text: `Uploading... ${Math.round(docData.progress)}%` }));
        // Disable next button during upload
        const nextBtn = document.querySelector('.btn-primary');
        if (nextBtn) nextBtn.disabled = true;
      } else if (docData.status === "error") {
        previewContainer.appendChild(el("span", { style: "color: var(--danger); font-size: 12px;", text: "Upload failed. Please try again." }));
        const retryBtn = el("button", { class: "btn btn-outline btn-sm", text: "Retry", onclick: () => fileInput.click() });
        previewContainer.appendChild(retryBtn);
        // Re-enable next button?
        const nextBtn = document.querySelector('.btn-primary');
        if (nextBtn) nextBtn.disabled = false;
      } else {
        // idle
        const dropText = el("div", { style: "color: var(--muted); font-size: 13px;", html: "Drag & drop your file here or click to browse" });
        previewContainer.appendChild(dropText);
        const browseBtn = el("button", { class: "btn btn-outline btn-sm", text: "Browse", onclick: () => fileInput.click() });
        previewContainer.appendChild(browseBtn);
      }
    }

    async function handleFileSelect(docKey, file) {
      const docData = state.documents[docKey];
      if (file.size > 5 * 1024 * 1024) {
        toast({ type: "error", title: "File too large", message: "Maximum file size is 5MB." });
        return;
      }
      docData.file = file;
      docData.status = "uploading";
      docData.progress = 0;
      docData.url = null;
      updateUploadArea();

      try {
        const path = `admissions/${Date.now()}_${file.name}`;
        const url = await uploadFile(path, file);
        docData.url = url;
        docData.status = "done";
        docData.progress = 100;
        toast({ type: "success", title: "Upload complete", message: `${file.name} uploaded successfully.` });
        updateUploadArea();
        const nextBtn = document.querySelector('.btn-primary');
        if (nextBtn && areUploadsComplete()) nextBtn.disabled = false;
      } catch (e) {
        docData.status = "error";
        docData.progress = 0;
        toast({ type: "error", title: "Upload failed", message: e.message });
        updateUploadArea();
      }
    }

    uploadArea.appendChild(fileInput);
    uploadArea.appendChild(previewContainer);

    uploadArea.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") {
        fileInput.click();
      }
    });

    row.appendChild(uploadArea);
    grid.appendChild(row);
    updateUploadArea();
  });

  return wrap;
}

function renderPayment() {
  const fields = [
    { key: "admissionFee", label: "Admission Fee", type: "number", required: true, value: state.payment.admissionFee },
    { key: "registrationFee", label: "Registration Fee", type: "number", required: true, value: state.payment.registrationFee },
    { key: "otherCharges", label: "Other Charges", type: "number", required: false, value: state.payment.otherCharges },
    { key: "discount", label: "Discount", type: "number", required: false, value: state.payment.discount },
    { key: "total", label: "Total Amount", type: "number", required: false, value: state.payment.total, readonly: true },
    { key: "paymentMethod", label: "Payment Method", type: "select", options: PAYMENT_METHODS, required: true, value: state.payment.paymentMethod },
    { key: "transactionId", label: "Transaction ID / Reference", type: "text", required: false, value: state.payment.transactionId },
    { key: "paymentStatus", label: "Payment Status", type: "select", options: PAYMENT_STATUS, required: true, value: state.payment.paymentStatus }
  ];

  const grid = buildFormGrid(fields, state.payment, (key, val) => {
    state.payment[key] = val;
    const admissionFee = parseFloat(state.payment.admissionFee) || 0;
    const registrationFee = parseFloat(state.payment.registrationFee) || 0;
    const otherCharges = parseFloat(state.payment.otherCharges) || 0;
    const discount = parseFloat(state.payment.discount) || 0;
    state.payment.total = admissionFee + registrationFee + otherCharges - discount;
    const totalField = grid.querySelector('[name="total"]');
    if (totalField) totalField.value = state.payment.total.toFixed(2);
  });

  return el("div", {}, [
    el("h3", { style: "margin-bottom: 16px; font-weight: 700;", text: "Payment Details" }),
    grid
  ]);
}

function renderReview() {
  const sections = [
    { title: "Personal Details", data: state.personal, keys: ["name", "admissionClass", "session", "dateOfAdmission", "dob", "gender", "bloodGroup", "category", "religion", "nationality", "mobile", "email", "fatherName", "fatherOccupation", "fatherPhone", "motherName", "motherOccupation", "motherPhone", "guardianName", "guardianRelation", "guardianPhone"] },
    { title: "Educational Details", data: state.education, keys: ["previousSchool", "previousClass", "previousPercentage", "previousDivision", "medium", "board", "passingYear", "rollNumber", "registrationNumber"] },
    { title: "Address", data: state.address, keys: ["presentAddress", "permanentAddress", "district", "state", "pinCode"] },
    { title: "Payment", data: state.payment, keys: ["admissionFee", "registrationFee", "otherCharges", "discount", "total", "paymentMethod", "transactionId", "paymentStatus"] }
  ];

  const wrap = el("div", {}, [
    el("h3", { style: "margin-bottom: 16px; font-weight: 700;", text: "Review & Generate" }),
    el("p", { style: "color: var(--muted); margin-bottom: 20px;", text: "Please review all details before generating admission." })
  ]);

  sections.forEach(section => {
    const card = el("div", { class: "card", style: "margin-bottom: 16px;" });
    const header = el("div", { class: "card-header", style: "display: flex; justify-content: space-between; align-items: center;" });
    header.appendChild(el("div", { class: "card-title", text: section.title }));
    const editBtn = el("button", { class: "btn btn-ghost btn-sm", text: "Edit", onclick: () => {
      let step = 1;
      if (section.title === "Personal Details") step = 1;
      else if (section.title === "Educational Details") step = 2;
      else if (section.title === "Address") step = 3;
      else if (section.title === "Payment") step = 5;
      window._goToStep?.(step);
    }});
    header.appendChild(editBtn);
    card.appendChild(header);

    const body = el("div", { class: "card-body", style: "display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 13px;" });
    section.keys.forEach(key => {
      let label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      let value = section.data[key] || "—";
      if (key === "dateOfAdmission" || key === "dob") value = value ? fmtDate(value) : "—";
      if (key === "total") value = value ? "₹" + value : "—";
      const row = el("div", { style: "display: flex; gap: 4px;" }, [
        el("span", { style: "color: var(--muted); font-weight: 500; min-width: 100px;", text: label + ":" }),
        el("span", { style: "font-weight: 500;", text: value })
      ]);
      body.appendChild(row);
    });
    card.appendChild(body);
    wrap.appendChild(card);
  });

  // Documents summary
  const docCard = el("div", { class: "card", style: "margin-bottom: 16px;" });
  docCard.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Documents" })]));
  const docBody = el("div", { class: "card-body" });
  const docStatus = el("div", { style: "display: flex; flex-wrap: wrap; gap: 12px;" });
  const docLabels = { photo: "Photo", aadhaar: "Aadhaar", marksheet: "Marksheet", tc: "TC" };
  Object.keys(state.documents).forEach(key => {
    const doc = state.documents[key];
    const statusText = doc.status === "done" ? "Uploaded" : doc.status === "uploading" ? "Your file is being uploading..." : doc.status === "error" ? "Error" : "Mandatory fields can't be Blank";
    const color = doc.status === "done" ? "var(--success)" : doc.status === "uploading" ? "var(--warning)" : "var(--danger)";
    const item = el("span", { style: `color: ${color}; font-size: 12px;` }, `${docLabels[key] || key}: ${statusText}`);
    docStatus.appendChild(item);
  });
  docBody.appendChild(docStatus);
  docCard.appendChild(docBody);
  wrap.appendChild(docCard);

  return wrap;
}

// ---------- Helper: Build Form Grid ----------
function buildFormGrid(fields, data, onChange) {
  const grid = el("div", { class: "form-grid" });
  fields.forEach(f => {
    const row = el("div", { class: "form-row" });
    const label = el("label", { html: `${f.label} ${f.required ? '<span class="req">*</span>' : ''}` });
    row.appendChild(label);

    let input;
    if (f.type === "select") {
      input = el("select", { class: "select", name: f.key, required: f.required });
      const defaultOpt = el("option", { value: "", text: `Select ${f.label}` });
      input.appendChild(defaultOpt);
      f.options.forEach(opt => {
        const option = el("option", { value: opt, text: opt });
        if (opt === f.value) option.selected = true;
        input.appendChild(option);
      });
    } else if (f.type === "checkbox") {
      input = el("input", { type: "checkbox", name: f.key, checked: f.value });
    } else if (f.type === "textarea") {
      input = el("textarea", { class: "textarea", name: f.key, rows: 2 });
      input.value = f.value || "";
    } else {
      input = el("input", { class: "input", type: f.type || "text", name: f.key, placeholder: f.label, required: f.required, readonly: f.readonly || false });
      input.value = f.value || "";
    }

    input.addEventListener("input", (e) => {
      let val = e.target.value;
      if (f.type === "checkbox") val = e.target.checked;
      onChange(f.key, val);
    });

    if (f.type === "checkbox") {
      input.addEventListener("change", (e) => {
        onChange(f.key, e.target.checked);
      });
    }

    row.appendChild(input);
    grid.appendChild(row);
  });
  return grid;
}

// ---------- Validation Functions ----------
function validateStep(step) {
  switch (step) {
    case 1: return validatePersonal();
    case 2: return validateEducation();
    case 3: return validateAddress();
    case 4: return areUploadsComplete();
    case 5: return validatePayment();
    default: return true;
  }
}

function validatePersonal() {
  const p = state.personal;
  if (!required(p.name)) { toast({ type: "error", title: "Student Name is required" }); return false; }
  if (!required(p.admissionClass)) { toast({ type: "error", title: "Admission Class is required" }); return false; }
  if (!required(p.session)) { toast({ type: "error", title: "Session is required" }); return false; }
  if (!required(p.dateOfAdmission)) { toast({ type: "error", title: "Date of Admission is required" }); return false; }
  if (!required(p.dob)) { toast({ type: "error", title: "Date of Birth is required" }); return false; }
  if (!required(p.gender)) { toast({ type: "error", title: "Gender is required" }); return false; }
  if (!required(p.category)) { toast({ type: "error", title: "Category is required" }); return false; }
  if (!required(p.religion)) { toast({ type: "error", title: "Religion is required" }); return false; }
  if (!required(p.nationality)) { toast({ type: "error", title: "Nationality is required" }); return false; }
  if (!required(p.mobile) || !isPhone(p.mobile)) { toast({ type: "error", title: "Valid Mobile Number is required" }); return false; }
  if (p.email && !isEmail(p.email)) { toast({ type: "error", title: "Invalid Email" }); return false; }
  if (!required(p.fatherName)) { toast({ type: "error", title: "Father's Name is required" }); return false; }
  if (!required(p.motherName)) { toast({ type: "error", title: "Mother's Name is required" }); return false; }
  return true;
}

function validateEducation() {
  const e = state.education;
  if (!required(e.previousSchool)) { toast({ type: "error", title: "Previous School Name is required" }); return false; }
  if (!required(e.previousClass)) { toast({ type: "error", title: "Previous Class is required" }); return false; }
  if (!required(e.previousPercentage)) { toast({ type: "error", title: "Previous Percentage is required" }); return false; }
  if (!required(e.previousDivision)) { toast({ type: "error", title: "Previous Division is required" }); return false; }
  if (!required(e.medium)) { toast({ type: "error", title: "Medium of Instruction is required" }); return false; }
  if (!required(e.board)) { toast({ type: "error", title: "Board is required" }); return false; }
  if (!required(e.passingYear)) { toast({ type: "error", title: "Passing Year is required" }); return false; }
  return true;
}

function validateAddress() {
  const a = state.address;
  if (!required(a.presentAddress)) { toast({ type: "error", title: "Present Address is required" }); return false; }
  if (!required(a.permanentAddress)) { toast({ type: "error", title: "Permanent Address is required" }); return false; }
  if (!required(a.district)) { toast({ type: "error", title: "District is required" }); return false; }
  if (!required(a.state)) { toast({ type: "error", title: "State is required" }); return false; }
  if (!required(a.pinCode)) { toast({ type: "error", title: "PIN Code is required" }); return false; }
  return true;
}

function validatePayment() {
  const p = state.payment;
  if (!required(p.admissionFee) || parseFloat(p.admissionFee) <= 0) { toast({ type: "error", title: "Valid Admission Fee is required" }); return false; }
  if (!required(p.registrationFee) || parseFloat(p.registrationFee) <= 0) { toast({ type: "error", title: "Valid Registration Fee is required" }); return false; }
  if (!required(p.paymentMethod)) { toast({ type: "error", title: "Payment Method is required" }); return false; }
  if (!required(p.paymentStatus)) { toast({ type: "error", title: "Payment Status is required" }); return false; }
  return true;
}

function areUploadsComplete() {
  const requiredDocs = ["photo", "aadhaar", "marksheet"];
  for (const key of requiredDocs) {
    const doc = state.documents[key];
    if (doc.status !== "done" || !doc.url) return false;
  }
  return true;
}

// ---------- Generate Admission ----------
async function handleGenerate(page) {
  if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !areUploadsComplete() || !validatePayment()) {
    toast({ type: "error", title: "Please complete all required fields and uploads." });
    return;
  }

  const payload = {
    name: state.personal.name,
    class: state.personal.admissionClass,
    session: state.personal.session,
    admissionDate: state.personal.dateOfAdmission,
    dob: state.personal.dob,
    gender: state.personal.gender,
    bloodGroup: state.personal.bloodGroup,
    category: state.personal.category,
    religion: state.personal.religion,
    nationality: state.personal.nationality,
    phone: state.personal.mobile,
    email: state.personal.email,
    fatherName: state.personal.fatherName,
    fatherOccupation: state.personal.fatherOccupation,
    fatherPhone: state.personal.fatherPhone,
    motherName: state.personal.motherName,
    motherOccupation: state.personal.motherOccupation,
    motherPhone: state.personal.motherPhone,
    guardian: state.personal.guardianName,
    guardianRelation: state.personal.guardianRelation,
    guardianPhone: state.personal.guardianPhone,
    previousSchool: state.education.previousSchool,
    previousClass: state.education.previousClass,
    previousPercentage: state.education.previousPercentage,
    previousDivision: state.education.previousDivision,
    medium: state.education.medium,
    board: state.education.board,
    passingYear: state.education.passingYear,
    rollNumber: state.education.rollNumber,
    registrationNumber: state.education.registrationNumber,
    address: state.address.presentAddress,
    permanentAddress: state.address.permanentAddress,
    district: state.address.district,
    state: state.address.state,
    pinCode: state.address.pinCode,
    documents: {
      photo: state.documents.photo.url,
      aadhaar: state.documents.aadhaar.url,
      marksheet: state.documents.marksheet.url,
      tc: state.documents.tc.url || null
    },
    payment: {
      admissionFee: state.payment.admissionFee,
      registrationFee: state.payment.registrationFee,
      otherCharges: state.payment.otherCharges,
      discount: state.payment.discount,
      total: state.payment.total,
      paymentMethod: state.payment.paymentMethod,
      transactionId: state.payment.transactionId,
      paymentStatus: state.payment.paymentStatus
    },
    status: "Active"
  };

  const generateBtn = page.querySelector('.btn-primary');
  if (generateBtn) { generateBtn.disabled = true; generateBtn.textContent = "Generating…"; }

  try {
    const result = await createStudent(payload);
    toast({ type: "success", title: "Admission Successful", message: `Admission #${result.admissionNumber}` });
    showSuccessScreen(page, result);
  } catch (e) {
    toast({ type: "error", title: "Admission Failed", message: e.message });
    if (generateBtn) { generateBtn.disabled = false; generateBtn.textContent = "Generate"; }
  }
}

// ---------- Success Screen ----------
function showSuccessScreen(page, student) {
  const container = page.querySelector('.card');
  if (!container) return;
  const body = container.querySelector('.card-body');
  if (!body) return;

  body.innerHTML = "";
  const successMsg = el("div", { style: "text-align: center; padding: 20px 0;" }, [
    el("div", { style: "font-size: 48px; color: var(--success); margin-bottom: 16px;", text: "Sucess" }),
    el("h2", { style: "margin-bottom: 8px;", text: "Admission Generated Successfully!" }),
    el("p", { style: "color: var(--muted); margin-bottom: 8px;", text: `Admission Number: ${student.admissionNumber}` }),
    el("p", { style: "color: var(--muted); margin-bottom: 20px;", text: `Student ID: ${student.admissionId}` })
  ]);
  body.appendChild(successMsg);

  const receiptNode = createAdmissionReceipt(student);
  body.appendChild(receiptNode);

  const actions = el("div", { class: "form-actions", style: "justify-content: center; gap: 12px; margin-top: 20px;" });
  const printBtn = el("button", { class: "btn btn-outline", html: `${ICON.print} Print Receipt`, onclick: () => printNode(receiptNode) });
  const doneBtn = el("button", { class: "btn btn-primary", text: "Done", onclick: () => location.hash = "#/students" });
  actions.appendChild(printBtn);
  actions.appendChild(doneBtn);
  body.appendChild(actions);

  const navRow = page.querySelector('.form-actions:last-child');
  if (navRow) navRow.style.display = 'none';
}

// ---------- Admission Receipt ----------
function createAdmissionReceipt(r) {
  const wrap = el("div", { class: "receipt print-area", style: "max-width: 100%; margin: 20px auto;" });
  wrap.appendChild(el("div", { class: "receipt-head" }, [
    el("div", { class: "receipt-brand" }, [
      el("div", { class: "logo" }, [el("span", { html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` })]),
      el("div", {}, [
        el("div", { class: "school-name", text: SCHOOL.name }),
        el("div", { class: "school-meta", text: SCHOOL.address }),
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
  const gridStyle = "display: grid; grid-template-columns: repeat(2, 1fr) !important; gap: 8px 24px; font-size: 13px;";

  wrap.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Personal Details" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Name", r.name), kv("Class", r.class),
      kv("DOB", fmtDate(r.dob)), kv("Gender", r.gender),
      kv("Blood Group", r.bloodGroup), kv("Category", r.category),
      kv("Religion", r.religion), kv("Nationality", r.nationality),
      kv("Mobile", r.phone), kv("Email", r.email),
      kv("Father", r.fatherName), kv("Mother", r.motherName),
      kv("Guardian", r.guardian)
    ])
  ]));

  wrap.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Address" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Present Address", r.address),
      kv("Permanent Address", r.permanentAddress),
      kv("District", r.district),
      kv("State", r.state),
      kv("PIN Code", r.pinCode)
    ])
  ]));

  wrap.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Payment" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, [
      kv("Admission Fee", r.payment?.admissionFee ? "₹" + r.payment.admissionFee : "—"),
      kv("Registration Fee", r.payment?.registrationFee ? "₹" + r.payment.registrationFee : "—"),
      kv("Other Charges", r.payment?.otherCharges ? "₹" + r.payment.otherCharges : "—"),
      kv("Discount", r.payment?.discount ? "₹" + r.payment.discount : "—"),
      kv("Total", r.payment?.total ? "₹" + r.payment.total : "—"),
      kv("Payment Method", r.payment?.paymentMethod),
      kv("Transaction ID", r.payment?.transactionId),
      kv("Status", r.payment?.paymentStatus)
    ])
  ]));

  wrap.appendChild(el("div", { class: "receipt-foot" }, [
    el("div", { class: "note", text: "This is a system-generated admission application. Please retain this copy for your records." }),
    el("div", { class: "sign" }, [el("div", { class: "line" }), el("div", { text: "Authorized Signatory" })])
  ]));
  return wrap;
}
