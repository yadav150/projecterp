// Attendance View — mark daily attendance for students and teachers
import { el, ICON, fmtDate, todayISO, CLASSES, SECTIONS } from "../utils.js";
import { DataTable, setCrumbs, openModal, toast, loadingState } from "../ui.js";
import { subscribeStudents, subscribeTeachers } from "../data.js";
import { subscribeAttendance, saveAttendance, getAttendance } from "../data-attendance.js";

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', badge: 'green' },
  { value: 'absent', label: 'Absent', badge: 'red' },
  { value: 'late', label: 'Late', badge: 'amber' },
  { value: 'leave', label: 'Leave', badge: 'indigo' }
];

let students = [];
let teachers = [];
let unsubS = null;
let unsubT = null;

export function AttendanceView() {
  setCrumbs([{ label: "Attendance" }]);
  const page = el("div", { "data-testid": "attendance-view" });

  // Header
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Attendance Management" }),
      el("p", { class: "page-subtitle", text: "Mark daily attendance for students and teachers." })
    ])
  ]));

  // Date picker
  const datePicker = el("div", { style: "display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap;" }, [
    el("label", { style: "font-weight:600;", text: "Date:" }),
    el("input", {
      type: "date",
      class: "input",
      value: todayISO(),
      "data-testid": "attendance-date",
      style: "max-width:200px;"
    })
  ]);
  page.appendChild(datePicker);

  // Tabs
  const tabs = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;" });
  const studentTab = tabBtn("Student Attendance", true);
  const teacherTab = tabBtn("Teacher Attendance", false);
  tabs.appendChild(studentTab);
  tabs.appendChild(teacherTab);
  page.appendChild(tabs);

  // Mounting containers
  const studentMount = el("div");
  const teacherMount = el("div", { style: "display:none;" });
  page.appendChild(studentMount);
  page.appendChild(teacherMount);

  // Class/Section filter for students
  const filterBar = el("div", { class: "filter-bar" });
  const classSel = el("select", { class: "select", "data-testid": "attendance-class" }, [
    el("option", { value: "", text: "All Classes" }),
    ...CLASSES.map(c => el("option", { value: c, text: c }))
  ]);
  const sectionSel = el("select", { class: "select", "data-testid": "attendance-section" }, [
    el("option", { value: "", text: "All Sections" }),
    ...SECTIONS.map(s => el("option", { value: s, text: s }))
  ]);
  filterBar.appendChild(el("span", { style: "font-weight:500;font-size:13px;", text: "Filter:" }));
  filterBar.appendChild(classSel);
  filterBar.appendChild(sectionSel);

  let currentDate = todayISO();
  let attendanceData = {};
  let currentType = 'students';

  // Load attendance on date change
  datePicker.querySelector('input').addEventListener('change', (e) => {
    currentDate = e.target.value;
    loadAttendance();
  });

  // Tab switching
  studentTab.onclick = () => {
    setActive(studentTab, teacherTab);
    studentMount.style.display = "";
    teacherMount.style.display = "none";
    currentType = 'students';
    loadAttendance();
  };
  teacherTab.onclick = () => {
    setActive(teacherTab, studentTab);
    teacherMount.style.display = "";
    studentMount.style.display = "none";
    currentType = 'teachers';
    loadAttendance();
  };

  // Filter change
  classSel.addEventListener('change', renderStudentAttendance);
  sectionSel.addEventListener('change', renderStudentAttendance);

  // Subscribe to students and teachers
  unsubS && unsubS();
  unsubS = subscribeStudents((list) => {
    students = list || [];
    if (currentType === 'students') renderStudentAttendance();
  });

  unsubT && unsubT();
  unsubT = subscribeTeachers((list) => {
    teachers = list || [];
    if (currentType === 'teachers') renderTeacherAttendance();
  });

  function loadAttendance() {
    if (currentType === 'students') {
      renderStudentAttendance();
    } else {
      renderTeacherAttendance();
    }
  }

  function renderStudentAttendance() {
    const classVal = classSel.value;
    const sectionVal = sectionSel.value;
    let filtered = students;
    if (classVal) filtered = filtered.filter(s => s.class === classVal);
    if (sectionVal) filtered = filtered.filter(s => s.section === sectionVal);
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    studentMount.innerHTML = "";
    studentMount.appendChild(filterBar);

    if (!filtered.length) {
      studentMount.appendChild(el("div", { class: "state" }, [
        el("div", { html: ICON.inbox }),
        el("div", { class: "state-sub", text: "No students found for the selected class and section." })
      ]));
      return;
    }

    // Load attendance for this date
    subscribeAttendance(currentDate, 'students', (data) => {
      attendanceData = data || {};
      renderAttendanceGrid(studentMount, filtered, attendanceData, 'students', currentDate);
    });
  }

  function renderTeacherAttendance() {
    teacherMount.innerHTML = "";
    teacherMount.appendChild(el("div", { style: "padding:4px 0 12px;font-size:13px;color:var(--muted);", text: `Showing ${teachers.length} teachers` }));

    if (!teachers.length) {
      teacherMount.appendChild(el("div", { class: "state" }, [
        el("div", { html: ICON.inbox }),
        el("div", { class: "state-sub", text: "No teachers found. Add teachers first." })
      ]));
      return;
    }

    const sorted = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
    subscribeAttendance(currentDate, 'teachers', (data) => {
      attendanceData = data || {};
      renderAttendanceGrid(teacherMount, sorted, attendanceData, 'teachers', currentDate);
    });
  }

  page.addEventListener("view:unmount", () => {
    unsubS && unsubS();
    unsubT && unsubT();
    unsubS = null;
    unsubT = null;
  });

  // Initial load
  renderStudentAttendance();

  return page;
}

function tabBtn(label, active) {
  return el("button", {
    class: `btn ${active ? "btn-primary" : "btn-outline"}`,
    text: label
  });
}

function setActive(on, off) {
  on.className = "btn btn-primary";
  off.className = "btn btn-outline";
}

function renderAttendanceGrid(container, items, attendance, type, date) {
  // Clear previous content (keep filter bar if present)
  const filterBar = container.querySelector('.filter-bar');
  container.innerHTML = "";
  if (filterBar) container.appendChild(filterBar);

  // Summary stats
  const stats = el("div", { class: "summary-grid", style: "margin-bottom:16px;" });
  const statusCounts = { present: 0, absent: 0, late: 0, leave: 0 };
  items.forEach(item => {
    const status = attendance[item.id] || 'absent';
    if (statusCounts[status] !== undefined) statusCounts[status]++;
  });
  const total = items.length;

  const statConfigs = [
    { label: "Present", value: statusCounts.present, icon: ICON.check, tone: "green" },
    { label: "Absent", value: statusCounts.absent, icon: ICON.warn, tone: "red" },
    { label: "Late", value: statusCounts.late, icon: ICON.clock, tone: "amber" },
    { label: "Leave", value: statusCounts.leave, icon: ICON.receipt, tone: "indigo" },
    { label: "Total", value: total, icon: ICON.users, tone: "" }
  ];

  statConfigs.forEach(s => {
    stats.appendChild(el("div", { class: "stat" }, [
      el("div", { class: "stat-top" }, [
        el("div", { class: "stat-label", text: s.label }),
        el("div", { class: `stat-icon ${s.tone}`, html: s.icon })
      ]),
      el("div", { class: "stat-value", text: String(s.value) })
    ]));
  });
  container.appendChild(stats);

  // Attendance grid
  const grid = el("div", {
    style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:16px;"
  });

  items.forEach(item => {
    const currentStatus = attendance[item.id] || 'absent';
    const statusObj = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[1];

    const card = el("div", {
      style: "background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:12px;display:flex;flex-direction:column;gap:8px;"
    });

    // Name and avatar
    const nameRow = el("div", { style: "display:flex;align-items:center;gap:10px;" }, [
      avatarNode(item),
      el("div", { style: "font-weight:600;font-size:13px;flex:1;", text: item.name || "—" })
    ]);
    card.appendChild(nameRow);

    // Status badge and dropdown
    const statusRow = el("div", { style: "display:flex;gap:6px;align-items:center;" }, [
      el("span", { class: `badge ${statusObj.badge}`, text: statusObj.label }),
      el("select", {
        class: "select",
        style: "flex:1;padding:4px 8px;font-size:12px;",
        "data-id": item.id
      }, STATUS_OPTIONS.map(opt =>
        el("option", { value: opt.value, selected: opt.value === currentStatus, text: opt.label })
      ))
    ]);
    card.appendChild(statusRow);
    grid.appendChild(card);
  });

  container.appendChild(grid);

  // Save button
  const saveBtn = el("button", {
    class: "btn btn-primary",
    "data-testid": "save-attendance",
    html: `${ICON.check}<span>Save Attendance</span>`
  });

  saveBtn.onclick = async () => {
    const selects = grid.querySelectorAll('select');
    const records = {};
    selects.forEach(sel => {
      records[sel.dataset.id] = sel.value;
    });

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      await saveAttendance(date, type, records);
      toast({ type: "success", title: "Attendance saved", message: `Saved for ${date}` });
      // Refresh to show updated stats
      const refreshed = await getAttendance(date, type);
      attendanceData = refreshed || {};
      // Re-render with updated data
      const itemsList = type === 'students' ? items : items;
      renderAttendanceGrid(container, itemsList, attendanceData, type, date);
    } catch (e) {
      toast({ type: "error", title: "Save failed", message: e.message });
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Attendance";
    }
  };

  container.appendChild(saveBtn);
}

function avatarNode(o = {}) {
  const av = el("div", { class: "avatar" });
  if (o.photoUrl) av.appendChild(el("img", { src: o.photoUrl, alt: "" }));
  else av.textContent = initials(o.name || "");
  return av;
}

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}
