// Dashboard view — live summary + recent activity
import { el, ICON, fmtCurrency, fmtDate, initials, SCHOOL } from "../utils.js";
import { subscribeStudents, subscribeTeachers, subscribeFees, subscribeSalaries } from "../data.js";
import { setCrumbs, loadingState } from "../ui.js";

export function DashboardView() {
  setCrumbs([{ label: "Dashboard" }]);
  const page = el("div");

  // ---------- Header ----------
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Dashboard" }),
      el("p", { class: "page-subtitle", text: `Live overview of ${SCHOOL.name} — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` })
    ])
  ]));

  // ---------- Summary Grid ----------
  const summary = el("div", { class: "summary-grid", "data-testid": "dashboard-summary" });
  page.appendChild(summary);

  // ---------- Recent Activity Cards ----------
  const recentWrap = el("div", { class: "two-col" });
  const recentAdmissions = card("Recent Admissions", "Latest students added");
  const recentFees = card("Recent Fee Payments", "Last collections");
  const recentSalaries = card("Recent Salary Payments", "Last payouts");

  page.appendChild(recentWrap);
  recentWrap.appendChild(recentAdmissions.wrap);
  recentWrap.appendChild(recentFees.wrap);
  page.appendChild(recentSalaries.wrap);

  // Show loading states
  recentAdmissions.body.appendChild(loadingState("Loading students…"));
  recentFees.body.appendChild(loadingState("Loading fees…"));
  recentSalaries.body.appendChild(loadingState("Loading salary…"));

  // ---------- Data State ----------
  let students = [], teachers = [], fees = [], salaries = [];

  // ---------- Subscriptions ----------
  const unsubs = [
    subscribeStudents((v) => { students = v || []; render(); }),
    subscribeTeachers((v) => { teachers = v || []; render(); }),
    subscribeFees((v) => { fees = v || []; render(); }),
    subscribeSalaries((v) => { salaries = v || []; render(); })
  ];

  page.addEventListener("view:unmount", () => unsubs.forEach(u => u && u()));

  // ---------- Render Function ----------
  function render() {
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth();

    // Monthly fees
    const monthFees = fees.filter(f => {
      const d = f.date ? new Date(f.date) : null;
      return d && d.getFullYear() === y && d.getMonth() === m;
    });
    // Today's fees
    const todayFees = fees.filter(f => {
      const d = f.date ? new Date(f.date) : null;
      return d && d.toDateString() === today.toDateString();
    });
    // Monthly salaries paid
    const monthSalPaid = salaries.filter(s => {
      const d = s.date ? new Date(s.date) : null;
      return d && d.getFullYear() === y && d.getMonth() === m;
    });

    const totalCollection = monthFees.reduce((a, b) => a + Number(b.amount || 0), 0);
    const todayCollection = todayFees.reduce((a, b) => a + Number(b.amount || 0), 0);
    const pendingFees = fees.filter(f => (f.balance || 0) > 0).reduce((a, b) => a + Number(b.balance || 0), 0);
    const totalSalPaid = monthSalPaid.filter(s => s.status !== "Pending").reduce((a, b) => a + Number(b.amount || 0), 0);
    const pendingSalary = salaries.filter(s => s.status === "Pending").reduce((a, b) => a + Number(b.amount || 0), 0);

    // Build summary stats
    summary.innerHTML = "";
    [
      { label: "Total Students", value: students.length, icon: ICON.users, tone: "" },
      { label: "Total Teachers", value: teachers.length, icon: ICON.briefcase, tone: "sky" },
      { label: "Monthly Fee Collection", value: fmtCurrency(totalCollection), icon: ICON.money, tone: "green", foot: `${monthFees.length} payments this month` },
      { label: "Pending Fees", value: fmtCurrency(pendingFees), icon: ICON.warn, tone: "red" },
      { label: "Today's Collection", value: fmtCurrency(todayCollection), icon: ICON.trend, tone: "amber", foot: `${todayFees.length} payments today` },
      { label: "Total Salary Paid", value: fmtCurrency(totalSalPaid), icon: ICON.receipt, tone: "green" },
      { label: "Pending Salary", value: fmtCurrency(pendingSalary), icon: ICON.clock, tone: "red" },
      { label: "Total Fee Records", value: fees.length, icon: ICON.inbox, tone: "" }
    ].forEach(s => summary.appendChild(stat(s)));

    // Fill recent cards
    fillRecent(recentAdmissions.body, students.slice(0, 6), r => ({
      title: r.name,
      sub: `${r.class || "—"} · ${r.section || "—"} · Adm #${r.admissionNumber || "—"}`,
      side: fmtDate(r.admissionDate || r.createdAt),
      avatar: r
    }));

    fillRecent(recentFees.body, fees.slice(0, 6), r => ({
      title: r.studentName || "—",
      sub: `${r.feeType || "Fee"} · Receipt #${r.receiptNumber}`,
      side: fmtCurrency(r.amount),
      avatar: { name: r.studentName }
    }));

    fillRecent(recentSalaries.body, salaries.slice(0, 6), r => ({
      title: r.teacherName || "—",
      sub: `${r.month || ""} · Receipt #${r.receiptNumber}`,
      side: fmtCurrency(r.amount),
      avatar: { name: r.teacherName }
    }));
  }

  return page;
}

// ---------- Helper: Card ----------
function card(title, subtitle) {
  const body = el("div", { class: "card-body" });
  const wrap = el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [
      el("div", {}, [
        el("div", { class: "card-title", text: title }),
        el("div", { class: "card-subtitle", text: subtitle })
      ])
    ]),
    body
  ]);
  return { wrap, body };
}

// ---------- Helper: Stat ----------
function stat({ label, value, icon, tone = "", foot = "" }) {
  return el("div", { class: "stat" }, [
    el("div", { class: "stat-top" }, [
      el("div", { class: "stat-label", text: label }),
      el("div", { class: `stat-icon ${tone}`, html: icon })
    ]),
    el("div", { class: "stat-value", text: String(value) }),
    el("div", { class: "stat-foot", text: foot || "" })
  ]);
}

// ---------- Helper: Fill Recent ----------
function fillRecent(container, rows, mapper) {
  container.innerHTML = "";
  if (!rows.length) {
    container.appendChild(el("div", { class: "state" }, [
      el("div", { html: ICON.inbox }),
      el("div", { class: "state-sub", text: "No records yet." })
    ]));
    return;
  }
  const list = el("div", { style: "display:flex;flex-direction:column;" });
  rows.forEach(r => {
    const m = mapper(r);
    const row = el("div", { style: "display:flex;gap:12px;padding:12px 4px;border-bottom:1px solid var(--border);align-items:center;" }, [
      avatarNode(m.avatar),
      el("div", { style: "flex:1;min-width:0;" }, [
        el("div", { style: "font-weight:600;font-size:13.5px;color:var(--text);", text: m.title }),
        el("div", { style: "font-size:12px;color:var(--muted);margin-top:2px;", text: m.sub })
      ]),
      el("div", { style: "font-size:12.5px;color:var(--muted);", text: m.side })
    ]);
    list.appendChild(row);
  });
  container.appendChild(list);
}

// ---------- Helper: Avatar ----------
function avatarNode(o = {}) {
  const av = el("div", { class: "avatar" });
  if (o.photoUrl) av.appendChild(el("img", { src: o.photoUrl, alt: "" }));
  else av.textContent = initials(o.name || "");
  return av;
}
