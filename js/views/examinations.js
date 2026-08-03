// Examinations and Gradebooks
import { el, ICON, fmtDate, todayISO } from "../utils.js";
import { toast, openModal, loadingState, confirmDialog, DataTable } from "../ui.js";
import { subscribeStudents } from "../data.js";
import { createExam, updateExam, deleteExam, getExam, subscribeExams, recordMarks, getMarks, getStudentMarks } from "../data_academic.js";

export function ExaminationsView() {
  const page = el("div", { "data-testid": "examinations-view" });
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Examinations & Gradebook" }),
      el("p", { class: "page-subtitle", text: "Manage exams, record marks, and generate report cards." })
    ]),
    el("div", { class: "page-actions" }, [
      el("button", { class: "btn btn-primary", onclick: () => openExamForm(null, refresh), html: `${ICON.plus}<span>Create Exam</span>` })
    ])
  ]));

  const mount = el("div");
  page.appendChild(mount);
  mount.appendChild(loadingState("Loading exams…"));

  let exams = [];
  let table = null;

  function refresh() {
    if (table) table.rerender();
    else render();
  }

  const unsub = subscribeExams((list) => {
    exams = list;
    render();
  });

  function render() {
    mount.innerHTML = "";
    table = DataTable({
      testId: "exams-table",
      columns: [
        { key: "examId", label: "Exam ID", sortable: true },
        { key: "name", label: "Name", sortable: true },
        { key: "class", label: "Class", sortable: true },
        { key: "subject", label: "Subject" },
        { key: "date", label: "Date", render: r => fmtDate(r.date) },
        { key: "maxMarks", label: "Max Marks", sortable: true },
        {
          key: "_actions", label: "",
          render: r => el("div", { class: "row-actions" }, [
            el("button", { class: "icon-btn-sm", html: ICON.edit, onclick: () => openExamForm(r, refresh), title: "Edit" }),
            el("button", { class: "icon-btn-sm", html: ICON.view, onclick: () => openMarksEntry(r, refresh), title: "Enter Marks" }),
            el("button", { class: "icon-btn-sm", html: ICON.receipt, onclick: () => generateReportCard(r), title: "Report Card" }),
            el("button", { class: "icon-btn-sm danger", html: ICON.trash, onclick: async () => {
              if (await confirmDialog({ title: "Delete this exam?" })) {
                await deleteExam(r.id);
                toast({ type: "success", title: "Exam deleted" });
                refresh();
              }
            }, title: "Delete" })
          ])
        }
      ],
      rows: exams,
      searchFields: ["name", "examId", "class", "subject"],
      emptyTitle: "No exams created",
      emptySub: "Click 'Create Exam' to start."
    });
    mount.appendChild(table.node);
  }

  page.addEventListener("view:unmount", () => unsub());
  return page;
}

function openExamForm(exam, callback) {
  const isEdit = !!exam;
  const body = el("div");
  const grid = el("div", { class: "form-grid" });
  const name = el("input", { class: "input", value: exam?.name || "", placeholder: "Exam Name" });
  const cls = el("input", { class: "input", value: exam?.class || "", placeholder: "Class (e.g. V)" });
  const subject = el("input", { class: "input", value: exam?.subject || "", placeholder: "Subject" });
  const date = el("input", { class: "input", type: "date", value: exam?.date || todayISO() });
  const maxMarks = el("input", { class: "input", type: "number", value: exam?.maxMarks || "", placeholder: "Max Marks" });
  grid.appendChild(field("Name *", name));
  grid.appendChild(field("Class *", cls));
  grid.appendChild(field("Subject *", subject));
  grid.appendChild(field("Date *", date));
  grid.appendChild(field("Max Marks *", maxMarks));
  body.appendChild(grid);

  const save = el("button", { class: "btn btn-primary", text: isEdit ? "Update" : "Create" });
  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: isEdit ? "Edit Exam" : "Create Exam", body, footer: [cancel, save] });
  cancel.onclick = () => m.close();
  save.onclick = async () => {
    if (!name.value.trim() || !cls.value.trim() || !subject.value.trim() || !date.value || !maxMarks.value) {
      toast({ type: "error", title: "All fields required" });
      return;
    }
    save.disabled = true; save.textContent = "Saving…";
    const payload = { name: name.value.trim(), class: cls.value.trim(), subject: subject.value.trim(), date: date.value, maxMarks: Number(maxMarks.value) };
    try {
      if (isEdit) {
        await updateExam(exam.id, payload);
        toast({ type: "success", title: "Exam updated" });
      } else {
        await createExam(payload);
        toast({ type: "success", title: "Exam created" });
      }
      m.close();
      callback();
    } catch (e) {
      toast({ type: "error", title: "Failed", message: e.message });
      save.disabled = false; save.textContent = isEdit ? "Update" : "Create";
    }
  };
}

async function openMarksEntry(exam, callback) {
  const body = el("div");
  body.appendChild(el("p", { style: "margin-bottom:12px;color:var(--muted);", text: `Enter marks for ${exam.name} (${exam.subject})` }));

  const mount = el("div");
  body.appendChild(mount);
  mount.appendChild(loadingState("Loading students…"));

  const students = await new Promise((resolve) => {
    subscribeStudents((list) => resolve(list));
  });

  const marksData = await getMarks(exam.id);

  const table = el("table", { class: "data-table" });
  table.innerHTML = `<thead><tr><th>Student</th><th>Marks (Max: ${exam.maxMarks})</th></tr></thead>`;
  const tbody = el("tbody");
  students.forEach(s => {
    const currentMarks = marksData[s.id]?.marks || "";
    const tr = el("tr", {}, [
      el("td", { text: s.name }),
      el("td", {}, [
        el("input", { class: "input", type: "number", min: "0", max: exam.maxMarks, value: currentMarks, style: "max-width:120px;", "data-student": s.id })
      ])
    ]);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  mount.innerHTML = "";
  mount.appendChild(table);

  const save = el("button", { class: "btn btn-primary", text: "Save Marks" });
  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: "Enter Marks", body, footer: [cancel, save], size: "large" });
  cancel.onclick = () => m.close();
  save.onclick = async () => {
    const inputs = mount.querySelectorAll("input[data-student]");
    const updates = [];
    inputs.forEach(inp => {
      const studentId = inp.dataset.student;
      const marks = Number(inp.value);
      if (!isNaN(marks) && marks >= 0) {
        updates.push(recordMarks(exam.id, studentId, marks, exam.subject));
      }
    });
    save.disabled = true; save.textContent = "Saving…";
    try {
      await Promise.all(updates);
      toast({ type: "success", title: "Marks saved" });
      m.close();
      callback();
    } catch (e) {
      toast({ type: "error", title: "Failed", message: e.message });
      save.disabled = false; save.textContent = "Save Marks";
    }
  };
}

async function generateReportCard(exam) {
  const marks = await getMarks(exam.id);
  const students = await new Promise((resolve) => {
    subscribeStudents((list) => resolve(list));
  });
  const body = el("div");
  body.appendChild(el("h3", { style: "margin-bottom:8px;", text: `Report Card: ${exam.name}` }));
  body.appendChild(el("p", { style: "color:var(--muted);margin-bottom:16px;", text: `${exam.class} · ${exam.subject} · Max Marks: ${exam.maxMarks}` }));
  const table = el("table", { class: "data-table" });
  table.innerHTML = `<thead><tr><th>Student</th><th>Marks</th><th>Percentage</th></tr></thead>`;
  const tbody = el("tbody");
  students.forEach(s => {
    const mark = marks[s.id]?.marks || 0;
    const pct = exam.maxMarks > 0 ? ((mark / exam.maxMarks) * 100).toFixed(1) : "0";
    tbody.appendChild(el("tr", {}, [
      el("td", { text: s.name }),
      el("td", { text: mark }),
      el("td", { text: pct + "%" })
    ]));
  });
  table.appendChild(tbody);
  body.appendChild(table);
  openModal({ title: "Report Card", body, size: "large" });
}

function field(label, node) {
  return el("div", { class: "form-row" }, [el("label", { text: label }), node]);
}
