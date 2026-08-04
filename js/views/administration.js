// Administration module – Reports, Import/Export, ID Cards, Certificates
import { el, ICON, fmtCurrency, fmtDate, todayISO, CLASSES, SECTIONS, DEPARTMENTS, initials } from "../utils.js";
import { DataTable, setCrumbs, openModal, toast, loadingState } from "../ui.js";
import { subscribeStudents, subscribeTeachers, subscribeFees, subscribeSalaries } from "../data.js";
import { getFeeReport, getAttendanceReport, getPayrollReport, getStudentListReport } from "../data-reports.js";
import { arrayToCSV, downloadCSV, parseCSV, readCSVFile } from "../utils-export.js";
import { generateIDCard, openIDCardModal } from "./id-card.js";
import { openCertificateModal } from "./certificate.js";

let students = [], teachers = [], fees = [], salaries = [];
let unsubs = [];

export function AdministrationView() {
  setCrumbs([{ label: "Administration" }]);
  const page = el("div", { "data-testid": "administration-view" });

  // Header
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Administration" }),
      el("p", { class: "page-subtitle", text: "Reports, data import/export, ID cards, and certificates." })
    ])
  ]));

  // Tabs
  const tabs = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;" });
  const tabNames = ['Reports', 'Import Export', 'ID Cards', 'Certificates'];
  const tabButtons = {};
  const containers = {};

  tabNames.forEach((name, idx) => {
    const btn = el("button", {
      class: `btn ${idx === 0 ? "btn-primary" : "btn-outline"}`,
      text: name,
      "data-tab": name.toLowerCase().replace(' ', '-')
    });
    tabButtons[name] = btn;
    tabs.appendChild(btn);
    const container = el("div", { style: idx === 0 ? "" : "display:none;", "data-tab-container": name.toLowerCase().replace(' ', '-') });
    containers[name] = container;
    page.appendChild(container);
  });
  page.appendChild(tabs);

  // Switch tabs
  function switchTab(name) {
    Object.keys(tabButtons).forEach(key => {
      const btn = tabButtons[key];
      if (key === name) {
        btn.className = "btn btn-primary";
        containers[key].style.display = "";
      } else {
        btn.className = "btn btn-outline";
        containers[key].style.display = "none";
      }
    });
    if (name === 'Reports') renderReports(containers['Reports']);
    else if (name === 'Import Export') renderImportExport(containers['Import Export']);
    else if (name === 'ID Cards') renderIDCards(containers['ID Cards']);
    else if (name === 'Certificates') renderCertificates(containers['Certificates']);
  }

  tabNames.forEach(name => {
    tabButtons[name].onclick = () => switchTab(name);
  });

  // Subscribe to data
  unsubs = [
    subscribeStudents(v => { students = v || []; }),
    subscribeTeachers(v => { teachers = v || []; }),
    subscribeFees(v => { fees = v || []; }),
    subscribeSalaries(v => { salaries = v || []; })
  ];

  page.addEventListener("view:unmount", () => unsubs.forEach(u => u && u()));

  // Initial render
  renderReports(containers['Reports']);

  return page;
}

// ---------- REPORTS TAB ----------
function renderReports(container) {
  container.innerHTML = "";

  // Filters
  const filterBar = el("div", { class: "filter-bar" });
  const startDate = el("input", { type: "date", class: "input", value: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10) });
  const endDate = el("input", { type: "date", class: "input", value: todayISO() });
  const reportType = el("select", { class: "select" }, [
    el("option", { value: "fee", text: "Fee Collection" }),
    el("option", { value: "attendance", text: "Attendance" }),
    el("option", { value: "payroll", text: "Payroll" }),
    el("option", { value: "students", text: "Student List" })
  ]);
  const classFilter = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Classes" }),
    ...CLASSES.map(c => el("option", { value: c, text: c }))
  ]);
  const sectionFilter = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Sections" }),
    ...SECTIONS.map(s => el("option", { value: s, text: s }))
  ]);
  const deptFilter = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Departments" }),
    ...DEPARTMENTS.map(d => el("option", { value: d, text: d }))
  ]);

  const generateBtn = el("button", { class: "btn btn-primary", text: "Generate Report" });
  const exportBtn = el("button", { class: "btn btn-outline", text: "Export CSV" });

  filterBar.appendChild(el("span", { text: "Type:" }));
  filterBar.appendChild(reportType);
  filterBar.appendChild(el("span", { text: "From:" }));
  filterBar.appendChild(startDate);
  filterBar.appendChild(el("span", { text: "To:" }));
  filterBar.appendChild(endDate);
  filterBar.appendChild(classFilter);
  filterBar.appendChild(sectionFilter);
  filterBar.appendChild(deptFilter);
  filterBar.appendChild(generateBtn);
  filterBar.appendChild(exportBtn);

  container.appendChild(filterBar);

  const resultContainer = el("div", { style: "margin-top:16px;" });
  container.appendChild(resultContainer);

  async function generateReport() {
    const type = reportType.value;
    const from = startDate.value;
    const to = endDate.value;
    const cls = classFilter.value;
    const sec = sectionFilter.value;
    const dept = deptFilter.value;
    let data = null;

    resultContainer.innerHTML = loadingState("Generating report…");

    try {
      if (type === 'fee') {
        data = await getFeeReport(from, to, cls);
        renderFeeReport(resultContainer, data);
      } else if (type === 'attendance') {
        const month = from.slice(0,7);
        data = await getAttendanceReport(month, cls, sec);
        renderAttendanceReport(resultContainer, data);
      } else if (type === 'payroll') {
        const month = from.slice(0,7);
        data = await getPayrollReport(month, dept);
        renderPayrollReport(resultContainer, data);
      } else if (type === 'students') {
        data = await getStudentListReport(cls, sec);
        renderStudentListReport(resultContainer, data);
      }
    } catch (e) {
      resultContainer.innerHTML = el("div", { class: "state", text: "Error loading report: " + e.message });
    }
  }

  generateBtn.onclick = generateReport;
  exportBtn.onclick = async () => {
    const type = reportType.value;
    let csvData = [];
    let columns = [];
    if (type === 'fee') {
      const report = await getFeeReport(startDate.value, endDate.value, classFilter.value);
      csvData = Object.entries(report.byClass).map(([cls, amt]) => ({ Class: cls, Amount: fmtCurrency(amt) }));
      columns = ['Class', 'Amount'];
    } else if (type === 'students') {
      const list = await getStudentListReport(classFilter.value, sectionFilter.value);
      csvData = list.map(s => ({ Name: s.name, Class: s.class, Section: s.section, Admission: s.admissionNumber, Phone: s.phone }));
      columns = ['Name', 'Class', 'Section', 'Admission', 'Phone'];
    } else {
      toast({ type: "error", title: "Export not available for this report type" });
      return;
    }
    if (csvData.length) {
      const csv = arrayToCSV(csvData, columns);
      downloadCSV(csv, `report_${type}_${todayISO()}`);
    } else {
      toast({ type: "error", title: "No data to export" });
    }
  };

  generateReport();
}

function renderFeeReport(container, data) {
  container.innerHTML = "";
  const stats = el("div", { class: "summary-grid" });
  [
    { label: "Total Collected", value: fmtCurrency(data.totalCollected) },
    { label: "Total Pending", value: fmtCurrency(data.totalPending) },
    { label: "Total Records", value: data.totalRecords }
  ].forEach(s => {
    stats.appendChild(el("div", { class: "stat" }, [
      el("div", { class: "stat-top" }, [
        el("div", { class: "stat-label", text: s.label }),
        el("div", { class: "stat-value", text: String(s.value) })
      ])
    ]));
  });
  container.appendChild(stats);

  if (Object.keys(data.byClass).length) {
    const table = el("div", { class: "table-wrap", style: "margin-top:16px;" });
    const tbl = el("table", { class: "data-table" });
    tbl.innerHTML = `<thead><tr><th>Class</th><th>Total Collection</th></tr></thead>`;
    const tbody = el("tbody");
    Object.entries(data.byClass).forEach(([cls, amt]) => {
      tbody.appendChild(el("tr", {}, [
        el("td", { text: cls }),
        el("td", { text: fmtCurrency(amt) })
      ]));
    });
    tbl.appendChild(tbody);
    table.appendChild(tbl);
    container.appendChild(table);
  }
}

function renderAttendanceReport(container, data) {
  container.innerHTML = "";
  const stats = el("div", { class: "summary-grid" });
  [
    { label: "Present", value: data.present },
    { label: "Absent", value: data.absent },
    { label: "Late", value: data.late },
    { label: "Leave", value: data.leave },
    { label: "Total Records", value: data.total }
  ].forEach(s => {
    stats.appendChild(el("div", { class: "stat" }, [
      el("div", { class: "stat-top" }, [
        el("div", { class: "stat-label", text: s.label }),
        el("div", { class: "stat-value", text: String(s.value) })
      ])
    ]));
  });
  container.appendChild(stats);
}

function renderPayrollReport(container, data) {
  container.innerHTML = "";
  const stats = el("div", { class: "summary-grid" });
  [
    { label: "Total Paid", value: fmtCurrency(data.totalPaid) },
    { label: "Total Pending", value: fmtCurrency(data.totalPending) }
  ].forEach(s => {
    stats.appendChild(el("div", { class: "stat" }, [
      el("div", { class: "stat-top" }, [
        el("div", { class: "stat-label", text: s.label }),
        el("div", { class: "stat-value", text: String(s.value) })
      ])
    ]));
  });
  container.appendChild(stats);

  if (Object.keys(data.byDepartment).length) {
    const table = el("div", { class: "table-wrap", style: "margin-top:16px;" });
    const tbl = el("table", { class: "data-table" });
    tbl.innerHTML = `<thead><tr><th>Department</th><th>Total Salary</th></tr></thead>`;
    const tbody = el("tbody");
    Object.entries(data.byDepartment).forEach(([dept, amt]) => {
      tbody.appendChild(el("tr", {}, [
        el("td", { text: dept }),
        el("td", { text: fmtCurrency(amt) })
      ]));
    });
    tbl.appendChild(tbody);
    table.appendChild(tbl);
    container.appendChild(table);
  }
}

function renderStudentListReport(container, data) {
  container.innerHTML = "";
  if (!data.length) {
    container.appendChild(el("div", { class: "state", text: "No students found" }));
    return;
  }
  const table = el("div", { class: "table-wrap" });
  const tbl = el("table", { class: "data-table" });
  tbl.innerHTML = `<thead><tr><th>Name</th><th>Class</th><th>Section</th><th>Admission #</th><th>Phone</th></tr></thead>`;
  const tbody = el("tbody");
  data.forEach(s => {
    tbody.appendChild(el("tr", {}, [
      el("td", { text: s.name || '—' }),
      el("td", { text: s.class || '—' }),
      el("td", { text: s.section || '—' }),
      el("td", { text: s.admissionNumber || '—' }),
      el("td", { text: s.phone || '—' })
    ]));
  });
  tbl.appendChild(tbody);
  table.appendChild(tbl);
  container.appendChild(table);
}

// ---------- IMPORT / EXPORT TAB ----------
function renderImportExport(container) {
  container.innerHTML = "";
  const grid = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:16px;" });
  grid.appendChild(exportSection());
  grid.appendChild(importSection());
  container.appendChild(grid);
}

function exportSection() {
  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Export Data" })]));
  const body = el("div", { class: "card-body" });
  const types = ['Students', 'Teachers', 'Fees', 'Salaries'];
  types.forEach(type => {
    const btn = el("button", { class: "btn btn-outline", style: "margin:4px;", text: `Export ${type}` });
    btn.onclick = () => exportData(type.toLowerCase());
    body.appendChild(btn);
  });
  card.appendChild(body);
  return card;
}

async function exportData(type) {
  let data = [];
  let columns = [];
  let filename = `${type}_${todayISO()}`;
  if (type === 'students') {
    data = students;
    columns = ['name', 'class', 'section', 'admissionNumber', 'phone', 'fatherName', 'motherName'];
  } else if (type === 'teachers') {
    data = teachers;
    columns = ['name', 'designation', 'department', 'teacherId', 'phone', 'salary'];
  } else if (type === 'fees') {
    data = fees;
    columns = ['receiptNumber', 'studentName', 'feeType', 'amount', 'status', 'date'];
  } else if (type === 'salaries') {
    data = salaries;
    columns = ['receiptNumber', 'teacherName', 'month', 'amount', 'status', 'date'];
  }
  if (!data.length) {
    toast({ type: "error", title: "No data to export" });
    return;
  }
  const csv = arrayToCSV(data, columns);
  downloadCSV(csv, filename);
  toast({ type: "success", title: "Export started", message: `${type} data exported.` });
}

function importSection() {
  const card = el("div", { class: "card" });
  card.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Import Data" })]));
  const body = el("div", { class: "card-body" });
  const fileInput = el("input", { type: "file", accept: ".csv", style: "margin-bottom:12px;" });
  const typeSel = el("select", { class: "select" }, [
    el("option", { value: "students", text: "Students" }),
    el("option", { value: "teachers", text: "Teachers" })
  ]);
  const importBtn = el("button", { class: "btn btn-primary", text: "Import CSV" });
  body.appendChild(el("div", { text: "Select entity:" }));
  body.appendChild(typeSel);
  body.appendChild(el("div", { text: "Choose CSV file:" }));
  body.appendChild(fileInput);
  body.appendChild(importBtn);

  importBtn.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) { toast({ type: "error", title: "No file selected" }); return; }
    const csv = await readCSVFile(file);
    const type = typeSel.value;
    const rows = parseCSV(csv);
    if (!rows.length) { toast({ type: "error", title: "Empty or invalid CSV" }); return; }
    if (type === 'students') {
      const required = ['name', 'class', 'fatherName', 'phone'];
      const missing = required.filter(f => !rows[0][f]);
      if (missing.length) {
        toast({ type: "error", title: "Missing columns", message: `Required: ${missing.join(', ')}` });
        return;
      }
      openImportPreview(rows, type);
    } else if (type === 'teachers') {
      const required = ['name', 'designation', 'department', 'phone'];
      const missing = required.filter(f => !rows[0][f]);
      if (missing.length) {
        toast({ type: "error", title: "Missing columns", message: `Required: ${missing.join(', ')}` });
        return;
      }
      openImportPreview(rows, type);
    }
  };
  return card;
}

function openImportPreview(rows, type) {
  const body = el("div");
  body.appendChild(el("div", { style: "margin-bottom:8px;", text: `Preview first ${Math.min(rows.length, 10)} rows:` }));
  const table = el("table", { class: "data-table" });
  const headers = Object.keys(rows[0]);
  table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = el("tbody");
  rows.slice(0, 10).forEach(row => {
    tbody.appendChild(el("tr", {}, headers.map(h => el("td", { text: row[h] || '—' }))));
  });
  table.appendChild(tbody);
  body.appendChild(table);
  body.appendChild(el("div", { style: "margin-top:12px;", text: `Total rows: ${rows.length}` }));

  const confirmBtn = el("button", { class: "btn btn-primary", text: "Confirm Import" });
  const cancelBtn = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: "Import Preview", body, footer: [cancelBtn, confirmBtn] });
  cancelBtn.onclick = () => m.close();
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Importing…";
    let success = 0, failed = 0;
    for (const row of rows) {
      try {
        if (type === 'students') {
          const { createStudent } = await import("../data.js");
          await createStudent({
            name: row.name,
            class: row.class,
            section: row.section || '',
            fatherName: row.fatherName,
            motherName: row.motherName || '',
            phone: row.phone,
            gender: row.gender || 'Male',
            dob: row.dob || new Date().toISOString().slice(0,10),
            admissionDate: row.admissionDate || todayISO(),
            status: 'Active'
          }, null);
          success++;
        } else if (type === 'teachers') {
          const { createTeacher } = await import("../data.js");
          await createTeacher({
            name: row.name,
            designation: row.designation,
            department: row.department || 'General',
            phone: row.phone,
            qualification: row.qualification || 'Graduate',
            salary: parseFloat(row.salary) || 0,
            gender: 'Male',
            status: 'Active'
          }, null);
          success++;
        }
      } catch (e) {
        failed++;
      }
    }
    toast({ type: "success", title: "Import complete", message: `${success} imported, ${failed} failed` });
    m.close();
  };
}

// ---------- ID CARDS TAB ----------
function renderIDCards(container) {
  container.innerHTML = "";
  const selectType = el("select", { class: "select" }, [
    el("option", { value: "student", text: "Student" }),
    el("option", { value: "teacher", text: "Teacher" })
  ]);
  const searchInput = el("input", { class: "input", placeholder: "Search by name or ID…", style: "flex:1;min-width:200px;" });
  const filterBar = el("div", { class: "filter-bar" }, [
    selectType,
    searchInput
  ]);
  container.appendChild(filterBar);

  const listContainer = el("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:16px;" });
  container.appendChild(listContainer);

  function renderList(type, query) {
    let items = type === 'student' ? students : teachers;
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || (p.admissionNumber || p.teacherId || '').includes(q));
    }
    listContainer.innerHTML = "";
    if (!items.length) {
      listContainer.appendChild(el("div", { class: "state", text: "No records found" }));
      return;
    }
    items.forEach(p => {
      const card = el("div", { class: "card", style: "padding:12px;text-align:center;cursor:pointer;" });
      const avatar = el("div", { class: "avatar lg", style: "width:60px;height:60px;margin:0 auto;" });
      if (p.photoUrl) avatar.appendChild(el("img", { src: p.photoUrl, style: "width:100%;height:100%;object-fit:cover;" }));
      else avatar.textContent = initials(p.name || '');
      card.appendChild(avatar);
      card.appendChild(el("div", { style: "font-weight:600;margin-top:6px;", text: p.name }));
      card.appendChild(el("div", { style: "font-size:12px;color:var(--muted);", text: type === 'student' ? `Adm #${p.admissionNumber || '—'}` : `ID: ${p.teacherId || '—'}` }));
      card.onclick = () => openIDCardModal(p, type);
      listContainer.appendChild(card);
    });
  }

  selectType.onchange = () => renderList(selectType.value, searchInput.value);
  searchInput.oninput = () => renderList(selectType.value, searchInput.value);
  renderList('student', '');
}

// ---------- CERTIFICATES TAB ----------
function renderCertificates(container) {
  container.innerHTML = "";
  const searchInput = el("input", { class: "input", placeholder: "Search student by name or admission #…", style: "flex:1;min-width:200px;" });
  const filterBar = el("div", { class: "filter-bar" }, [searchInput]);
  container.appendChild(filterBar);

  const listContainer = el("div", { style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:16px;" });
  container.appendChild(listContainer);

  function renderList(query) {
    let items = students;
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q) || (p.admissionNumber || '').includes(q));
    }
    listContainer.innerHTML = "";
    if (!items.length) {
      listContainer.appendChild(el("div", { class: "state", text: "No students found" }));
      return;
    }
    items.forEach(p => {
      const card = el("div", { class: "card", style: "padding:12px;text-align:center;cursor:pointer;" });
      const avatar = el("div", { class: "avatar lg", style: "width:60px;height:60px;margin:0 auto;" });
      if (p.photoUrl) avatar.appendChild(el("img", { src: p.photoUrl, style: "width:100%;height:100%;object-fit:cover;" }));
      else avatar.textContent = initials(p.name || '');
      card.appendChild(avatar);
      card.appendChild(el("div", { style: "font-weight:600;margin-top:6px;", text: p.name }));
      card.appendChild(el("div", { style: "font-size:12px;color:var(--muted);", text: `Adm #${p.admissionNumber || '—'}` }));
      card.onclick = () => openCertificateModal(p);
      listContainer.appendChild(card);
    });
  }

  searchInput.oninput = () => renderList(searchInput.value);
  renderList('');
}
