// Import/Export View – CSV data import and export
import { el, ICON } from "../utils.js";
import { setCrumbs, toast, loadingState } from "../ui.js";
import { subscribeFees, subscribeSalaries } from "../data.js";
import {
  exportToCSV,
  downloadCSV,
  parseCSV,
  importStudents,
  importTeachers,
  exportFeesToCSV,
  exportSalariesToCSV
} from "../data-import-export.js";

export function ImportExportView() {
  setCrumbs([{ label: "Import / Export" }]);
  const page = el("div", { "data-testid": "import-export-view" });

  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Import & Export" }),
      el("p", { class: "page-subtitle", text: "Import students and teachers from CSV, or export data to CSV." })
    ])
  ]));

  // Tabs
  const tabs = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;" });
  const tabNames = ["Import Students", "Import Teachers", "Export Fees", "Export Salaries"];
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
  loadTab("Import Students");

  function loadTab(name) {
    const container = containers[name];
    if (!container) return;
    container.innerHTML = "";

    switch (name) {
      case "Import Students":
        renderImportStudents(container);
        break;
      case "Import Teachers":
        renderImportTeachers(container);
        break;
      case "Export Fees":
        renderExportFees(container);
        break;
      case "Export Salaries":
        renderExportSalaries(container);
        break;
    }
  }

  return page;
}

// ---------- Import Students ----------
function renderImportStudents(container) {
  container.appendChild(el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Import Students from CSV" })]),
    el("div", { class: "card-body" }, [
      el("div", { style: "margin-bottom:12px;" }, [
        el("p", { style: "font-size:13px;color:var(--muted);", text: "Upload a CSV file with the following columns: name, gender, dob, class, section, roll number, father name, mother name, phone, email, address, status." })
      ]),
      el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;align-items:center;" }, [
        el("input", { type: "file", accept: ".csv", "data-testid": "import-student-file", style: "flex:1;min-width:200px;padding:8px;border:1px solid var(--border);border-radius:var(--radius);" }),
        el("button", { class: "btn btn-outline", "data-testid": "template-student", text: "Download Template", onclick: downloadStudentTemplate }),
        el("button", { class: "btn btn-primary", "data-testid": "import-student-btn", text: "Import", onclick: handleImport })
      ]),
      el("div", { id: "import-student-progress", style: "margin-top:12px;" })
    ])
  ]));

  function downloadStudentTemplate() {
    const headers = ["name", "gender", "dob", "class", "section", "roll number", "father name", "mother name", "phone", "email", "address", "status"];
    const sample = ["John Doe", "Male", "2015-01-01", "III", "A", "1", "Jane Doe", "Mary Doe", "9876543210", "john@example.com", "123 Main St", "Active"];
    const csv = exportToCSV([headers, sample]);
    downloadCSV(csv, "student_import_template.csv");
    toast({ type: "success", title: "Template downloaded" });
  }

  async function handleImport() {
    const fileInput = container.querySelector('[data-testid="import-student-file"]');
    const progressDiv = container.querySelector("#import-student-progress");
    const btn = container.querySelector('[data-testid="import-student-btn"]');

    const file = fileInput.files[0];
    if (!file) {
      toast({ type: "error", title: "No file selected" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csv = e.target.result;
      const rows = parseCSV(csv);
      if (rows.length < 2) {
        toast({ type: "error", title: "Invalid CSV", message: "File must have headers and at least one data row." });
        return;
      }

      btn.disabled = true;
      btn.textContent = "Importing...";
      progressDiv.innerHTML = "";

      const progressBar = el("div", { style: "width:100%;height:8px;background:var(--border);border-radius:4px;overflow:hidden;" });
      const fill = el("div", { style: "width:0%;height:100%;background:var(--primary);transition:width 0.3s;" });
      progressBar.appendChild(fill);
      progressDiv.appendChild(progressBar);

      const statusText = el("div", { style: "margin-top:6px;font-size:13px;color:var(--muted);", text: "Importing..." });
      progressDiv.appendChild(statusText);

      try {
        const result = await importStudents(rows, (current, total) => {
          const pct = Math.round((current / total) * 100);
          fill.style.width = pct + "%";
          statusText.textContent = `Processed ${current} of ${total}...`;
        });

        fill.style.width = "100%";
        if (result.errors.length) {
          let msg = `Imported ${result.success} students. ${result.errors.length} errors:`;
          result.errors.slice(0, 5).forEach(e => {
            msg += `\nRow ${e.row}: ${e.error}`;
          });
          if (result.errors.length > 5) msg += `\n... and ${result.errors.length - 5} more errors.`;
          toast({ type: "error", title: "Import completed with errors", message: msg });
        } else {
          toast({ type: "success", title: "Import successful", message: `Imported ${result.success} students.` });
        }
        statusText.textContent = `Complete. ${result.success} imported, ${result.errors.length} errors.`;
      } catch (err) {
        toast({ type: "error", title: "Import failed", message: err.message });
        statusText.textContent = "Failed: " + err.message;
      }

      btn.disabled = false;
      btn.textContent = "Import";
    };
    reader.readAsText(file);
  }
}

// ---------- Import Teachers ----------
function renderImportTeachers(container) {
  container.appendChild(el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Import Teachers from CSV" })]),
    el("div", { class: "card-body" }, [
      el("div", { style: "margin-bottom:12px;" }, [
        el("p", { style: "font-size:13px;color:var(--muted);", text: "Upload a CSV file with the following columns: name, gender, qualification, experience, department, designation, salary, phone, email, address, status." })
      ]),
      el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;align-items:center;" }, [
        el("input", { type: "file", accept: ".csv", "data-testid": "import-teacher-file", style: "flex:1;min-width:200px;padding:8px;border:1px solid var(--border);border-radius:var(--radius);" }),
        el("button", { class: "btn btn-outline", "data-testid": "template-teacher", text: "Download Template", onclick: downloadTeacherTemplate }),
        el("button", { class: "btn btn-primary", "data-testid": "import-teacher-btn", text: "Import", onclick: handleImport })
      ]),
      el("div", { id: "import-teacher-progress", style: "margin-top:12px;" })
    ])
  ]));

  function downloadTeacherTemplate() {
    const headers = ["name", "gender", "qualification", "experience", "department", "designation", "salary", "phone", "email", "address", "status"];
    const sample = ["Jane Smith", "Female", "B.Ed", "5", "Primary", "Class Teacher", "25000", "9876543210", "jane@example.com", "456 School Rd", "Active"];
    const csv = exportToCSV([headers, sample]);
    downloadCSV(csv, "teacher_import_template.csv");
    toast({ type: "success", title: "Template downloaded" });
  }

  async function handleImport() {
    const fileInput = container.querySelector('[data-testid="import-teacher-file"]');
    const progressDiv = container.querySelector("#import-teacher-progress");
    const btn = container.querySelector('[data-testid="import-teacher-btn"]');

    const file = fileInput.files[0];
    if (!file) {
      toast({ type: "error", title: "No file selected" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csv = e.target.result;
      const rows = parseCSV(csv);
      if (rows.length < 2) {
        toast({ type: "error", title: "Invalid CSV", message: "File must have headers and at least one data row." });
        return;
      }

      btn.disabled = true;
      btn.textContent = "Importing...";
      progressDiv.innerHTML = "";

      const progressBar = el("div", { style: "width:100%;height:8px;background:var(--border);border-radius:4px;overflow:hidden;" });
      const fill = el("div", { style: "width:0%;height:100%;background:var(--primary);transition:width 0.3s;" });
      progressBar.appendChild(fill);
      progressDiv.appendChild(progressBar);

      const statusText = el("div", { style: "margin-top:6px;font-size:13px;color:var(--muted);", text: "Importing..." });
      progressDiv.appendChild(statusText);

      try {
        const result = await importTeachers(rows, (current, total) => {
          const pct = Math.round((current / total) * 100);
          fill.style.width = pct + "%";
          statusText.textContent = `Processed ${current} of ${total}...`;
        });

        fill.style.width = "100%";
        if (result.errors.length) {
          let msg = `Imported ${result.success} teachers. ${result.errors.length} errors:`;
          result.errors.slice(0, 5).forEach(e => {
            msg += `\nRow ${e.row}: ${e.error}`;
          });
          if (result.errors.length > 5) msg += `\n... and ${result.errors.length - 5} more errors.`;
          toast({ type: "error", title: "Import completed with errors", message: msg });
        } else {
          toast({ type: "success", title: "Import successful", message: `Imported ${result.success} teachers.` });
        }
        statusText.textContent = `Complete. ${result.success} imported, ${result.errors.length} errors.`;
      } catch (err) {
        toast({ type: "error", title: "Import failed", message: err.message });
        statusText.textContent = "Failed: " + err.message;
      }

      btn.disabled = false;
      btn.textContent = "Import";
    };
    reader.readAsText(file);
  }
}

// ---------- Export Fees ----------
function renderExportFees(container) {
  const statusDiv = el("div", { style: "margin-top:12px;" });
  container.appendChild(el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Export Fee Records" })]),
    el("div", { class: "card-body" }, [
      el("p", { style: "font-size:13px;color:var(--muted);margin-bottom:12px;", text: "Export all fee records to CSV format." }),
      el("button", { class: "btn btn-primary", "data-testid": "export-fees-btn", text: "Export Fees", onclick: handleExport }),
      statusDiv
    ])
  ]));

  async function handleExport() {
    const btn = container.querySelector('[data-testid="export-fees-btn"]');
    btn.disabled = true;
    btn.textContent = "Loading...";
    statusDiv.innerHTML = "";
    statusDiv.appendChild(loadingState("Fetching fee records..."));

    try {
      let fees = [];
      let unsub = subscribeFees((list) => {
        fees = list || [];
        const csv = exportFeesToCSV(fees);
        downloadCSV(csv, `fee_records_${new Date().toISOString().slice(0,10)}.csv`);
        statusDiv.innerHTML = "";
        statusDiv.appendChild(el("div", { style: "color:var(--success);", text: `Exported ${fees.length} fee records.` }));
        toast({ type: "success", title: "Export successful", message: `${fees.length} fee records exported.` });
        btn.disabled = false;
        btn.textContent = "Export Fees";
        if (unsub) unsub();
      });
    } catch (err) {
      statusDiv.innerHTML = "";
      statusDiv.appendChild(el("div", { style: "color:var(--danger);", text: "Error: " + err.message }));
      toast({ type: "error", title: "Export failed", message: err.message });
      btn.disabled = false;
      btn.textContent = "Export Fees";
    }
  }
}

// ---------- Export Salaries ----------
function renderExportSalaries(container) {
  const statusDiv = el("div", { style: "margin-top:12px;" });
  container.appendChild(el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Export Salary Records" })]),
    el("div", { class: "card-body" }, [
      el("p", { style: "font-size:13px;color:var(--muted);margin-bottom:12px;", text: "Export all salary records to CSV format." }),
      el("button", { class: "btn btn-primary", "data-testid": "export-salaries-btn", text: "Export Salaries", onclick: handleExport }),
      statusDiv
    ])
  ]));

  async function handleExport() {
    const btn = container.querySelector('[data-testid="export-salaries-btn"]');
    btn.disabled = true;
    btn.textContent = "Loading...";
    statusDiv.innerHTML = "";
    statusDiv.appendChild(loadingState("Fetching salary records..."));

    try {
      let salaries = [];
      let unsub = subscribeSalaries((list) => {
        salaries = list || [];
        const csv = exportSalariesToCSV(salaries);
        downloadCSV(csv, `salary_records_${new Date().toISOString().slice(0,10)}.csv`);
        statusDiv.innerHTML = "";
        statusDiv.appendChild(el("div", { style: "color:var(--success);", text: `Exported ${salaries.length} salary records.` }));
        toast({ type: "success", title: "Export successful", message: `${salaries.length} salary records exported.` });
        btn.disabled = false;
        btn.textContent = "Export Salaries";
        if (unsub) unsub();
      });
    } catch (err) {
      statusDiv.innerHTML = "";
      statusDiv.appendChild(el("div", { style: "color:var(--danger);", text: "Error: " + err.message }));
      toast({ type: "error", title: "Export failed", message: err.message });
      btn.disabled = false;
      btn.textContent = "Export Salaries";
    }
  }
}
