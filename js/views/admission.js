// Receipts view + shared receipt renderer (Fee / Salary)
import { el, ICON, SCHOOL, fmtCurrency, fmtDate } from "../utils.js";
import { setCrumbs, openModal, loadingState, DataTable } from "../ui.js";
import { subscribeFees, subscribeSalaries } from "../data.js";
import { printNode } from "../pdf.js";

export function ReceiptsView() {
  setCrumbs([{ label: "Receipts" }]);
  const page = el("div", { "data-testid": "receipts-view" });
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Receipts" }),
      el("p", { class: "page-subtitle", text: "Browse fee and salary receipts. Print any receipt directly." })
    ])
  ]));

  const tabs = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;" });
  const feeTab = tabBtn("Fee Receipts", true);
  const salTab = tabBtn("Salary Receipts", false);
  tabs.appendChild(feeTab); tabs.appendChild(salTab);
  page.appendChild(tabs);

  const feeMount = el("div"); const salMount = el("div", { style: "display:none;" });
  page.appendChild(feeMount); page.appendChild(salMount);
  feeMount.appendChild(loadingState("Loading fee receipts…"));
  salMount.appendChild(loadingState("Loading salary receipts…"));

  feeTab.onclick = () => { setActive(feeTab, salTab); feeMount.style.display = ""; salMount.style.display = "none"; };
  salTab.onclick = () => { setActive(salTab, feeTab); salMount.style.display = ""; feeMount.style.display = "none"; };

  const unsub1 = subscribeFees(list => {
    feeMount.innerHTML = "";
    const table = DataTable({
      testId: "fee-receipts-table",
      columns: [
        { key: "receiptNumber", label: "Receipt #", sortable: true },
        { key: "studentName", label: "Student", sortable: true },
        { key: "class", label: "Class", render: r => `${r.class || "—"} ${r.section ? "· " + r.section : ""}` },
        { key: "feeType", label: "Fee Type" },
        { key: "amount", label: "Amount", render: r => fmtCurrency(r.amount) },
        { key: "date", label: "Date", sortable: true, render: r => fmtDate(r.date) },
        { key: "_", label: "", render: r => actions([
          { icon: ICON.receipt, onClick: () => openFeeReceipt(r), label: "View", testId: `rc-view-${r.id}` }
        ]) }
      ],
      rows: list,
      searchFields: ["studentName", "receiptNumber", "feeType"],
      emptyTitle: "No fee receipts",
      emptySub: "Collect a fee payment to generate a receipt."
    });
    feeMount.appendChild(table.node);
  });
  const unsub2 = subscribeSalaries(list => {
    salMount.innerHTML = "";
    const table = DataTable({
      testId: "sal-receipts-table",
      columns: [
        { key: "receiptNumber", label: "Receipt #", sortable: true },
        { key: "teacherName", label: "Teacher", sortable: true },
        { key: "designation", label: "Designation" },
        { key: "month", label: "Month", render: r => `${r.month || "—"} ${r.year || ""}` },
        { key: "amount", label: "Amount", render: r => fmtCurrency(r.amount) },
        { key: "date", label: "Date", sortable: true, render: r => fmtDate(r.date) },
        { key: "_", label: "", render: r => actions([
          { icon: ICON.receipt, onClick: () => openSalaryReceipt(r), label: "View", testId: `sr-view-${r.id}` }
        ]) }
      ],
      rows: list,
      searchFields: ["teacherName", "receiptNumber", "designation"],
      emptyTitle: "No salary receipts",
      emptySub: "Generate salary payments to see receipts here."
    });
    salMount.appendChild(table.node);
  });

  page.addEventListener("view:unmount", () => { unsub1 && unsub1(); unsub2 && unsub2(); });
  return page;
}

function tabBtn(label, active) {
  return el("button", { class: `btn ${active ? "btn-primary" : "btn-outline"}`, text: label });
}
function setActive(on, off) {
  on.className = "btn btn-primary"; off.className = "btn btn-outline";
}
function actions(items) {
  const wrap = el("div", { class: "row-actions" });
  items.forEach(it => {
    const b = el("button", { class: "icon-btn-sm", title: it.label, "data-testid": it.testId, html: it.icon });
    b.onclick = it.onClick; wrap.appendChild(b);
  });
  return wrap;
}

// ---------- Receipt renderers ----------
export function openFeeReceipt(r) {
  const node = renderReceipt({
    kind: "Fee Receipt",
    number: r.receiptNumber,
    date: r.date,
    parties: [
      ["Student", r.studentName], ["Admission #", r.admissionNumber],
      ["Class", r.class ? `${r.class}${r.section ? " · " + r.section : ""}` : "—"],
      ["Payment Mode", r.paymentMode]
    ],
    lines: [
      { desc: `${r.feeType || "Fee"} ${r.month ? `(${r.month})` : ""}`, amount: Number(r.amount) || 0 }
    ],
    totalDue: Number(r.amount) || 0,
    paid: Number(r.paidAmount ?? r.amount) || 0,
    balance: Number(r.balance) || 0,
    remarks: r.remarks
  });
  openReceiptModal("Fee Receipt", node);
}

export function openSalaryReceipt(r) {
  const gross = Number(r.baseSalary || r.amount) || 0;
  const ded = Number(r.deductions) || 0, bon = Number(r.bonus) || 0;
  const net = Number(r.amount) || (gross - ded + bon);
  const node = renderReceipt({
    kind: "Salary Slip",
    number: r.receiptNumber,
    date: r.date,
    parties: [
      ["Teacher", r.teacherName], ["Teacher ID", r.teacherIdShort],
      ["Designation", r.designation], ["Payment Mode", r.paymentMode],
      ["Month", `${r.month || ""} ${r.year || ""}`], ["Status", r.status]
    ],
    lines: [
      { desc: "Base Salary", amount: gross },
      ded > 0 ? { desc: "Deductions", amount: -ded } : null,
      bon > 0 ? { desc: "Bonus / Allowance", amount: bon } : null
    ].filter(Boolean),
    totalDue: net,
    paid: r.status === "Paid" ? net : 0,
    balance: r.status === "Paid" ? 0 : net,
    remarks: ""
  });
  openReceiptModal("Salary Slip", node);
}

// ---------- Modal with horizontal scroll and Print only ----------
function openReceiptModal(title, node) {
  const scrollWrapper = el("div", {
    style: "overflow-x: auto; width: 100%; padding: 8px 0;"
  });
  scrollWrapper.appendChild(node);

  const printBtn = el("button", {
    class: "btn btn-outline",
    html: `${ICON.print}<span>Print</span>`
  });
  const closeBtn = el("button", { class: "btn btn-ghost", text: "Close" });

  const m = openModal({
    title,
    body: scrollWrapper,
    footer: [closeBtn, printBtn],
    size: "large"
  });

  closeBtn.onclick = () => m.close();
  printBtn.onclick = () => printNode(node);
}

// ---------- Receipt HTML renderer (with forced 2‑column grid) ----------
function renderReceipt({ kind, number, date, parties, lines, totalDue, paid, balance, remarks }) {
  const wrap = el("div", { class: "receipt print-area", "data-testid": "receipt", style: "max-width: 100%;" });
  wrap.appendChild(el("div", { class: "receipt-head" }, [
    el("div", { class: "receipt-brand" }, [
      el("div", { class: "logo", html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` }),
      el("div", {}, [
        el("div", { class: "school-name", text: SCHOOL.name }),
        el("div", { class: "school-meta", text: SCHOOL.address }),
        el("div", { class: "school-meta", text: `${SCHOOL.phone} · ${SCHOOL.email} · ${SCHOOL.website}` })
      ])
    ]),
    el("div", { class: "receipt-tag" }, [
      el("h3", { text: kind }),
      el("div", { class: "r-num", text: `Receipt #: ${number}` }),
      el("div", { class: "r-num", text: `Date: ${fmtDate(date)}` })
    ])
  ]));

  // --- FORCE 2‑COLUMN GRID CONSISTENTLY ---
  const gridStyle = "display: grid; grid-template-columns: repeat(2, 1fr) !important; gap: 8px 24px; font-size: 13px;";

  wrap.appendChild(el("div", { class: "receipt-section" }, [
    el("h4", { text: "Details" }),
    el("div", { class: "receipt-info-grid", style: gridStyle }, parties.map(([k, v]) => el("div", {}, [
      el("span", { class: "k", text: k }), el("span", { class: "v", text: v || "—" })
    ])))
  ]));

  const table = el("table", { class: "receipt-table" });
  table.innerHTML = `<thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>`;
  const tbody = el("tbody");
  lines.forEach(l => {
    tbody.appendChild(el("tr", {}, [
      el("td", { text: l.desc }),
      el("td", { style: "text-align:right;", text: fmtCurrency(l.amount) })
    ]));
  });
  tbody.appendChild(el("tr", { class: "total-row" }, [el("td", { text: "Total" }), el("td", { style: "text-align:right;", text: fmtCurrency(totalDue) })]));
  tbody.appendChild(el("tr", {}, [el("td", { text: "Amount Paid" }), el("td", { style: "text-align:right;", text: fmtCurrency(paid) })]));
  tbody.appendChild(el("tr", {}, [el("td", { text: "Balance Due" }), el("td", { style: `text-align:right;color:${balance > 0 ? "var(--danger)" : "var(--muted)"};font-weight:600;`, text: fmtCurrency(balance) })]));
  table.appendChild(tbody);
  wrap.appendChild(table);

  if (remarks) wrap.appendChild(el("div", { class: "receipt-section", style: "margin-top:12px;" }, [
    el("h4", { text: "Remarks" }),
    el("div", { style: "font-size:13px;color:var(--text);", text: remarks })
  ]));

  wrap.appendChild(el("div", { class: "receipt-foot" }, [
    el("div", { class: "note", text: "This is a computer-generated receipt. No signature required. For queries, contact the office." }),
    el("div", { class: "sign" }, [el("div", { class: "line" }), el("div", { text: "Authorized Signatory" })])
  ]));
  return wrap;
}
