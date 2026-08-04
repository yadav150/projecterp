// Students view — list, filter, search, add, edit, delete, profile
import {
  el, ICON, initials, fmtDate, todayISO, CLASSES, SECTIONS, GENDERS,
  BLOOD, CATEGORIES, RELIGIONS, ageFromDob, required, isEmail, isPhone
} from "../utils.js";
import { DataTable, setCrumbs, openModal, confirmDialog, toast, loadingState } from "../ui.js";
import { subscribeStudents, createStudent, updateStudent, deleteStudent, getStudent } from "../data.js";
import { renderStudentProfile } from "./student-profile.js";

let unsub = null;

export function StudentsView({ id } = {}) {
  setCrumbs(id ? [{ label: "Students", href: "#/students" }, { label: "Profile" }] : [{ label: "Students" }]);
  const page = el("div", { "data-testid": "students-view" });

  if (id) return profilePage(id);

  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Students" }),
      el("p", { class: "page-subtitle", text: "Manage student records from Nursery to Class VIII." })
    ]),
    el("div", { class: "page-actions" }, [
      el("button", {
        class: "btn btn-primary", "data-testid": "add-student-btn",
        onclick: () => openStudentForm({ mode: "create" })
      }, [
        el("span", { html: ICON.plus }), el("span", { text: "Add Student" })
      ])
    ])
  ]));

  const listMount = el("div");
  page.appendChild(listMount);
  listMount.appendChild(loadingState("Loading students…"));

  let rows = [];
  let table = null;

  const classSel = el("select", { class: "select", "data-testid": "filter-class" }, [
    el("option", { value: "", text: "All Classes" }),
    ...CLASSES.map(c => el("option", { value: c, text: c }))
  ]);
  const sectionSel = el("select", { class: "select", "data-testid": "filter-section" }, [
    el("option", { value: "", text: "All Sections" }),
    ...SECTIONS.map(c => el("option", { value: c, text: c }))
  ]);
  const statusSel = el("select", { class: "select", "data-testid": "filter-status" }, [
    el("option", { value: "", text: "All Status" }),
    el("option", { value: "Active", text: "Active" }),
    el("option", { value: "Inactive", text: "Inactive" }),
    el("option", { value: "Alumni", text: "Alumni" })
  ]);
  [classSel, sectionSel, statusSel].forEach(s => s.addEventListener("change", refresh));
  function currentFiltered() {
    return rows.filter(r =>
      (!classSel.value || r.class === classSel.value) &&
      (!sectionSel.value || r.section === sectionSel.value) &&
      (!statusSel.value || r.status === statusSel.value)
    );
  }
  function refresh() { if (table) table.setRows(currentFiltered()); }

  unsub && unsub();
  unsub = subscribeStudents((list, err) => {
    if (err) { listMount.innerHTML = ""; listMount.appendChild(el("div", { class: "state", text: "Failed to load students. Check Firebase rules." })); return; }
    rows = list;
    listMount.innerHTML = "";
    table = DataTable({
      testId: "students-table",
      columns: [
        {
          key: "name", label: "Student", sortable: true,
          render: r => el("div", { class: "cell-user" }, [
            avatarNode(r),
            el("div", {}, [
              el("div", { class: "u-name", text: r.name || "—" }),
              el("div", { class: "u-sub", text: `Adm #${r.admissionNumber || "—"} · ${r.admissionId || ""}` })
            ])
          ])
        },
        { key: "class", label: "Class", sortable: true, render: r => `${r.class || "—"} ${r.section ? `· ${r.section}` : ""}` },
        { key: "rollNumber", label: "Roll #", sortable: true, render: r => r.rollNumber || "—" },
        { key: "fatherName", label: "Father", sortable: true, render: r => r.fatherName || "—" },
        { key: "phone", label: "Phone", render: r => r.phone || "—" },
        { key: "admissionDate", label: "Admission", sortable: true, render: r => fmtDate(r.admissionDate) },
        {
          key: "status", label: "Status",
          render: r => `<span class="badge ${r.status === "Active" ? "green" : r.status === "Alumni" ? "indigo" : "slate"}">${r.status || "Active"}</span>`
        },
        {
          key: "_actions", label: "",
          render: r => rowActions([
            { icon: ICON.view, label: "View", testId: `view-${r.id}`, onClick: () => location.hash = `#/students/${r.id}` },
            { icon: ICON.edit, label: "Edit", testId: `edit-${r.id}`, onClick: () => openStudentForm({ mode: "edit", record: r }) },
            { icon: ICON.trash, label: "Delete", danger: true, testId: `del-${r.id}`, onClick: async () => {
              if (await confirmDialog({ title: "Delete this student?", message: "This action cannot be undone." })) {
                await deleteStudent(r.id); toast({ type: "success", title: "Student deleted" });
              }
            }}
          ])
        }
      ],
      rows: currentFiltered(),
      searchFields: ["name", "fatherName", "motherName", "admissionNumber", "admissionId", "phone", "email", "rollNumber"],
      emptyTitle: "No students found",
      emptySub: "Add your first student to get started.",
      toolbar: [classSel, sectionSel, statusSel]
    });
    listMount.appendChild(table.node);
  });

  page.addEventListener("view:unmount", () => { unsub && unsub(); unsub = null; });
  return page;
}

function avatarNode(r) {
  const av = el("div", { class: "avatar" });
  if (r.photoUrl) av.appendChild(el("img", { src: r.photoUrl, alt: "" }));
  else av.textContent = initials(r.name || "");
  return av;
}

function rowActions(items) {
  const wrap = el("div", { class: "row-actions" });
  items.forEach(it => {
    const b = el("button", { class: `icon-btn-sm ${it.danger ? "danger" : ""}`, title: it.label, "data-testid": it.testId, html: it.icon });
    b.onclick = it.onClick;
    wrap.appendChild(b);
  });
  return wrap;
}

export function openStudentForm({ mode = "create", record = {}, onCreated } = {}) {
  const body = el("div");
  const form = studentFormFields(record);
  body.appendChild(form.node);

  const saveBtn = el("button", { class: "btn btn-primary", "data-testid": "save-student-btn", text: mode === "create" ? "Save Student" : "Update Student" });
  const cancelBtn = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: mode === "create" ? "Add Student" : "Edit Student", body, footer: [cancelBtn, saveBtn], size: "large" });
  cancelBtn.onclick = () => m.close();
  saveBtn.onclick = async () => {
    const data = form.getValue();
    const err = validateStudent(data);
    if (err) { toast({ type: "error", title: "Validation error", message: err }); return; }
    saveBtn.disabled = true; saveBtn.textContent = "Saving…";
    try {
      if (mode === "create") {
        const created = await createStudent(data, form.getPhoto());
        toast({ type: "success", title: "Student added", message: `Admission #${created.admissionNumber}` });
        onCreated && onCreated(created);
      } else {
        await updateStudent(record.id, { ...data, photoUrl: record.photoUrl || null }, form.getPhoto());
        toast({ type: "success", title: "Student updated" });
      }
      m.close();
    } catch (e) {
      console.error(e);
      toast({ type: "error", title: "Save failed", message: e.message || "Please try again." });
      saveBtn.disabled = false; saveBtn.textContent = mode === "create" ? "Save Student" : "Update Student";
    }
  };
}

export function studentFormFields(record = {}) {
  let photoFile = null;
  const photoInput = el("input", { type: "file", accept: "image/*", style: "display:none;", "data-testid": "photo-input" });
  const photoAvatar = el("div", { class: "avatar", style: "width:64px;height:64px;" });
  if (record.photoUrl) photoAvatar.appendChild(el("img", { src: record.photoUrl }));
  else photoAvatar.textContent = initials(record.name || "S");
  photoInput.addEventListener("change", (e) => {
    photoFile = e.target.files?.[0] || null;
    if (photoFile) {
      const url = URL.createObjectURL(photoFile);
      photoAvatar.innerHTML = "";
      photoAvatar.appendChild(el("img", { src: url }));
    }
  });
  const photoUploader = el("div", { class: "photo-uploader" }, [
    photoAvatar,
    el("div", { style: "flex:1" }, [
      el("div", { style: "font-weight:600;font-size:13px;", text: "Student photo" }),
      el("div", { class: "info", text: "PNG, JPG up to a few MB. Stored in Firebase Storage." })
    ]),
    el("button", { class: "btn btn-outline btn-sm", text: "Upload", onclick: () => photoInput.click() }),
    photoInput
  ]);

  const fields = [
    { key: "name", label: "Student Name", required: true },
    { key: "gender", label: "Gender", type: "select", options: GENDERS, required: true },
    { key: "dob", label: "Date of Birth", type: "date", required: true },
    { key: "class", label: "Class", type: "select", options: CLASSES, required: true },
    { key: "section", label: "Section", type: "select", options: SECTIONS },
    { key: "rollNumber", label: "Roll Number" },
    { key: "fatherName", label: "Father Name", required: true, section: "Parents & Guardian" },
    { key: "motherName", label: "Mother Name" },
    { key: "guardian", label: "Guardian (if any)" },
    { key: "phone", label: "Phone", required: true },
    { key: "emergencyContact", label: "Emergency Contact" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address", type: "textarea", section: "Address & Details" },
    { key: "bloodGroup", label: "Blood Group", type: "select", options: BLOOD },
    { key: "religion", label: "Religion", type: "select", options: RELIGIONS },
    { key: "category", label: "Category", type: "select", options: CATEGORIES },
    { key: "previousSchool", label: "Previous School" },
    { key: "admissionDate", label: "Admission Date", type: "date", defaultValue: todayISO() },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Alumni"], defaultValue: "Active" }
  ];

  const node = el("div");
  node.appendChild(photoUploader);
  let currentSection = null;
  let grid = el("div", { class: "form-grid", style: "margin-top:16px;" });
  node.appendChild(grid);
  const inputs = {};
  fields.forEach(f => {
    if (f.section && f.section !== currentSection) {
      currentSection = f.section;
      node.appendChild(el("div", { class: "form-section-title", text: f.section }));
      grid = el("div", { class: "form-grid" });
      node.appendChild(grid);
    }
    const row = el("div", { class: "form-row" });
    row.appendChild(el("label", { html: `${f.label} ${f.required ? '<span class="req">*</span>' : ""}` }));
    let inp;
    const val = record[f.key] ?? f.defaultValue ?? "";
    if (f.type === "select") {
      inp = el("select", { class: "select", "data-testid": `student-${f.key}` });
      inp.appendChild(el("option", { value: "", text: `Select ${f.label}` }));
      f.options.forEach(o => inp.appendChild(el("option", { value: o, text: o })));
      inp.value = val;
    } else if (f.type === "textarea") {
      inp = el("textarea", { class: "textarea", "data-testid": `student-${f.key}`, rows: 2 });
      inp.value = val;
    } else {
      inp = el("input", { class: "input", type: f.type || "text", "data-testid": `student-${f.key}` });
      inp.value = val;
    }
    row.appendChild(inp);
    grid.appendChild(row);
    inputs[f.key] = inp;
  });

  return {
    node,
    getValue: () => Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value?.trim?.() ?? v.value])),
    getPhoto: () => photoFile
  };
}

export function validateStudent(d) {
  if (!required(d.name)) return "Student Name is required";
  if (!required(d.gender)) return "Gender is required";
  if (!required(d.dob)) return "Date of Birth is required";
  if (!required(d.class)) return "Class is required";
  if (!required(d.fatherName)) return "Father's name is required";
  if (!required(d.phone) || !isPhone(d.phone)) return "Valid phone number required";
  if (d.email && !isEmail(d.email)) return "Invalid email";
  return null;
}

// Profile page using the new renderer from student-profile.js
function profilePage(id) {
  const page = el("div", { "data-profile-root": true, "data-testid": "student-profile" });
  renderStudentProfile(id, page);
  return page;
}
