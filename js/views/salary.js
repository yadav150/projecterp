// Salary Management — generate salaries, mark paid, history, receipts
import {
  el, ICON, fmtCurrency, fmtDate, todayISO, MONTHS, PAY_MODES
} from "../utils.js";
import { DataTable, setCrumbs, openModal, confirmDialog, toast, loadingState } from "../ui.js";
import { subscribeTeachers, subscribeSalaries, recordSalaryPayment, deleteSalary } from "../data.js";
import { openSalaryReceipt } from "./receipts.js";

let teachers = [];
let unsubT = null, unsubS = null;

// ---------- Main View ----------
export function SalaryView() {
  setCrumbs([{ label: "Salary" }]);
  const page = el("div", { "data-testid": "salary-view" });

  // Header
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Salary Management" }),
      el("p", { class: "page-subtitle", text: "Generate monthly salaries, track paid vs pending and print receipts." })
    ]),
    el("div", { class: "page-actions" }, [
      el("button", { class: "btn btn-primary", "data-testid": "gen-salary-btn", onclick: openGenerateSalary, html: `${ICON.plus}<span>Generate Salary</span>` })
    ])
  ]));

  // Stats
  const stats = el("div", { class: "summary-grid" });
  page.appendChild(stats);

  // Table mount
  const mount = el("div");
  page.appendChild(mount);
  mount.appendChild(loadingState("Loading salaries…"));

  // Filters
  const monthSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Months" }),
    ...MONTHS.map(m => el("option", { value: m, text: m }))
  ]);
  const statusSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Status" }),
    el("option", { value: "Paid", text: "Paid" }),
    el("option", { value: "Pending", text: "Pending" })
  ]);

  [monthSel, statusSel].forEach(x => x.addEventListener("change", () => table && table.setRows(filtered())));

  let table = null, rows = [];

  function filtered() {
    return rows.filter(r => (!monthSel.value || r.month === monthSel.value) && (!statusSel.value || r.status === statusSel.value));
  }

  // Subscribe to teachers (for salary generation dropdown)
  unsubT && unsubT();
  unsubT = subscribeTeachers(v => { teachers = v || []; });

  // Subscribe to salaries
  unsubS && unsubS();
  unsubS = subscribeSalaries(list => {
    rows = list;

    // Stats
    const paid = rows.filter(r => r.status === "Paid").reduce((a, b) => a + Number(b.amount || 0), 0);
    const pending = rows.filter(r => r.status !== "Paid").reduce((a, b) => a + Number(b.amount || 0), 0);
    const thisMonth = new Date().toLocaleString("en-US", { month: "long" });
    const currMo = rows.filter(r => r.month === thisMonth);

    stats.innerHTML = "";
    [
      { l: "Total Paid", v: fmtCurrency(paid), icon: ICON.money, tone: "green" },
      { l: "Pending Salary", v: fmtCurrency(pending), icon: ICON.warn, tone: "red" },
      { l: "This Month Records", v: currMo.length, icon: ICON.receipt, tone: "" },
      { l: "Total Records", v: rows.length, icon: ICON.inbox, tone: "sky" }
    ].forEach(s => stats.appendChild(el("div", { class: "stat" }, [
      el("div", { class: "stat-top" }, [el("div", { class: "stat-label", text: s.l }), el("div", { class: `stat-icon ${s.tone}`, html: s.icon })]),
      el("div", { class: "stat-value", text: String(s.v) })
    ])));

    // Table
    mount.innerHTML = "";
    table = DataTable({
      testId: "salary-table",
      columns: [
        { key: "receiptNumber", label: "Receipt #", sortable: true, render: r => r.receiptNumber || "—" },
        {
          key: "teacherName", label: "Teacher", sortable: true,
          render: r => el("div", {}, [
            el("div", { style: "font-weight:600;", text: r.teacherName || "—" }),
            el("div", { style: "font-size:12px;color:var(--muted);", text: r.teacherIdShort || "" })
          ])
        },
        { key: "designation", label: "Designation", render: r => r.designation || "—" },
        { key: "month", label: "Month", sortable: true, render: r => `${r.month || "—"} ${r.year || ""}` },
        { key: "amount", label: "Amount", sortable: true, render: r => fmtCurrency(r.amount) },
        { key: "paymentMode", label: "Mode", render: r => r.paymentMode || "—" },
        { key: "date", label: "Date", sortable: true, render: r => fmtDate(r.date) },
        {
          key: "status", label: "Status",
          render: r => `<span class="badge ${r.status === "Paid" ? "green" : "red"}">${r.status || "Pending"}</span>`
        },
        {
          key: "_", label: "",
          render: r => rowActions([
            { icon: ICON.receipt, testId: `srec-${r.id}`, onClick: () => openSalaryReceipt(r), label: "Receipt" },
            {
              icon: ICON.trash, danger: true, testId: `sdel-${r.id}`,
              onClick: async () => {
                if (await confirmDialog({ title: "Delete this salary record?", message: "This action cannot be undone." })) {
                  await deleteSalary(r.id);
                  toast({ type: "success", title: "Record deleted" });
                }
              }, label: "Delete"
            }
          ])
        }
      ],
      rows: filtered(),
      searchFields: ["teacherName", "receiptNumber", "designation", "paymentMode", "month"],
      emptyTitle: "No salary records yet",
      emptySub: "Click \"Generate Salary\" to create the first payout.",
      toolbar: [monthSel, statusSel]
    });
    mount.appendChild(table.node);
  });

  page.addEventListener("view:unmount", () => {
    unsubT && unsubT();
    unsubS && unsubS();
    unsubT = null;
    unsubS = null;
  });

  return page;
}

// ---------- Helpers ----------
function rowActions(items) {
  const wrap = el("div", { class: "row-actions" });
  items.forEach(it => {
    const b = el("button", { class: `icon-btn-sm ${it.danger ? "danger" : ""}`, title: it.label, "data-testid": it.testId, html: it.icon });
    b.onclick = it.onClick;
    wrap.appendChild(b);
  });
  return wrap;
}

function field(label, node) {
  return el("div", { class: "form-row" }, [el("label", { html: label }), node]);
}

// ---------- Generate Salary Modal ----------
function openGenerateSalary() {
  if (!teachers.length) {
    toast({ type: "error", title: "No teachers", message: "Add at least one teacher first." });
    return;
  }

  const body = el("div");

  const tSel = el("select", { class: "select", "data-testid": "sal-teacher" });
  tSel.appendChild(el("option", { value: "", text: "Select teacher" }));
  teachers.forEach(t => tSel.appendChild(el("option", { value: t.id, text: `${t.name} · ${t.teacherId} · ${fmtCurrency(t.salary || 0)}` })));

  const monthSel = el("select", { class: "select", "data-testid": "sal-month" }, [
    ...MONTHS.map(m => el("option", { value: m, text: m }))
  ]);
  monthSel.value = new Date().toLocaleString("en-US", { month: "long" });

  const yearInp = el("input", { class: "input", type: "number", value: String(new Date().getFullYear()), "data-testid": "sal-year" });
  const amount = el("input", { class: "input", type: "number", min: "0", step: "0.01", "data-testid": "sal-amount" });
  const deductions = el("input", { class: "input", type: "number", min: "0", step: "0.01", value: "0", "data-testid": "sal-ded" });
  const bonus = el("input", { class: "input", type: "number", min: "0", step: "0.01", value: "0", "data-testid": "sal-bonus" });
  const mode = el("select", { class: "select", "data-testid": "sal-mode" }, [
    el("option", { value: "", text: "Select mode" }),
    ...PAY_MODES.map(m => el("option", { value: m, text: m }))
  ]);
  const dt = el("input", { class: "input", type: "date", value: todayISO(), "data-testid": "sal-date" });
  const status = el("select", { class: "select", "data-testid": "sal-status" }, [
    el("option", { value: "Paid", text: "Paid" }),
    el("option", { value: "Pending", text: "Pending" })
  ]);

  // Auto-populate salary when teacher is selected
  tSel.addEventListener("change", () => {
    const t = teachers.find(x => x.id === tSel.value);
    if (t) amount.value = String(t.salary || 0);
  });

  const grid = el("div", { class: "form-grid" }, [
    field("Teacher *", tSel),
    field("Month *", monthSel),
    field("Year *", yearInp),
    field("Base Salary *", amount),
    field("Deductions", deductions),
    field("Bonus", bonus),
    field("Payment Mode", mode),
    field("Payment Date", dt),
    field("Status", status)
  ]);
  body.appendChild(grid);

  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const save = el("button", { class: "btn btn-primary", "data-testid": "save-sal-btn", text: "Save Salary" });
  const m = openModal({ title: "Generate Salary", body, footer: [cancel, save], size: "large" });

  cancel.onclick = () => m.close();

  save.onclick = async () => {
    const t = teachers.find(x => x.id === tSel.value);
    if (!t) { toast({ type: "error", title: "Select a teacher" }); return; }

    const base = Number(amount.value) || 0;
    const ded = Number(deductions.value) || 0;
    const bon = Number(bonus.value) || 0;

    if (base <= 0) { toast({ type: "error", title: "Enter base salary" }); return; }
    if (status.value === "Paid" && !mode.value) { toast({ type: "error", title: "Select payment mode" }); return; }

    const net = base - ded + bon;

    save.disabled = true;
    save.textContent = "Saving…";
    try {
      const created = await recordSalaryPayment({
        teacherId: t.id,
        teacherName: t.name,
        teacherIdShort: t.teacherId,
        designation: t.designation,
        department: t.department,
        month: monthSel.value,
        year: Number(yearInp.value),
        baseSalary: base,
        deductions: ded,
        bonus: bon,
        amount: net,
        paymentMode: mode.value,
        date: dt.value,
        status: status.value
      });
      toast({ type: "success", title: "Salary recorded", message: `Receipt #${created.receiptNumber}` });
      m.close();
      openSalaryReceipt(created);
    } catch (e) {
      toast({ type: "error", title: "Save failed", message: e.message });
      save.disabled = false;
      save.textContent = "Save Salary";
    }
  };
}
