// Reports View – Advanced Reports & Analytics
import { el, ICON, fmtCurrency, fmtDate, todayISO, MONTHS, CLASSES, DEPARTMENTS } from "../utils.js";
import { setCrumbs, toast, loadingState } from "../ui.js";
import {
  getFeeReport,
  getAttendanceReport,
  getSalaryReport,
  getStudentList,
  getTeacherList,
  getClassWiseCount
} from "../data-reports.js";
import { exportToCSV, downloadCSV } from "../data-import-export.js";

export function ReportsView() {
  setCrumbs([{ label: "Reports" }]);
  const page = el("div", { "data-testid": "reports-view" });

  // Header
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Reports & Analytics" }),
      el("p", { class: "page-subtitle", text: "Generate and export reports from your school data." })
    ])
  ]));

  // Tabs
  const tabs = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;" });
  const tabNames = ["Fee Report", "Attendance Report", "Salary Report", "Student List", "Teacher List", "Class Summary"];
  const tabButtons = {};
  const containers = {};

  tabNames.forEach((name, index) => {
    const active = index === 0;
    const btn = el("button", {
      class: `btn ${active ? "btn-primary" : "btn-outline"}`,
      text: name,
      "data-tab": name.toLowerCase().replace(/\s/g, '-')
    });
    tabButtons[name] = btn;
    tabs.appendChild(btn);

    const container = el("div", {
      style: active ? "display:block;" : "display:none;",
      "data-container": name.toLowerCase().replace(/\s/g, '-')
    });
    containers[name] = container;
    page.appendChild(container);
  });
  page.appendChild(tabs);

  // Tab switching
  Object.keys(tabButtons).forEach(name => {
    tabButtons[name].onclick = () => {
      Object.keys(tabButtons).forEach(n => {
        tabButtons[n].className = `btn ${n === name ? "btn-primary" : "btn-outline"}`;
        containers[n].style.display = n === name ? "block" : "none";
      });
      loadTab(name);
    };
  });

  // Load initial tab
  loadTab("Fee Report");

  // Cleanup on unmount – cancel any pending async operations
  let canceled = false;
  page.addEventListener("view:unmount", () => {
    canceled = true;
  });

  function loadTab(name) {
    const container = containers[name];
    if (!container) return;
    container.innerHTML = "";
    container.appendChild(loadingState("Loading..."));

    // Wrap async calls to check canceled flag
    const safeRender = (renderFn) => {
      renderFn(container, () => canceled);
    };

    switch (name) {
      case "Fee Report":
        safeRender(renderFeeReport);
        break;
      case "Attendance Report":
        safeRender(renderAttendanceReport);
        break;
      case "Salary Report":
        safeRender(renderSalaryReport);
        break;
      case "Student List":
        safeRender(renderStudentList);
        break;
      case "Teacher List":
        safeRender(renderTeacherList);
        break;
      case "Class Summary":
        safeRender(renderClassSummary);
        break;
    }
  }

  return page;
}

// ---------- Fee Report ----------
function renderFeeReport(container, isCanceled) {
  const fromDate = el("input", {
    type: "date",
    class: "input",
    value: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    style: "max-width:170px;"
  });
  const toDate = el("input", {
    type: "date",
    class: "input",
    value: todayISO(),
    style: "max-width:170px;"
  });
  const filterBar = el("div", { class: "filter-bar" }, [
    el("span", { style: "font-weight:500;", text: "From:" }),
    fromDate,
    el("span", { style: "font-weight:500;", text: "To:" }),
    toDate,
    el("button", { class: "btn btn-primary", text: "Generate", onclick: generate })
  ]);
  container.innerHTML = "";
  container.appendChild(filterBar);

  const resultContainer = el("div");
  container.appendChild(resultContainer);

  function generate() {
    if (isCanceled()) return;
    resultContainer.innerHTML = "";
    resultContainer.appendChild(loadingState("Generating report..."));

    getFeeReport(fromDate.value, toDate.value).then(data => {
      if (isCanceled()) return;
      resultContainer.innerHTML = "";

      // Summary stats
      const stats = el("div", { class: "summary-grid" }, [
        statCard("Total Collected", fmtCurrency(data.totalCollected), ICON.money, "green"),
        statCard("Total Pending", fmtCurrency(data.totalPending), ICON.warn, "red"),
        statCard("Total Records", String(data.totalRecords), ICON.receipt, "sky")
      ]);
      resultContainer.appendChild(stats);

      // By Class
      const classCard = el("div", { class: "card", style: "margin-bottom:16px;" });
      classCard.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Collection by Class" })]));
      const classBody = el("div", { class: "card-body" });
      const classGrid = el("div", { class: "detail-grid" });
      Object.entries(data.byClass).forEach(([cls, amount]) => {
        classGrid.appendChild(el("div", { class: "detail-row" }, [
          el("div", { class: "k", text: cls }),
          el("div", { class: "v", text: fmtCurrency(amount) })
        ]));
      });
      if (!Object.keys(data.byClass).length) {
        classGrid.appendChild(el("div", { class: "state", style: "padding:10px;", sub: "No data." }));
      }
      classBody.appendChild(classGrid);
      classCard.appendChild(classBody);
      resultContainer.appendChild(classCard);

      // By Fee Type
      const feeCard = el("div", { class: "card", style: "margin-bottom:16px;" });
      feeCard.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Collection by Fee Type" })]));
      const feeBody = el("div", { class: "card-body" });
      const feeGrid = el("div", { class: "detail-grid" });
      Object.entries(data.byFeeType).forEach(([type, amount]) => {
        feeGrid.appendChild(el("div", { class: "detail-row" }, [
          el("div", { class: "k", text: type }),
          el("div", { class: "v", text: fmtCurrency(amount) })
        ]));
      });
      if (!Object.keys(data.byFeeType).length) {
        feeGrid.appendChild(el("div", { class: "state", style: "padding:10px;", sub: "No data." }));
      }
      feeBody.appendChild(feeGrid);
      feeCard.appendChild(feeBody);
      resultContainer.appendChild(feeCard);

      // Export button
      const exportBtn = el("button", { class: "btn btn-outline", html: `${ICON.download}<span>Export CSV</span>` });
      exportBtn.onclick = () => {
        const rows = [["Class", "Amount", "Fee Type", "Total Collected", "Total Pending"]];
        Object.entries(data.byClass).forEach(([cls, amt]) => {
          rows.push([cls, fmtCurrency(amt), "", fmtCurrency(data.totalCollected), fmtCurrency(data.totalPending)]);
        });
        const csv = exportToCSV(rows);
        downloadCSV(csv, `fee_report_${fromDate.value}_to_${toDate.value}.csv`);
        toast({ type: "success", title: "Report exported" });
      };
      resultContainer.appendChild(exportBtn);
    }).catch(err => {
      if (isCanceled()) return;
      resultContainer.innerHTML = "";
      resultContainer.appendChild(el("div", { class: "state", text: "Error loading report: " + err.message }));
    });
  }

  generate();
}

// ---------- Attendance Report ----------
function renderAttendanceReport(container, isCanceled) {
  const monthSel = el("select", { class: "select" }, [
    ...MONTHS.map(m => el("option", { value: m, text: m }))
  ]);
  const yearSel = el("input", { type: "number", class: "input", value: String(new Date().getFullYear()), style: "max-width:100px;" });
  const typeSel = el("select", { class: "select" }, [
    el("option", { value: "students", text: "Students" }),
    el("option", { value: "teachers", text: "Teachers" })
  ]);

  const filterBar = el("div", { class: "filter-bar" }, [
    el("span", { style: "font-weight:500;", text: "Month:" }),
    monthSel,
    el("span", { style: "font-weight:500;", text: "Year:" }),
    yearSel,
    el("span", { style: "font-weight:500;", text: "Type:" }),
    typeSel,
    el("button", { class: "btn btn-primary", text: "Generate", onclick: generate })
  ]);
  container.innerHTML = "";
  container.appendChild(filterBar);

  const resultContainer = el("div");
  container.appendChild(resultContainer);

  function generate() {
    if (isCanceled()) return;
    resultContainer.innerHTML = "";
    resultContainer.appendChild(loadingState("Generating report..."));

    const month = monthSel.value;
    const year = Number(yearSel.value);
    const monthNum = MONTHS.indexOf(month) + 1;
    const monthStr = `${year}-${String(monthNum).padStart(2, "0")}`;
    const type = typeSel.value;

    getAttendanceReport(monthStr, type).then(data => {
      if (isCanceled()) return;
      resultContainer.innerHTML = "";

      const stats = el("div", { class: "summary-grid" }, [
        statCard("Present", String(data.present), ICON.check, "green"),
        statCard("Absent", String(data.absent), ICON.warn, "red"),
        statCard("Late", String(data.late), ICON.clock, "amber"),
        statCard("Leave", String(data.leave), ICON.receipt, "indigo"),
        statCard("Total", String(data.total), ICON.users, "sky")
      ]);
      resultContainer.appendChild(stats);

      // Daily breakdown
      const dailyCard = el("div", { class: "card", style: "margin-bottom:16px;" });
      dailyCard.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Daily Breakdown" })]));
      const dailyBody = el("div", { class: "card-body" });
      const dailyGrid = el("div", { class: "detail-grid", style: "grid-template-columns:repeat(auto-fill,minmax(150px,1fr));" });
      Object.entries(data.byDate).forEach(([date, stats]) => {
        const total = stats.present + stats.absent + stats.late + stats.leave;
        dailyGrid.appendChild(el("div", { class: "detail-row", style: "border:1px solid var(--border);padding:8px;border-radius:var(--radius);" }, [
          el("div", { class: "k", text: fmtDate(date) }),
          el("div", { class: "v", style: "font-size:12px;", text: `P:${stats.present} A:${stats.absent} L:${stats.late} LV:${stats.leave} (${total})` })
        ]));
      });
      if (!Object.keys(data.byDate).length) {
        dailyGrid.appendChild(el("div", { class: "state", style: "padding:10px;", sub: "No attendance records for this month." }));
      }
      dailyBody.appendChild(dailyGrid);
      dailyCard.appendChild(dailyBody);
      resultContainer.appendChild(dailyCard);

      const exportBtn = el("button", { class: "btn btn-outline", html: `${ICON.download}<span>Export CSV</span>` });
      exportBtn.onclick = () => {
        const rows = [["Date", "Present", "Absent", "Late", "Leave", "Total"]];
        Object.entries(data.byDate).forEach(([date, d]) => {
          const total = d.present + d.absent + d.late + d.leave;
          rows.push([date, d.present, d.absent, d.late, d.leave, total]);
        });
        const csv = exportToCSV(rows);
        downloadCSV(csv, `attendance_report_${month}_${year}.csv`);
        toast({ type: "success", title: "Report exported" });
      };
      resultContainer.appendChild(exportBtn);
    }).catch(err => {
      if (isCanceled()) return;
      resultContainer.innerHTML = "";
      resultContainer.appendChild(el("div", { class: "state", text: "Error loading report: " + err.message }));
    });
  }

  generate();
}

// ---------- Salary Report ----------
function renderSalaryReport(container, isCanceled) {
  const monthSel = el("select", { class: "select" }, [
    ...MONTHS.map(m => el("option", { value: m, text: m }))
  ]);
  const yearSel = el("input", { type: "number", class: "input", value: String(new Date().getFullYear()), style: "max-width:100px;" });

  const filterBar = el("div", { class: "filter-bar" }, [
    el("span", { style: "font-weight:500;", text: "Month:" }),
    monthSel,
    el("span", { style: "font-weight:500;", text: "Year:" }),
    yearSel,
    el("button", { class: "btn btn-primary", text: "Generate", onclick: generate })
  ]);
  container.innerHTML = "";
  container.appendChild(filterBar);

  const resultContainer = el("div");
  container.appendChild(resultContainer);

  function generate() {
    if (isCanceled()) return;
    resultContainer.innerHTML = "";
    resultContainer.appendChild(loadingState("Generating report..."));

    const month = monthSel.value;
    const year = Number(yearSel.value);

    getSalaryReport(month, year).then(data => {
      if (isCanceled()) return;
      resultContainer.innerHTML = "";

      const stats = el("div", { class: "summary-grid" }, [
        statCard("Total Paid", fmtCurrency(data.totalPaid), ICON.money, "green"),
        statCard("Total Pending", fmtCurrency(data.totalPending), ICON.warn, "red"),
        statCard("Total Records", String(data.totalRecords), ICON.receipt, "sky")
      ]);
      resultContainer.appendChild(stats);

      // By Department
      const deptCard = el("div", { class: "card", style: "margin-bottom:16px;" });
      deptCard.appendChild(el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Salary by Department" })]));
      const deptBody = el("div", { class: "card-body" });
      const deptGrid = el("div", { class: "detail-grid" });
      Object.entries(data.byDepartment).forEach(([dept, amount]) => {
        deptGrid.appendChild(el("div", { class: "detail-row" }, [
          el("div", { class: "k", text: dept }),
          el("div", { class: "v", text: fmtCurrency(amount) })
        ]));
      });
      if (!Object.keys(data.byDepartment).length) {
        deptGrid.appendChild(el("div", { class: "state", style: "padding:10px;", sub: "No data." }));
      }
      deptBody.appendChild(deptGrid);
      deptCard.appendChild(deptBody);
      resultContainer.appendChild(deptCard);

      const exportBtn = el("button", { class: "btn btn-outline", html: `${ICON.download}<span>Export CSV</span>` });
      exportBtn.onclick = () => {
        const rows = [["Department", "Amount"]];
        Object.entries(data.byDepartment).forEach(([dept, amt]) => {
          rows.push([dept, amt]);
        });
        const csv = exportToCSV(rows);
        downloadCSV(csv, `salary_report_${month}_${year}.csv`);
        toast({ type: "success", title: "Report exported" });
      };
      resultContainer.appendChild(exportBtn);
    }).catch(err => {
      if (isCanceled()) return;
      resultContainer.innerHTML = "";
      resultContainer.appendChild(el("div", { class: "state", text: "Error loading report: " + err.message }));
    });
  }

  generate();
}

// ---------- Student List ----------
function renderStudentList(container, isCanceled) {
  container.innerHTML = "";
  container.appendChild(loadingState("Loading students..."));

  // Filters
  const classSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Classes" }),
    ...CLASSES.map(c => el("option", { value: c, text: c }))
  ]);
  const sectionSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Sections" }),
    el("option", { value: "A", text: "A" }),
    el("option", { value: "B", text: "B" }),
    el("option", { value: "C", text: "C" }),
    el("option", { value: "D", text: "D" })
  ]);
  const statusSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Status" }),
    el("option", { value: "Active", text: "Active" }),
    el("option", { value: "Inactive", text: "Inactive" }),
    el("option", { value: "Alumni", text: "Alumni" })
  ]);

  const filterBar = el("div", { class: "filter-bar" }, [
    classSel, sectionSel, statusSel,
    el("button", { class: "btn btn-outline", text: "Apply Filters", onclick: renderList })
  ]);
  container.appendChild(filterBar);

  const listContainer = el("div");
  container.appendChild(listContainer);

  function renderList() {
    if (isCanceled()) return;
    listContainer.innerHTML = "";
    listContainer.appendChild(loadingState("Loading..."));

    const filters = {
      class: classSel.value,
      section: sectionSel.value,
      status: statusSel.value
    };

    getStudentList(filters).then(students => {
      if (isCanceled()) return;
      listContainer.innerHTML = "";
      if (!students.length) {
        listContainer.appendChild(el("div", { class: "state", sub: "No students found." }));
        return;
      }

      const table = el("table", { class: "data-table" });
      table.innerHTML = `
        <thead>
          <tr>
            <th>Name</th>
            <th>Admission #</th>
            <th>Class</th>
            <th>Section</th>
            <th>Father</th>
            <th>Phone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td>${s.name || "—"}</td>
              <td>${s.admissionNumber || "—"}</td>
              <td>${s.class || "—"}</td>
              <td>${s.section || "—"}</td>
              <td>${s.fatherName || "—"}</td>
              <td>${s.phone || "—"}</td>
              <td><span class="badge ${s.status === "Active" ? "green" : "slate"}">${s.status || "Active"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      `;
      const wrap = el("div", { class: "table-wrap" }, [table]);
      listContainer.appendChild(wrap);

      const exportBtn = el("button", { class: "btn btn-outline", style: "margin-top:12px;", html: `${ICON.download}<span>Export CSV</span>` });
      exportBtn.onclick = () => {
        const rows = [["Name", "Admission #", "Class", "Section", "Father", "Phone", "Email", "Status"]];
        students.forEach(s => {
          rows.push([s.name, s.admissionNumber, s.class, s.section, s.fatherName, s.phone, s.email, s.status]);
        });
        const csv = exportToCSV(rows);
        downloadCSV(csv, `student_list.csv`);
        toast({ type: "success", title: "Report exported" });
      };
      listContainer.appendChild(exportBtn);
    }).catch(err => {
      if (isCanceled()) return;
      listContainer.innerHTML = "";
      listContainer.appendChild(el("div", { class: "state", text: "Error: " + err.message }));
    });
  }

  renderList();
}

// ---------- Teacher List ----------
function renderTeacherList(container, isCanceled) {
  container.innerHTML = "";
  container.appendChild(loadingState("Loading teachers..."));

  const deptSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Departments" }),
    ...DEPARTMENTS.map(d => el("option", { value: d, text: d }))
  ]);
  const statusSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Status" }),
    el("option", { value: "Active", text: "Active" }),
    el("option", { value: "Inactive", text: "Inactive" })
  ]);

  const filterBar = el("div", { class: "filter-bar" }, [
    deptSel, statusSel,
    el("button", { class: "btn btn-outline", text: "Apply Filters", onclick: renderList })
  ]);
  container.appendChild(filterBar);

  const listContainer = el("div");
  container.appendChild(listContainer);

  function renderList() {
    if (isCanceled()) return;
    listContainer.innerHTML = "";
    listContainer.appendChild(loadingState("Loading..."));

    const filters = {
      department: deptSel.value,
      status: statusSel.value
    };

    getTeacherList(filters).then(teachers => {
      if (isCanceled()) return;
      listContainer.innerHTML = "";
      if (!teachers.length) {
        listContainer.appendChild(el("div", { class: "state", sub: "No teachers found." }));
        return;
      }

      const table = el("table", { class: "data-table" });
      table.innerHTML = `
        <thead>
          <tr>
            <th>Name</th>
            <th>Teacher ID</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Phone</th>
            <th>Salary</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${teachers.map(t => `
            <tr>
              <td>${t.name || "—"}</td>
              <td>${t.teacherId || "—"}</td>
              <td>${t.department || "—"}</td>
              <td>${t.designation || "—"}</td>
              <td>${t.phone || "—"}</td>
              <td>${fmtCurrency(t.salary || 0)}</td>
              <td><span class="badge ${t.status === "Active" ? "green" : "slate"}">${t.status || "Active"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      `;
      const wrap = el("div", { class: "table-wrap" }, [table]);
      listContainer.appendChild(wrap);

      const exportBtn = el("button", { class: "btn btn-outline", style: "margin-top:12px;", html: `${ICON.download}<span>Export CSV</span>` });
      exportBtn.onclick = () => {
        const rows = [["Name", "Teacher ID", "Department", "Designation", "Phone", "Email", "Salary", "Status"]];
        teachers.forEach(t => {
          rows.push([t.name, t.teacherId, t.department, t.designation, t.phone, t.email, t.salary, t.status]);
        });
        const csv = exportToCSV(rows);
        downloadCSV(csv, `teacher_list.csv`);
        toast({ type: "success", title: "Report exported" });
      };
      listContainer.appendChild(exportBtn);
    }).catch(err => {
      if (isCanceled()) return;
      listContainer.innerHTML = "";
      listContainer.appendChild(el("div", { class: "state", text: "Error: " + err.message }));
    });
  }

  renderList();
}

// ---------- Class Summary ----------
function renderClassSummary(container, isCanceled) {
  container.innerHTML = "";
  container.appendChild(loadingState("Loading..."));

  getClassWiseCount().then(counts => {
    if (isCanceled()) return;
    container.innerHTML = "";
    const stats = el("div", { class: "summary-grid" });
    let total = 0;
    Object.entries(counts).forEach(([cls, count]) => {
      total += count;
      stats.appendChild(el("div", { class: "stat" }, [
        el("div", { class: "stat-top" }, [
          el("div", { class: "stat-label", text: `Class ${cls}` }),
          el("div", { class: "stat-icon", html: ICON.users })
        ]),
        el("div", { class: "stat-value", text: String(count) })
      ]));
    });
    // Total
    stats.appendChild(el("div", { class: "stat" }, [
      el("div", { class: "stat-top" }, [
        el("div", { class: "stat-label", text: "Total Students" }),
        el("div", { class: "stat-icon sky", html: ICON.inbox })
      ]),
      el("div", { class: "stat-value", text: String(total) })
    ]));
    container.appendChild(stats);

    const exportBtn = el("button", { class: "btn btn-outline", style: "margin-top:12px;", html: `${ICON.download}<span>Export CSV</span>` });
    exportBtn.onclick = () => {
      const rows = [["Class", "Student Count"]];
      Object.entries(counts).forEach(([cls, count]) => {
        rows.push([cls, count]);
      });
      rows.push(["Total", total]);
      const csv = exportToCSV(rows);
      downloadCSV(csv, `class_summary.csv`);
      toast({ type: "success", title: "Report exported" });
    };
    container.appendChild(exportBtn);
  }).catch(err => {
    if (isCanceled()) return;
    container.innerHTML = "";
    container.appendChild(el("div", { class: "state", text: "Error: " + err.message }));
  });
}

function statCard(label, value, icon, tone) {
  return el("div", { class: "stat" }, [
    el("div", { class: "stat-top" }, [
      el("div", { class: "stat-label", text: label }),
      el("div", { class: `stat-icon ${tone}`, html: icon })
    ]),
    el("div", { class: "stat-value", text: String(value) })
  ]);
}
