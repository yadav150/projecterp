// Fee Management — collect, list, filter, generate receipts
import {
  el, ICON, fmtCurrency, fmtDate, todayISO, CLASSES,
  FEE_TYPES, PAY_MODES, required
} from "../utils.js";
import { DataTable, setCrumbs, openModal, confirmDialog, toast, loadingState } from "../ui.js";
import { subscribeStudents, subscribeFees, recordFeePayment, deleteFee } from "../data.js";
import { openFeeReceipt } from "./receipts.js";

let students = [];
let unsubS = null, unsubF = null;

export function FeesView() {
  setCrumbs([{ label: "Fee Management" }]);
  const page = el("div", { "data-testid": "fees-view" });
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Fee Management" }),
      el("p", { class: "page-subtitle", text: "Collect fees, track history and generate receipts." })
    ]),
    el("div", { class: "page-actions" }, [
      el("button", { class: "btn btn-primary", "data-testid": "collect-fee-btn", onclick: () => openCollectFee(), html: `${ICON.plus}<span>Collect Fee</span>` })
    ])
  ]));

  const stats = el("div", { class: "summary-grid" }); page.appendChild(stats);
  const mount = el("div"); page.appendChild(mount);
  mount.appendChild(loadingState("Loading fees…"));

  const classSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Classes" }),
    ...CLASSES.map(c => el("option", { value: c, text: c }))
  ]);
  const statusSel = el("select", { class: "select" }, [
    el("option", { value: "", text: "All" }),
    el("option", { value: "Paid", text: "Paid" }),
    el("option", { value: "Partial", text: "Partial" }),
    el("option", { value: "Pending", text: "Pending" })
  ]);
  const dateFrom = el("input", { type: "date", class: "input", style: "max-width:170px;" });
  const dateTo = el("input", { type: "date", class: "input", style: "max-width:170px;" });
  [classSel, statusSel, dateFrom, dateTo].forEach(x => x.addEventListener("change", () => table && table.setRows(filtered())));

  let table = null, rows = [];
  function filtered() {
    return rows.filter(r => {
      if (classSel.value && r.class !== classSel.value) return false;
      if (statusSel.value && r.status !== statusSel.value) return false;
      if (dateFrom.value && r.date && r.date < dateFrom.value) return false;
      if (dateTo.value && r.date && r.date > dateTo.value) return false;
      return true;
    });
  }

  unsubS && unsubS(); unsubS = subscribeStudents(v => { students = v || []; });
  unsubF && unsubF();
  unsubF = subscribeFees((list) => {
    rows = list;
    // stats
    const total = rows.reduce((a, b) => a + Number(b.amount || 0), 0);
    const paid = rows.filter(r => r.status !== "Pending").reduce((a, b) => a + Number(b.amount || 0), 0);
    const pending = rows.reduce((a, b) => a + Number(b.balance || 0), 0);
    const today = todayISO();
    const todayColl = rows.filter(r => r.date === today).reduce((a, b) => a + Number(b.amount || 0), 0);
    stats.innerHTML = "";
    [
      { l: "Total Collected", v: fmtCurrency(paid), icon: ICON.money, tone: "green" },
      { l: "Pending", v: fmtCurrency(pending), icon: ICON.warn, tone: "red" },
      { l: "Today's Collection", v: fmtCurrency(todayColl), icon: ICON.trend, tone: "amber" },
      { l: "Total Records", v: rows.length, icon: ICON.receipt, tone: "" }
    ].forEach(s => stats.appendChild(el("div", { class: "stat" }, [
      el("div", { class: "stat-top" }, [el("div", { class: "stat-label", text: s.l }), el("div", { class: `stat-icon ${s.tone}`, html: s.icon })]),
      el("div", { class: "stat-value", text: String(s.v) })
    ])));

    mount.innerHTML = "";
    table = DataTable({
      testId: "fees-table",
      columns: [
        { key: "receiptNumber", label: "Receipt #", sortable: true, render: r => r.receiptNumber || "—" },
        { key: "studentName", label: "Student", sortable: true, render: r => el("div", {}, [
          el("div", { style: "font-weight:600;", text: r.studentName || "—" }),
          el("div", { style: "font-size:12px;color:var(--muted);", text: `Adm #${r.admissionNumber || "—"}` })
        ]) },
        { key: "class", label: "Class", sortable: true, render: r => `${r.class || "—"} ${r.section ? "· " + r.section : ""}` },
        { key: "feeType", label: "Fee Type", render: r => r.feeType || "—" },
        { key: "amount", label: "Amount", sortable: true, render: r => fmtCurrency(r.amount) },
        { key: "balance", label: "Balance", sortable: true, render: r => `<span style="color:${(r.balance || 0) > 0 ? "var(--danger)" : "var(--muted)"}">${fmtCurrency(r.balance || 0)}</span>` },
        { key: "date", label: "Date", sortable: true, render: r => fmtDate(r.date) },
        { key: "status", label: "Status", render: r => `<span class="badge ${r.status === "Paid" ? "green" : r.status === "Partial" ? "amber" : "red"}">${r.status || "Paid"}</span>` },
        { key: "_", label: "", render: r => rowActions([
          { icon: ICON.receipt, testId: `frec-${r.id}`, onClick: () => openFeeReceipt(r), label: "Receipt" },
          { icon: ICON.trash, danger: true, testId: `fdel-${r.id}`, onClick: async () => {
            if (await confirmDialog({ title: "Delete this fee record?", message: "This action cannot be undone." })) {
              await deleteFee(r.id); toast({ type: "success", title: "Record deleted" });
            }
          }, label: "Delete" }
        ]) }
      ],
      rows: filtered(),
      searchFields: ["studentName", "receiptNumber", "admissionNumber", "feeType", "paymentMode"],
      emptyTitle: "No fee records yet",
      emptySub: "Click \"Collect Fee\" to add the first payment.",
      toolbar: [classSel, statusSel, dateFrom, dateTo]
    });
    mount.appendChild(table.node);
  });

  page.addEventListener("view:unmount", () => {
    unsubS && unsubS(); unsubF && unsubF(); unsubS = null; unsubF = null;
  });
  return page;
}

function rowActions(items) {
  const wrap = el("div", { class: "row-actions" });
  items.forEach(it => {
    const b = el("button", { class: `icon-btn-sm ${it.danger ? "danger" : ""}`, title: it.label, "data-testid": it.testId, html: it.icon });
    b.onclick = it.onClick; wrap.appendChild(b);
  });
  return wrap;
}

function openCollectFee() {
  if (!students.length) {
    toast({ type: "error", title: "No students", message: "Please add at least one student first." });
    return;
  }
  const body = el("div");

  const studentSel = el("select", { class: "select", "data-testid": "fee-student" });
  studentSel.appendChild(el("option", { value: "", text: "Select student" }));
  students.forEach(s => studentSel.appendChild(el("option", { value: s.id, text: `${s.name} · Adm #${s.admissionNumber || "—"} · ${s.class || ""}${s.section ? " " + s.section : ""}` })));

  const feeType = el("select", { class: "select", "data-testid": "fee-type" }, [
    el("option", { value: "", text: "Select fee type" }),
    ...FEE_TYPES.map(t => el("option", { value: t, text: t }))
  ]);
  const amount = el("input", { class: "input", type: "number", min: "0", step: "0.01", "data-testid": "fee-amount", placeholder: "0.00" });
  const paidAmt = el("input", { class: "input", type: "number", min: "0", step: "0.01", "data-testid": "fee-paid", placeholder: "0.00" });
  const mode = el("select", { class: "select", "data-testid": "fee-mode" }, [
    el("option", { value: "", text: "Select mode" }),
    ...PAY_MODES.map(m => el("option", { value: m, text: m }))
  ]);
  const dt = el("input", { class: "input", type: "date", value: todayISO(), "data-testid": "fee-date" });
  const month = el("input", { class: "input", type: "month", value: new Date().toISOString().slice(0, 7), "data-testid": "fee-month" });
  const remarks = el("textarea", { class: "textarea", rows: 2, placeholder: "Notes (optional)" });

  const grid = el("div", { class: "form-grid" }, [
    field("Student *", studentSel),
    field("Fee Type *", feeType),
    field("Amount Due *", amount),
    field("Paid Amount *", paidAmt),
    field("Payment Mode *", mode),
    field("Payment Date *", dt),
    field("For Month", month),
    field("Remarks", remarks)
  ]);
  body.appendChild(grid);

  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const save = el("button", { class: "btn btn-primary", "data-testid": "save-fee-btn", text: "Record Payment" });
  const m = openModal({ title: "Collect Fee Payment", body, footer: [cancel, save], size: "large" });
  cancel.onclick = () => m.close();
  save.onclick = async () => {
    const stu = students.find(s => s.id === studentSel.value);
    if (!stu) { toast({ type: "error", title: "Please select a student" }); return; }
    if (!feeType.value) { toast({ type: "error", title: "Select fee type" }); return; }
    const amt = Number(amount.value) || 0, paid = Number(paidAmt.value) || 0;
    if (amt <= 0) { toast({ type: "error", title: "Enter a valid amount" }); return; }
    if (paid < 0 || paid > amt) { toast({ type: "error", title: "Paid must be between 0 and amount due" }); return; }
    if (!mode.value) { toast({ type: "error", title: "Select payment mode" }); return; }
    const balance = amt - paid;
    const status = balance <= 0 ? "Paid" : (paid === 0 ? "Pending" : "Partial");
    save.disabled = true; save.textContent = "Saving…";
    try {
      const created = await recordFeePayment({
        studentId: stu.id,
        studentName: stu.name,
        admissionNumber: stu.admissionNumber,
        class: stu.class,
        section: stu.section,
        feeType: feeType.value,
        amount: amt,
        paidAmount: paid,
        balance,
        status,
        paymentMode: mode.value,
        date: dt.value,
        month: month.value,
        remarks: remarks.value
      });
      toast({ type: "success", title: "Payment recorded", message: `Receipt #${created.receiptNumber}` });
      m.close();
      openFeeReceipt(created);
    } catch (e) {
      toast({ type: "error", title: "Failed to record", message: e.message });
      save.disabled = false; save.textContent = "Record Payment";
    }
  };
}

function field(label, node) {
  return el("div", { class: "form-row" }, [
    el("label", { html: label }),
    node
  ]);
}
