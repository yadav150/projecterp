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
let unsubA = null; // Attendance subscription
let currentAttendance = {}; // Store latest attendance data

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

  // Mount points
  const studentMount = el("div");
  const teacherMount = el("div", { style: "display:none;" });
  page.appendChild(studentMount);
  page.appendChild(teacherMount);

  // State
  let currentDate = todayISO();
  let currentType = 'students';

  // --- Build static filter bar ---
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

  // --- Event listeners ---
  datePicker.querySelector('input').addEventListener('change', (e) => {
    currentDate = e.target.value;
    loadAttendance();
  });

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

  // Filter changes just reapply visibility – no rebuild
  classSel.addEventListener('change', () => applyFilters('students'));
  sectionSel.addEventListener('change', () => applyFilters('students'));

  // --- Subscribe to students ---
  if (unsubS) unsubS();
  unsubS = subscribeStudents((list) => {
    students = list || [];
    if (currentType === 'students') {
      buildStudentGrid();
      applyFilters('students');
    }
  });

  // --- Subscribe to teachers ---
  if (unsubT) unsubT();
  unsubT = subscribeTeachers((list) => {
    teachers = list || [];
    if (currentType === 'teachers') {
      buildTeacherGrid();
    }
  });

  // --- Build static grids (once per type) ---
  let studentGrid = null;
  let studentCards = [];
  let teacherGrid = null;
  let teacherCards = [];

  function buildStudentGrid() {
    studentMount.innerHTML = "";
    studentMount.appendChild(filterBar);

    if (!students.length) {
      studentMount.appendChild(el("div", { class: "state" }, [
        el("div", { html: ICON.inbox }),
        el("div", { class: "state-sub", text: "No students found. Add students first." })
      ]));
      return;
    }

    // Create grid container
    const gridContainer = el("div", {
      "data-attendance-grid": true,
      style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:16px;"
    });
    studentMount.appendChild(gridContainer);

    // Create all student cards once
    studentCards = [];
    const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(item => {
      const card = createAttendanceCard(item);
      gridContainer.appendChild(card);
      studentCards.push({ item, card, element: gridContainer.lastChild });
    });

    studentGrid = gridContainer;

    // Stats container
    const statsContainer = el("div", { class: "summary-grid", style: "margin-bottom:16px;", "data-attendance-stats": true });
    studentMount.insertBefore(statsContainer, gridContainer);

    // Save button
    const saveBtn = el("button", {
      class: "btn btn-primary",
      "data-testid": "save-attendance",
      html: `${ICON.check}<span>Save Attendance</span>`
    });
    saveBtn.onclick = () => saveAttendanceHandler('students', currentDate, saveBtn);
    studentMount.appendChild(saveBtn);

    // Load attendance data
    loadAttendanceData('students');
  }

  function buildTeacherGrid() {
    teacherMount.innerHTML = "";
    teacherMount.appendChild(el("div", { style: "padding:4px 0 12px;font-size:13px;color:var(--muted);", text: `Showing ${teachers.length} teachers` }));

    if (!teachers.length) {
      teacherMount.appendChild(el("div", { class: "state" }, [
        el("div", { html: ICON.inbox }),
        el("div", { class: "state-sub", text: "No teachers found. Add teachers first." })
      ]));
      return;
    }

    const gridContainer = el("div", {
      "data-attendance-grid": true,
      style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:16px;"
    });
    teacherMount.appendChild(gridContainer);

    teacherCards = [];
    const sorted = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(item => {
      const card = createAttendanceCard(item);
      gridContainer.appendChild(card);
      teacherCards.push({ item, card, element: gridContainer.lastChild });
    });

    teacherGrid = gridContainer;

    const statsContainer = el("div", { class: "summary-grid", style: "margin-bottom:16px;", "data-attendance-stats": true });
    teacherMount.insertBefore(statsContainer, gridContainer);

    const saveBtn = el("button", {
      class: "btn btn-primary",
      "data-testid": "save-attendance",
      html: `${ICON.check}<span>Save Attendance</span>`
    });
    saveBtn.onclick = () => saveAttendanceHandler('teachers', currentDate, saveBtn);
    teacherMount.appendChild(saveBtn);

    loadAttendanceData('teachers');
  }

  // --- Create a single attendance card ---
  function createAttendanceCard(item) {
    const card = el("div", {
      style: "background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:12px;display:flex;flex-direction:column;gap:8px;",
      "data-id": item.id,
      "data-class": item.class || "",
      "data-section": item.section || ""
    });

    const nameRow = el("div", { style: "display:flex;align-items:center;gap:10px;" }, [
      avatarNode(item),
      el("div", { style: "font-weight:600;font-size:13px;flex:1;", text: item.name || "—" })
    ]);
    card.appendChild(nameRow);

    const statusRow = el("div", { style: "display:flex;gap:6px;align-items:center;" }, [
      el("span", { class: "badge green", "data-status-badge": true, text: "Present" }),
      el("select", {
        class: "select",
        style: "flex:1;padding:4px 8px;font-size:12px;",
        "data-id": item.id,
        "data-status-select": true
      }, STATUS_OPTIONS.map(opt =>
        el("option", { value: opt.value, text: opt.label })
      ))
    ]);
    card.appendChild(statusRow);

    return card;
  }

  // --- Update attendance data on all cards ---
  function updateAttendanceStatuses(cards, attendanceData) {
    cards.forEach(({ card, item }) => {
      const status = attendanceData[item.id] || 'absent';
      const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];

      const badge = card.querySelector('[data-status-badge]');
      if (badge) {
        badge.className = `badge ${statusObj.badge}`;
        badge.textContent = statusObj.label;
      }

      const select = card.querySelector('[data-status-select]');
      if (select) {
        select.value = status;
      }
    });

    // Update stats
    updateStats(cards, attendanceData);
  }

  // --- Update stats ---
  function updateStats(cards, attendanceData) {
    const statsContainer = cards[0]?.element?.closest('[data-attendance-grid]')?.previousElementSibling;
    if (!statsContainer || !statsContainer.matches('[data-attendance-stats]')) return;

    const statusCounts = { present: 0, absent: 0, late: 0, leave: 0 };
    cards.forEach(({ item }) => {
      const status = attendanceData[item.id] || 'absent';
      if (statusCounts[status] !== undefined) statusCounts[status]++;
    });
    const total = cards.length;

    statsContainer.innerHTML = "";
    const statConfigs = [
      { label: "Present", value: statusCounts.present, icon: ICON.check, tone: "green" },
      { label: "Absent", value: statusCounts.absent, icon: ICON.warn, tone: "red" },
      { label: "Late", value: statusCounts.late, icon: ICON.clock, tone: "amber" },
      { label: "Leave", value: statusCounts.leave, icon: ICON.receipt, tone: "indigo" },
      { label: "Total", value: total, icon: ICON.users, tone: "" }
    ];

    statConfigs.forEach(s => {
      statsContainer.appendChild(el("div", { class: "stat" }, [
        el("div", { class: "stat-top" }, [
          el("div", { class: "stat-label", text: s.label }),
          el("div", { class: `stat-icon ${s.tone}`, html: s.icon })
        ]),
        el("div", { class: "stat-value", text: String(s.value) })
      ]));
    });
  }

  // --- Apply filters (show/hide cards, no rebuild) ---
  function applyFilters(type) {
    const classVal = classSel.value;
    const sectionVal = sectionSel.value;
    const cards = type === 'students' ? studentCards : teacherCards;

    cards.forEach(({ item, card }) => {
      const matchClass = !classVal || item.class === classVal;
      const matchSection = !sectionVal || item.section === sectionVal;
      card.style.display = (matchClass && matchSection) ? "" : "none";
    });

    // Update stats based on visible cards
    const visibleCards = cards.filter(({ card }) => card.style.display !== "none");
    updateStats(visibleCards, currentAttendance);
  }

  // --- Load attendance data ---
  function loadAttendanceData(type) {
    if (unsubA) {
      unsubA();
      unsubA = null;
    }

    const cards = type === 'students' ? studentCards : teacherCards;
    if (!cards.length) return;

    unsubA = subscribeAttendance(currentDate, type, (data) => {
      currentAttendance = data || {};
      updateAttendanceStatuses(cards, currentAttendance);
      applyFilters(type);
    });
  }

  // --- Save attendance handler ---
  async function saveAttendanceHandler(type, date, btn) {
    const cards = type === 'students' ? studentCards : teacherCards;
    const records = {};
    cards.forEach(({ card }) => {
      if (card.style.display === "none") return;
      const select = card.querySelector('[data-status-select]');
      if (select) {
        records[select.dataset.id] = select.value;
      }
    });

    btn.disabled = true;
    btn.innerHTML = "Saving…";

    try {
      await saveAttendance(date, type, records);
      toast({ type: "success", title: "Attendance saved", message: `Saved for ${date}` });
      // Refresh from server
      const refreshed = await getAttendance(date, type);
      currentAttendance = refreshed || {};
      updateAttendanceStatuses(cards, currentAttendance);
      applyFilters(type);
    } catch (e) {
      toast({ type: "error", title: "Save failed", message: e.message });
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${ICON.check}<span>Save Attendance</span>`;
    }
  }

  // --- Load attendance (called on date/tab change) ---
  function loadAttendance() {
    if (currentType === 'students') {
      if (studentCards.length) {
        loadAttendanceData('students');
        applyFilters('students');
      } else if (students.length) {
        buildStudentGrid();
      }
    } else {
      if (teacherCards.length) {
        loadAttendanceData('teachers');
      } else if (teachers.length) {
        buildTeacherGrid();
      }
    }
  }

  // --- Cleanup on unmount ---
  page.addEventListener("view:unmount", () => {
    if (unsubS) { unsubS(); unsubS = null; }
    if (unsubT) { unsubT(); unsubT = null; }
    if (unsubA) { unsubA(); unsubA = null; }
  });

  // --- Initial render ---
  buildStudentGrid();

  return page;
}

// ============================================================
// Helper functions
// ============================================================

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

function avatarNode(o = {}) {
  const av = el("div", { class: "avatar" });
  if (o.photoUrl) av.appendChild(el("img", { src: o.photoUrl, alt: "" }));
  else av.textContent = initials(o.name || "");
  return av;
}

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}
