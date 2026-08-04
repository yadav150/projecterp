// Student Profile – comprehensive view with editing, photo & document management
import { el, ICON, initials, fmtDate, fmtCurrency, ageFromDob, required, isEmail, isPhone } from "../utils.js";
import { openModal, toast, confirmDialog, loadingState } from "../ui.js";
import { getStudent, updateStudent, addStudentDocument, removeStudentDocument, updateStudentPhoto } from "../data.js";
import { studentFormFields, validateStudent } from "./students.js";

/**
 * Main profile renderer – displays all student information in organized sections
 * @param {string} id - Student ID
 * @param {HTMLElement} container - Container element to render into
 */
export function renderStudentProfile(id, container) {
  container.innerHTML = "";
  container.appendChild(loadingState("Loading student…"));

  getStudent(id).then(r => {
    container.innerHTML = "";
    if (!r) {
      container.appendChild(el("div", { class: "state", text: "Student not found" }));
      return;
    }

    const student = r;

    // ---- Profile header ----
    const header = el("div", { class: "profile-head" }, [
      photoSection(student),
      el("div", { class: "meta", style: "flex:1" }, [
        el("h2", { text: student.name }),
        el("p", { text: `Class ${student.class || "—"} · Section ${student.section || "—"} · Roll ${student.rollNumber || "—"}` }),
        el("div", { class: "chips" }, [
          el("span", { class: "badge indigo", text: `Adm #${student.admissionNumber || "—"}` }),
          el("span", { class: "badge slate", text: student.admissionId || "" }),
          el("span", { class: `badge ${student.status === "Active" ? "green" : "slate"}`, text: student.status || "Active" })
        ])
      ]),
      el("div", { class: "page-actions" }, [
        el("button", { class: "btn btn-primary", onclick: () => openStudentProfileEdit(student), html: `${ICON.edit}<span>Edit Profile</span>` })
      ])
    ]);
    container.appendChild(header);

    // ---- Personal Information ----
    container.appendChild(sectionCard("Personal Information", [
      ["Full Name", student.name],
      ["Gender", student.gender],
      ["Date of Birth", fmtDate(student.dob)],
      ["Age", ageFromDob(student.dob)],
      ["Blood Group", student.bloodGroup || "—"],
      ["Religion", student.religion || "—"],
      ["Category", student.category || "—"]
    ]));

    // ---- Academic Details ----
    container.appendChild(sectionCard("Academic Details", [
      ["Class", student.class || "—"],
      ["Section", student.section || "—"],
      ["Roll Number", student.rollNumber || "—"],
      ["Admission Date", fmtDate(student.admissionDate)],
      ["Previous School", student.previousSchool || "—"],
      ["Admission ID", student.admissionId || "—"],
      ["Admission Number", student.admissionNumber || "—"],
      ["Status", student.status || "Active"]
    ]));

    // ---- Parents & Guardian ----
    container.appendChild(sectionCard("Parents & Guardian", [
      ["Father's Name", student.fatherName || "—"],
      ["Mother's Name", student.motherName || "—"],
      ["Guardian", student.guardian || "—"]
    ]));

    // ---- Contact & Address ----
    container.appendChild(sectionCard("Contact & Address", [
      ["Phone", student.phone || "—"],
      ["Emergency Contact", student.emergencyContact || "—"],
      ["Email", student.email || "—"],
      ["Address", student.address || "—"]
    ]));

    // ---- Documents Section ----
    container.appendChild(documentsSection(student));
  });
}

function sectionCard(title, pairs) {
  const card = el("div", { class: "card", style: "margin-bottom:16px;" });
  card.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: title })]));
  const body = el("div", { class: "card-body" });
  const grid = el("div", { class: "detail-grid" });
  pairs.forEach(([label, value]) => {
    grid.appendChild(el("div", { class: "detail-row" }, [
      el("div", { class: "k", text: label }),
      el("div", { class: "v", text: value })
    ]));
  });
  body.appendChild(grid);
  card.appendChild(body);
  return card;
}

function photoSection(student) {
  const wrap = el("div", { style: "display:flex;flex-direction:column;align-items:center;gap:8px;" });
  const avatar = el("div", { class: "avatar lg" });
  if (student.photoUrl) avatar.appendChild(el("img", { src: student.photoUrl, alt: student.name }));
  else avatar.textContent = initials(student.name);
  wrap.appendChild(avatar);

  const uploadBtn = el("button", { class: "btn btn-outline btn-sm", text: "Update Photo" });
  const fileInput = el("input", { type: "file", accept: "image/*", style: "display:none;" });
  uploadBtn.onclick = () => fileInput.click();

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: "error", title: "File too large", message: "Max 5MB" });
      fileInput.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ type: "error", title: "Invalid file type", message: "Please upload an image." });
      fileInput.value = "";
      return;
    }
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading…";
    try {
      const newUrl = await updateStudentPhoto(student.id, file);
      avatar.innerHTML = "";
      avatar.appendChild(el("img", { src: newUrl, alt: student.name }));
      toast({ type: "success", title: "Photo updated" });
      const container = wrap.closest('[data-profile-root]');
      if (container) renderStudentProfile(student.id, container);
    } catch (err) {
      toast({ type: "error", title: "Upload failed", message: err.message });
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Update Photo";
      fileInput.value = "";
    }
  };
  wrap.appendChild(uploadBtn);
  wrap.appendChild(fileInput);
  return wrap;
}

function documentsSection(student) {
  const wrap = el("div", { class: "card", style: "margin-bottom:16px;" });
  wrap.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Documents" }),
    el("button", { class: "btn btn-primary btn-sm", onclick: () => openDocumentUpload(student.id), html: `${ICON.plus}<span>Upload</span>` })
  ]));
  const body = el("div", { class: "card-body" });
  const docs = student.documents || [];
  if (!docs.length) {
    body.appendChild(el("div", { class: "state", style: "padding:20px;" }, [
      el("div", { html: ICON.inbox }),
      el("div", { class: "state-sub", text: "No documents uploaded." })
    ]));
  } else {
    const list = el("div", { style: "display:flex;flex-direction:column;gap:8px;" });
    docs.forEach(doc => {
      const row = el("div", { style: "display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid var(--border);" }, [
        el("div", { style: "flex:1;min-width:0;" }, [
          el("div", { style: "font-weight:600;", text: doc.name }),
          el("div", { style: "font-size:12px;color:var(--muted);", text: `${(doc.size/1024).toFixed(1)} KB · ${new Date(doc.uploadedAt).toLocaleDateString()}` })
        ]),
        el("div", { style: "display:flex;gap:6px;flex-shrink:0;" }, [
          el("a", { href: doc.url, target: "_blank", class: "btn btn-sm btn-outline", text: "Preview" }),
          el("a", { href: doc.url, download: doc.name, class: "btn btn-sm btn-outline", html: ICON.download }),
          el("button", { class: "btn btn-sm btn-danger", onclick: async () => {
            if (await confirmDialog({ title: "Delete document?", message: `Are you sure you want to delete "${doc.name}"?` })) {
              await removeStudentDocument(student.id, doc.id);
              toast({ type: "success", title: "Document deleted" });
              const container = wrap.closest('[data-profile-root]');
              if (container) renderStudentProfile(student.id, container);
            }
          }, html: ICON.trash })
        ])
      ]);
      list.appendChild(row);
    });
    body.appendChild(list);
  }
  wrap.appendChild(body);
  return wrap;
}

function openDocumentUpload(studentId) {
  const body = el("div", { style: "padding:12px;" });
  const fileInput = el("input", { type: "file", multiple: false, style: "width:100%;padding:8px;" });
  const hint = el("div", { style: "font-size:12px;color:var(--muted);margin-top:6px;", text: "Supported: PDF, DOC, DOCX, JPG, PNG (max 10MB)" });
  body.appendChild(fileInput);
  body.appendChild(hint);

  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const upload = el("button", { class: "btn btn-primary", text: "Upload" });
  const m = openModal({ title: "Upload Document", body, footer: [cancel, upload] });

  cancel.onclick = () => m.close();
  upload.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) { toast({ type: "error", title: "No file selected" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ type: "error", title: "File too large", message: "Max 10MB" }); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { toast({ type: "error", title: "Invalid file type", message: "PDF, DOC, DOCX, JPG, PNG only." }); return; }
    upload.disabled = true;
    upload.textContent = "Uploading…";
    try {
      await addStudentDocument(studentId, file);
      toast({ type: "success", title: "Document uploaded" });
      m.close();
      const profileContainer = document.querySelector('[data-profile-root]');
      if (profileContainer) renderStudentProfile(studentId, profileContainer);
    } catch (err) {
      toast({ type: "error", title: "Upload failed", message: err.message });
      upload.disabled = false;
      upload.textContent = "Upload";
    }
  };
}

export function openStudentProfileEdit(student) {
  const body = el("div");
  const form = studentFormFields(student);
  body.appendChild(form.node);

  const saveBtn = el("button", { class: "btn btn-primary", "data-testid": "save-profile-btn", text: "Save Changes" });
  const cancelBtn = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: "Edit Student Profile", body, footer: [cancelBtn, saveBtn], size: "large" });

  cancelBtn.onclick = () => m.close();
  saveBtn.onclick = async () => {
    const data = form.getValue();
    const err = validateStudent(data);
    if (err) { toast({ type: "error", title: "Validation error", message: err }); return; }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      await updateStudent(student.id, { ...data, photoUrl: student.photoUrl || null }, form.getPhoto());
      toast({ type: "success", title: "Profile updated" });
      m.close();
      const container = document.querySelector('[data-profile-root]');
      if (container) renderStudentProfile(student.id, container);
    } catch (e) {
      toast({ type: "error", title: "Save failed", message: e.message });
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  };
}
