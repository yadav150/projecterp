// Teachers view — list, filter, search, add, edit, delete
import {
  el, ICON, initials, fmtDate, todayISO, fmtCurrency, GENDERS,
  DEPARTMENTS, DESIGNATIONS, required, isEmail, isPhone
} from "../utils.js";
import { DataTable, setCrumbs, openModal, confirmDialog, toast, loadingState } from "../ui.js";
import { subscribeTeachers, createTeacher, updateTeacher, deleteTeacher, getTeacher, updateTeacherSalary } from "../data.js";
import { renderTeacherAttendance } from "./teacherAttendance.js";
import { renderTeacherSubjects } from "./teacherSubjects.js";
import { renderTeacherExperience } from "./teacherExperience.js";

let unsub = null;

export function TeachersView({ id } = {}) {
  setCrumbs(id ? [{ label: "Teachers", href: "#/teachers" }, { label: "Profile" }] : [{ label: "Teachers" }]);
  if (id) return profilePage(id);

  const page = el("div", { "data-testid": "teachers-view" });
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Teachers" }),
      el("p", { class: "page-subtitle", text: "Manage teaching staff, departments and payroll info." })
    ]),
    el("div", { class: "page-actions" }, [
      el("button", { class: "btn btn-primary", "data-testid": "add-teacher-btn", onclick: () => openTeacherForm({ mode: "create" }), html: `${ICON.plus}<span>Add Teacher</span>` })
    ])
  ]));

  const mount = el("div"); page.appendChild(mount);
  mount.appendChild(loadingState("Loading teachers…"));

  const deptSel = el("select", { class: "select", "data-testid": "filter-dept" }, [
    el("option", { value: "", text: "All Departments" }),
    ...DEPARTMENTS.map(d => el("option", { value: d, text: d }))
  ]);
  const statusSel = el("select", { class: "select", "data-testid": "filter-tstatus" }, [
    el("option", { value: "", text: "All Status" }),
    el("option", { value: "Active", text: "Active" }),
    el("option", { value: "Inactive", text: "Inactive" })
  ]);
  let table = null, rows = [];
  [deptSel, statusSel].forEach(s => s.addEventListener("change", () => table && table.setRows(filtered())));
  function filtered() {
    return rows.filter(r => (!deptSel.value || r.department === deptSel.value) && (!statusSel.value || r.status === statusSel.value));
  }

  unsub && unsub();
  unsub = subscribeTeachers((list, err) => {
    if (err) { mount.innerHTML = ""; mount.appendChild(el("div", { class: "state", text: "Failed to load teachers." })); return; }
    rows = list;
    mount.innerHTML = "";
    table = DataTable({
      testId: "teachers-table",
      columns: [
        { key: "name", label: "Teacher", sortable: true, render: r => el("div", { class: "cell-user" }, [
          avatar(r),
          el("div", {}, [
            el("div", { class: "u-name", text: r.name || "—" }),
            el("div", { class: "u-sub", text: `${r.teacherId || "—"} · ${r.designation || ""}` })
          ])
        ]) },
        { key: "department", label: "Department", sortable: true, render: r => r.department || "—" },
        { key: "qualification", label: "Qualification", render: r => r.qualification || "—" },
        { key: "experience", label: "Exp.", sortable: true, render: r => r.experience ? `${r.experience} yrs` : "—" },
        { key: "phone", label: "Phone", render: r => r.phone || "—" },
        { key: "salary", label: "Salary", sortable: true, render: r => fmtCurrency(r.salary || 0) },
        { key: "status", label: "Status", render: r => `<span class="badge ${r.status === "Active" ? "green" : "slate"}">${r.status || "Active"}</span>` },
        { key: "_", label: "", render: r => rowActions([
          { icon: ICON.view, testId: `tview-${r.id}`, onClick: () => location.hash = `#/teachers/${r.id}`, label: "View" },
          { icon: ICON.edit, testId: `tedit-${r.id}`, onClick: () => openTeacherForm({ mode: "edit", record: r }), label: "Edit" },
          { icon: ICON.trash, danger: true, testId: `tdel-${r.id}`, onClick: async () => {
            if (await confirmDialog({ title: "Delete this teacher?", message: "This action cannot be undone." })) {
              await deleteTeacher(r.id); toast({ type: "success", title: "Teacher deleted" });
            }
          }, label: "Delete" }
        ]) }
      ],
      rows: filtered(),
      searchFields: ["name", "teacherId", "phone", "email", "department", "designation"],
      emptyTitle: "No teachers yet",
      emptySub: "Add your first teacher to build your staff roster.",
      toolbar: [deptSel, statusSel]
    });
    mount.appendChild(table.node);
  });
  page.addEventListener("view:unmount", () => { unsub && unsub(); unsub = null; });
  return page;
}

function avatar(r) {
  const a = el("div", { class: "avatar" });
  if (r.photoUrl) a.appendChild(el("img", { src: r.photoUrl }));
  else a.textContent = initials(r.name || "T");
  return a;
}

function rowActions(items) {
  const wrap = el("div", { class: "row-actions" });
  items.forEach(it => {
    const b = el("button", { class: `icon-btn-sm ${it.danger ? "danger" : ""}`, title: it.label, "data-testid": it.testId, html: it.icon });
    b.onclick = it.onClick; wrap.appendChild(b);
  });
  return wrap;
}

// ---------- Teacher Form (unchanged) ----------
export function openTeacherForm({ mode = "create", record = {} } = {}) {
  const body = el("div");
  const form = teacherFormFields(record);
  body.appendChild(form.node);
  const saveBtn = el("button", { class: "btn btn-primary", "data-testid": "save-teacher-btn", text: mode === "create" ? "Save Teacher" : "Update Teacher" });
  const cancelBtn = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: mode === "create" ? "Add Teacher" : "Edit Teacher", body, footer: [cancelBtn, saveBtn], size: "large" });
  cancelBtn.onclick = () => m.close();
  saveBtn.onclick = async () => {
    const data = form.getValue();
    const err = validateTeacher(data);
    if (err) { toast({ type: "error", title: "Validation error", message: err }); return; }
    saveBtn.disabled = true; saveBtn.textContent = "Saving…";
    try {
      if (mode === "create") {
        const created = await createTeacher(data, form.getPhoto());
        toast({ type: "success", title: "Teacher added", message: `ID: ${created.teacherId}` });
      } else {
        await updateTeacher(record.id, { ...data, photoUrl: record.photoUrl || null }, form.getPhoto());
        toast({ type: "success", title: "Teacher updated" });
      }
      m.close();
    } catch (e) {
      toast({ type: "error", title: "Save failed", message: e.message });
      saveBtn.disabled = false; saveBtn.textContent = mode === "create" ? "Save Teacher" : "Update Teacher";
    }
  };
}

export function teacherFormFields(record = {}) {
  let photoFile = null;
  const photoInput = el("input", { type: "file", accept: "image/*", style: "display:none;" });
  const av = el("div", { class: "avatar", style: "width:64px;height:64px;" });
  if (record.photoUrl) av.appendChild(el("img", { src: record.photoUrl })); else av.textContent = initials(record.name || "T");
  photoInput.addEventListener("change", e => {
    photoFile = e.target.files?.[0] || null;
    if (photoFile) { av.innerHTML = ""; av.appendChild(el("img", { src: URL.createObjectURL(photoFile) })); }
  });
  const uploader = el("div", { class: "photo-uploader" }, [
    av,
    el("div", { style: "flex:1" }, [
      el("div", { style: "font-weight:600;font-size:13px;", text: "Teacher photo" }),
      el("div", { class: "info", text: "PNG or JPG. Stored in Firebase Storage." })
    ]),
    el("button", { class: "btn btn-outline btn-sm", text: "Upload", onclick: () => photoInput.click() }),
    photoInput
  ]);

  const fields = [
    { key: "name", label: "Full Name", required: true },
    { key: "gender", label: "Gender", type: "select", options: GENDERS, required: true },
    { key: "qualification", label: "Qualification", required: true },
    { key: "experience", label: "Experience (yrs)", type: "number" },
    { key: "joiningDate", label: "Joining Date", type: "date", defaultValue: todayISO() },
    { key: "department", label: "Department", type: "select", options: DEPARTMENTS, required: true },
    { key: "designation", label: "Designation", type: "select", options: DESIGNATIONS, required: true },
    { key: "salary", label: "Monthly Salary (₹)", type: "number", required: true },
    { key: "phone", label: "Phone", required: true, section: "Contact" },
    { key: "email", label: "Email" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"], defaultValue: "Active" }
  ];
  const node = el("div"); node.appendChild(uploader);
  let currentSection = null;
  let grid = el("div", { class: "form-grid", style: "margin-top:16px;" });
  node.appendChild(grid);
  const inputs = {};
  fields.forEach(f => {
    if (f.section && f.section !== currentSection) {
      currentSection = f.section;
      node.appendChild(el("div", { class: "form-section-title", text: f.section }));
      grid = el("div", { class: "form-grid" }); node.appendChild(grid);
    }
    const row = el("div", { class: "form-row" });
    row.appendChild(el("label", { html: `${f.label} ${f.required ? '<span class="req">*</span>' : ""}` }));
    let inp;
    const val = record[f.key] ?? f.defaultValue ?? "";
    if (f.type === "select") {
      inp = el("select", { class: "select", "data-testid": `teacher-${f.key}` });
      inp.appendChild(el("option", { value: "", text: `Select ${f.label}` }));
      f.options.forEach(o => inp.appendChild(el("option", { value: o, text: o })));
      inp.value = val;
    } else if (f.type === "textarea") {
      inp = el("textarea", { class: "textarea", "data-testid": `teacher-${f.key}` });
      inp.value = val;
    } else {
      inp = el("input", { class: "input", type: f.type || "text", "data-testid": `teacher-${f.key}` });
      inp.value = val;
    }
    row.appendChild(inp); grid.appendChild(row);
    inputs[f.key] = inp;
  });
  return {
    node,
    getValue: () => {
      const o = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value?.trim?.() ?? v.value]));
      o.salary = Number(o.salary) || 0;
      o.experience = Number(o.experience) || 0;
      return o;
    },
    getPhoto: () => photoFile
  };
}

export function validateTeacher(d) {
  if (!required(d.name)) return "Full Name is required";
  if (!required(d.gender)) return "Gender is required";
  if (!required(d.qualification)) return "Qualification required";
  if (!required(d.department)) return "Department required";
  if (!required(d.designation)) return "Designation required";
  if (!(d.salary > 0)) return "Salary must be greater than 0";
  if (!required(d.phone) || !isPhone(d.phone)) return "Valid phone required";
  if (d.email && !isEmail(d.email)) return "Invalid email";
  return null;
}

// ---------- Profile Page (Simplified & Robust) ----------
async function profilePage(id) {
  const page = el("div", { "data-testid": "teacher-profile" });

  // Back button
  const backBtn = el("a", { class: "btn btn-outline", href: "#/teachers", html: `${ICON.chevL}<span>Back to Teachers</span>` });
  page.appendChild(el("div", { style: "margin-bottom:16px;" }, [backBtn]));

  try {
    const r = await getTeacher(id);
    if (!r) {
      page.appendChild(el("div", { class: "state", text: "Teacher not found" }));
      return page;
    }

    // --- Header ---
    const header = el("div", { class: "profile-head" }, [
      (() => { const a = el("div", { class: "avatar lg" }); if (r.photoUrl) a.appendChild(el("img", { src: r.photoUrl })); else a.textContent = initials(r.name); return a; })(),
      el("div", { class: "meta", style: "flex:1" }, [
        el("h2", { text: r.name }),
        el("p", { text: `${r.designation || "—"} · ${r.department || "—"}` }),
        el("div", { class: "chips" }, [
          el("span", { class: "badge indigo", text: r.teacherId || "" }),
          el("span", { class: `badge ${r.status === "Active" ? "green" : "slate"}`, text: r.status || "Active" })
        ])
      ]),
      el("button", { class: "btn btn-outline", onclick: () => openTeacherForm({ mode: "edit", record: r }), html: `${ICON.edit}<span>Edit</span>` })
    ]);
    page.appendChild(header);

    // --- Tab Bar ---
    const tabs = el("div", { class: "profile-tabs", style: "display:flex; gap:4px; margin:16px 0 12px 0; border-bottom:1px solid var(--border); padding-bottom:4px;" });
    const tabNames = ["Profile", "Attendance", "Subjects", "Experience", "Salary"];
    const tabButtons = [];
    const content = el("div", { class: "tab-content", style: "min-height:300px;" });

    tabNames.forEach(name => {
      const btn = el("button", {
        class: "btn btn-sm",
        style: `border-radius: var(--radius) var(--radius) 0 0; background:transparent; color:var(--text-2);`
      }, name);
      btn.dataset.tab = name;
      btn.addEventListener("click", () => switchTab(name));
      tabs.appendChild(btn);
      tabButtons.push(btn);
    });
    page.appendChild(tabs);
    page.appendChild(content);

    // --- Tab Renderers ---
    function renderProfile() {
      const details = [
        ["Name", r.name], ["Gender", r.gender], ["Qualification", r.qualification],
        ["Experience", r.experience ? `${r.experience} yrs` : "—"], ["Joining Date", fmtDate(r.joiningDate)],
        ["Department", r.department], ["Designation", r.designation], ["Salary", fmtCurrency(r.salary || 0)],
        ["Phone", r.phone], ["Email", r.email], ["Address", r.address], ["Status", r.status]
      ];
      return el("div", { class: "card" }, [
        el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Teacher Details" })]),
        el("div", { class: "card-body" }, [
          el("div", { class: "detail-grid" }, details.map(([k, v]) => el("div", { class: "detail-row" }, [
            el("div", { class: "k", text: k }), el("div", { class: "v", text: v || "—" })
          ])))
        ])
      ]);
    }

    function renderAttendance() {
      try { return renderTeacherAttendance(r.id); } catch (e) {
        return el("div", { class: "state", text: "Attendance module error: " + e.message });
      }
    }

    function renderSubjects() {
      try { return renderTeacherSubjects(r.id); } catch (e) {
        return el("div", { class: "state", text: "Subjects module error: " + e.message });
      }
    }

    function renderExperience() {
      try { return renderTeacherExperience(r.id); } catch (e) {
        return el("div", { class: "state", text: "Experience module error: " + e.message });
      }
    }

    function renderSalary() {
      const wrap = el("div", { class: "card" });
      wrap.appendChild(el("div", { class: "card-header" }, [
        el("div", { class: "card-title", text: "Salary Management" }),
        el("div", { class: "card-subtitle", text: "Update base salary for this teacher" })
      ]));
      const body = el("div", { class: "card-body" });
      const currentSal = fmtCurrency(r.salary || 0);
      body.appendChild(el("div", { style: "margin-bottom:12px;" }, [
        el("label", { style: "font-weight:600;", text: "Current Salary: " }),
        el("span", { style: "font-size:18px;color:var(--primary);", text: currentSal })
      ]));
      const newSalInput = el("input", { class: "input", type: "number", min: "0", step: "0.01", value: r.salary || 0, style: "max-width:200px;" });
      const updateBtn = el("button", { class: "btn btn-primary", text: "Update Salary", onclick: async () => {
        const val = Number(newSalInput.value);
        if (val <= 0) { toast({ type: "error", title: "Enter a valid salary" }); return; }
        updateBtn.disabled = true; updateBtn.textContent = "Updating…";
        try {
          await updateTeacherSalary(r.id, val);
          toast({ type: "success", title: "Salary updated" });
          // Reload the page to reflect changes
          location.hash = "#/teachers";
          setTimeout(() => location.hash = `#/teachers/${id}`, 100);
        } catch (e) {
          toast({ type: "error", title: "Update failed", message: e.message });
          updateBtn.disabled = false; updateBtn.textContent = "Update Salary";
        }
      }});
      body.appendChild(el("div", { style: "display:flex;gap:12px;align-items:center;margin-top:8px;" }, [
        el("label", { text: "New Salary: " }),
        newSalInput,
        updateBtn
      ]));
      wrap.appendChild(body);
      return wrap;
    }

    const tabRenderers = {
      "Profile": renderProfile,
      "Attendance": renderAttendance,
      "Subjects": renderSubjects,
      "Experience": renderExperience,
      "Salary": renderSalary
    };

    let currentTab = "Profile";

    function switchTab(name) {
      if (name === currentTab) return;
      currentTab = name;
      tabButtons.forEach(btn => {
        if (btn.dataset.tab === name) {
          btn.style.background = "var(--primary)";
          btn.style.color = "#fff";
        } else {
          btn.style.background = "transparent";
          btn.style.color = "var(--text-2)";
        }
      });
      content.innerHTML = "";
      const renderFn = tabRenderers[name];
      if (renderFn) {
        try {
          const node = renderFn();
          content.appendChild(node);
        } catch (e) {
          content.appendChild(el("div", { class: "state", text: "Error loading tab: " + e.message }));
        }
      }
    }

    // Initial render
    switchTab("Profile");

  } catch (e) {
    page.appendChild(el("div", { class: "state", text: "Failed to load teacher profile: " + e.message }));
  }

  return page;
}
