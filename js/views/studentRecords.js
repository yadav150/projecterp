// Extended Student Records – medical, past grades, disciplinary
import { el, ICON, fmtDate } from "../utils.js";
import { toast, openModal, loadingState, confirmDialog, DataTable } from "../ui.js";
import { getStudent, subscribeStudents } from "../data.js";
import { addMedicalNote, addDisciplinaryNote, addPastGrade, getStudentRecord } from "../data_academic.js";

export function StudentRecordsView({ id } = {}) {
  if (!id) {
    // Show list of students with a link to their extended record
    const page = el("div", { "data-testid": "student-records-view" });
    page.appendChild(el("div", { class: "page-header" }, [
      el("div", {}, [
        el("h1", { class: "page-title", text: "Student Records" }),
        el("p", { class: "page-subtitle", text: "Complete academic and personal records." })
      ])
    ]));
    const mount = el("div");
    page.appendChild(mount);
    mount.appendChild(loadingState("Loading students…"));
    const unsub = subscribeStudents((list) => {
      mount.innerHTML = "";
      const table = DataTable({
        testId: "student-records-table",
        columns: [
          { key: "name", label: "Student", sortable: true, render: r => r.name || "—" },
          { key: "admissionNumber", label: "Admission #", sortable: true },
          { key: "class", label: "Class" },
          { key: "_", label: "", render: r => el("a", { class: "btn btn-sm btn-outline", href: `#/student-records/${r.id}`, text: "View Record" }) }
        ],
        rows: list,
        searchFields: ["name", "admissionNumber"],
        emptyTitle: "No students found"
      });
      mount.appendChild(table.node);
    });
    page.addEventListener("view:unmount", () => unsub());
    return page;
  }

  // Individual record view
  return renderStudentRecord(id);
}

async function renderStudentRecord(id) {
  const page = el("div", { "data-testid": "student-record-detail" });
  const backBtn = el("a", { class: "btn btn-outline", href: "#/student-records", html: `${ICON.chevL}<span>Back</span>` });
  page.appendChild(el("div", { style: "margin-bottom:16px;" }, [backBtn]));

  const student = await getStudent(id);
  if (!student) {
    page.appendChild(el("div", { class: "state", text: "Student not found" }));
    return page;
  }

  // Header
  const header = el("div", { class: "profile-head" }, [
    (() => { const a = el("div", { class: "avatar lg" }); if (student.photoUrl) a.appendChild(el("img", { src: student.photoUrl })); else a.textContent = student.name?.[0] || "S"; return a; })(),
    el("div", { class: "meta", style: "flex:1" }, [
      el("h2", { text: student.name }),
      el("p", { text: `Class ${student.class || "—"} · Adm #${student.admissionNumber || "—"}` })
    ])
  ]);
  page.appendChild(header);

  // Tabs
  const tabs = el("div", { class: "profile-tabs", style: "display:flex; gap:4px; margin:16px 0 12px 0; border-bottom:1px solid var(--border); padding-bottom:4px;" });
  const tabNames = ["Medical", "Grades", "Disciplinary"];
  const tabButtons = [];
  const content = el("div", { class: "tab-content", style: "min-height:300px;" });
  tabNames.forEach(name => {
    const btn = el("button", { class: "btn btn-sm", style: `border-radius: var(--radius) var(--radius) 0 0; background:transparent; color:var(--text-2);` }, name);
    btn.dataset.tab = name;
    btn.addEventListener("click", () => switchTab(name));
    tabs.appendChild(btn);
    tabButtons.push(btn);
  });
  page.appendChild(tabs);
  page.appendChild(content);

  async function loadMedical() {
    const notes = await getStudentRecord(id, "medicalNotes") || [];
    const wrap = el("div", { class: "card" });
    wrap.appendChild(el("div", { class: "card-header" }, [
      el("div", { class: "card-title", text: "Medical Notes" }),
      el("button", { class: "btn btn-primary btn-sm", text: "Add Note", onclick: () => openMedicalNoteForm(id, loadMedical) })
    ]));
    const body = el("div", { class: "card-body" });
    if (!notes.length) {
      body.appendChild(el("div", { class: "state", text: "No medical notes." }));
    } else {
      const list = el("div", { style: "display:flex;flex-direction:column;gap:8px;" });
      notes.slice().reverse().forEach(n => {
        list.appendChild(el("div", { style: "padding:10px;border:1px solid var(--border);border-radius:var(--radius);" }, [
          el("div", { style: "font-weight:600;", text: n.condition || "General" }),
          el("div", { style: "font-size:13px;color:var(--text-2);", text: n.details || "" }),
          el("div", { style: "font-size:11px;color:var(--muted);margin-top:4px;", text: fmtDate(n.createdAt) })
        ]));
      });
      body.appendChild(list);
    }
    wrap.appendChild(body);
    return wrap;
  }

  async function loadGrades() {
    const grades = await getStudentRecord(id, "pastGrades") || [];
    const wrap = el("div", { class: "card" });
    wrap.appendChild(el("div", { class: "card-header" }, [
      el("div", { class: "card-title", text: "Past Grades" }),
      el("button", { class: "btn btn-primary btn-sm", text: "Add Grade", onclick: () => openGradeForm(id, loadGrades) })
    ]));
    const body = el("div", { class: "card-body" });
    if (!grades.length) {
      body.appendChild(el("div", { class: "state", text: "No past grades." }));
    } else {
      const table = el("table", { class: "data-table" });
      table.innerHTML = `<thead><tr><th>Class</th><th>Subject</th><th>Grade</th><th>Year</th></tr></thead>`;
      const tbody = el("tbody");
      grades.forEach(g => {
        tbody.appendChild(el("tr", {}, [
          el("td", { text: g.class || "—" }),
          el("td", { text: g.subject || "—" }),
          el("td", { text: g.grade || "—" }),
          el("td", { text: g.year || "—" })
        ]));
      });
      table.appendChild(tbody);
      body.appendChild(table);
    }
    wrap.appendChild(body);
    return wrap;
  }

  async function loadDisciplinary() {
    const records = await getStudentRecord(id, "disciplinary") || [];
    const wrap = el("div", { class: "card" });
    wrap.appendChild(el("div", { class: "card-header" }, [
      el("div", { class: "card-title", text: "Disciplinary Records" }),
      el("button", { class: "btn btn-primary btn-sm", text: "Add Record", onclick: () => openDisciplinaryForm(id, loadDisciplinary) })
    ]));
    const body = el("div", { class: "card-body" });
    if (!records.length) {
      body.appendChild(el("div", { class: "state", text: "No disciplinary records." }));
    } else {
      const list = el("div", { style: "display:flex;flex-direction:column;gap:8px;" });
      records.slice().reverse().forEach(r => {
        list.appendChild(el("div", { style: "padding:10px;border:1px solid var(--border);border-radius:var(--radius);" }, [
          el("div", { style: "font-weight:600;", text: r.type || "Note" }),
          el("div", { style: "font-size:13px;color:var(--text-2);", text: r.details || "" }),
          el("div", { style: "font-size:11px;color:var(--muted);margin-top:4px;", text: fmtDate(r.createdAt) })
        ]));
      });
      body.appendChild(list);
    }
    wrap.appendChild(body);
    return wrap;
  }

  const tabRenderers = {
    "Medical": loadMedical,
    "Grades": loadGrades,
    "Disciplinary": loadDisciplinary
  };

  let currentTab = "Medical";
  async function switchTab(name) {
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
        const node = await renderFn();
        content.appendChild(node);
      } catch (e) {
        content.appendChild(el("div", { class: "state", text: "Error: " + e.message }));
      }
    }
  }
  switchTab("Medical");
  return page;
}

// ---------- Forms ----------
function openMedicalNoteForm(studentId, callback) {
  const body = el("div");
  const grid = el("div", { class: "form-grid" });
  const condition = el("input", { class: "input", placeholder: "Condition (e.g. Asthma, Allergy)" });
  const details = el("textarea", { class: "textarea", placeholder: "Details / Notes", rows: 3 });
  grid.appendChild(field("Condition", condition));
  grid.appendChild(field("Details", details));
  body.appendChild(grid);
  const save = el("button", { class: "btn btn-primary", text: "Save" });
  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: "Add Medical Note", body, footer: [cancel, save] });
  cancel.onclick = () => m.close();
  save.onclick = async () => {
    if (!condition.value.trim()) { toast({ type: "error", title: "Condition is required" }); return; }
    save.disabled = true; save.textContent = "Saving…";
    await addMedicalNote(studentId, { condition: condition.value.trim(), details: details.value.trim() });
    toast({ type: "success", title: "Medical note added" });
    m.close();
    callback();
  };
}

function openGradeForm(studentId, callback) {
  const body = el("div");
  const grid = el("div", { class: "form-grid" });
  const cls = el("input", { class: "input", placeholder: "Class (e.g. V)" });
  const subject = el("input", { class: "input", placeholder: "Subject" });
  const grade = el("input", { class: "input", placeholder: "Grade (e.g. A+)" });
  const year = el("input", { class: "input", placeholder: "Year" });
  grid.appendChild(field("Class", cls));
  grid.appendChild(field("Subject", subject));
  grid.appendChild(field("Grade", grade));
  grid.appendChild(field("Year", year));
  body.appendChild(grid);
  const save = el("button", { class: "btn btn-primary", text: "Save" });
  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: "Add Past Grade", body, footer: [cancel, save] });
  cancel.onclick = () => m.close();
  save.onclick = async () => {
    if (!cls.value.trim() || !subject.value.trim() || !grade.value.trim()) { toast({ type: "error", title: "All fields required" }); return; }
    save.disabled = true; save.textContent = "Saving…";
    await addPastGrade(studentId, { class: cls.value.trim(), subject: subject.value.trim(), grade: grade.value.trim(), year: year.value.trim() });
    toast({ type: "success", title: "Grade added" });
    m.close();
    callback();
  };
}

function openDisciplinaryForm(studentId, callback) {
  const body = el("div");
  const grid = el("div", { class: "form-grid" });
  const type = el("input", { class: "input", placeholder: "Type (e.g. Warning, Suspension)" });
  const details = el("textarea", { class: "textarea", placeholder: "Details", rows: 3 });
  grid.appendChild(field("Type", type));
  grid.appendChild(field("Details", details));
  body.appendChild(grid);
  const save = el("button", { class: "btn btn-primary", text: "Save" });
  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: "Add Disciplinary Record", body, footer: [cancel, save] });
  cancel.onclick = () => m.close();
  save.onclick = async () => {
    if (!type.value.trim()) { toast({ type: "error", title: "Type is required" }); return; }
    save.disabled = true; save.textContent = "Saving…";
    await addDisciplinaryNote(studentId, { type: type.value.trim(), details: details.value.trim() });
    toast({ type: "success", title: "Disciplinary record added" });
    m.close();
    callback();
  };
}

function field(label, node) {
  return el("div", { class: "form-row" }, [el("label", { text: label }), node]);
}
