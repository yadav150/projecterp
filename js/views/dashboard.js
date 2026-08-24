// Dashboard view — live summary + recent activity, with role‑based views
import { el, ICON, fmtCurrency, fmtDate, initials, SCHOOL } from "../utils.js";
import { subscribeStudents, subscribeTeachers, subscribeFees, subscribeSalaries } from "../data.js";
import { setCrumbs, loadingState } from "../ui.js";

// ---------- Role state ----------
let currentRole = "admin"; // 'admin' | 'teacher' | 'student' | 'parent'
let roleChangeListeners = [];

function setRole(role) {
  if (role === currentRole) return;
  currentRole = role;
  roleChangeListeners.forEach(fn => fn(role));
  const dashboardNode = document.querySelector('[data-dashboard-root]');
  if (dashboardNode) {
    dashboardNode.dispatchEvent(new CustomEvent('roleChange', { detail: { role } }));
  }
}

// ---------- Dashboard View ----------
export function DashboardView() {
  setCrumbs([{ label: "Dashboard" }]);
  const page = el("div", { "data-dashboard-root": true });

  // Inject role switcher into topbar
  injectRoleSwitcher();

  // Header
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Dashboard" }),
      el("p", { class: "page-subtitle", text: `Live overview of ${SCHOOL.name} — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` })
    ])
  ]));

  // Container for dynamic content
  const content = el("div", { id: "dashboard-content" });
  page.appendChild(content);

  // ----- Build static structure (only once) -----
  // 1. Summary grid
  const summaryGrid = el("div", { class: "summary-grid", "data-testid": "dashboard-summary" });
  content.appendChild(summaryGrid);

  // 2. Two-col for recent admissions & fees
  const recentWrap = el("div", { class: "two-col" });
  const recentAdmissions = createCard("Recent Admissions", "Latest students added");
  const recentFees = createCard("Recent Fee Payments", "Last collections");
  recentWrap.appendChild(recentAdmissions.wrap);
  recentWrap.appendChild(recentFees.wrap);
  content.appendChild(recentWrap);

  // 3. Recent salaries card (full width)
  const recentSalaries = createCard("Recent Salary Payments", "Last payouts");
  content.appendChild(recentSalaries.wrap);

  // 4. Activity feed
  const activityCard = createCard("Recent Activities", "Latest system actions");
  content.appendChild(activityCard.wrap);

  // 5. Upcoming events
  const eventsCard = createCard("Upcoming Events", "School events, exams, holidays");
  content.appendChild(eventsCard.wrap);

  // 6. Pending tasks
  const tasksCard = createCard("Pending Tasks", "Actions requiring attention");
  content.appendChild(tasksCard.wrap);

  // Store references to bodies for updates
  const bodies = {
    summary: summaryGrid,
    admissions: recentAdmissions.body,
    fees: recentFees.body,
    salaries: recentSalaries.body,
    activity: activityCard.body,
    events: eventsCard.body,
    tasks: tasksCard.body
  };

  // Data state
  let students = [], teachers = [], fees = [], salaries = [];

  // Subscription cleanups
  const unsubs = [];

  // Subscribe to data
  unsubs.push(subscribeStudents((v) => { students = v || []; updateDashboard(); }));
  unsubs.push(subscribeTeachers((v) => { teachers = v || []; updateDashboard(); }));
  unsubs.push(subscribeFees((v) => { fees = v || []; updateDashboard(); }));
  unsubs.push(subscribeSalaries((v) => { salaries = v || []; updateDashboard(); }));

  // Cleanup on unmount
  page.addEventListener("view:unmount", () => unsubs.forEach(u => u && u()));

  // Listen to role changes
  page.addEventListener("roleChange", (e) => {
    const newRole = e.detail.role;
    if (newRole !== currentRole) {
      currentRole = newRole;
      updateDashboard();
    }
  });

  // ---------- Update function (no DOM rebuild) ----------
  function updateDashboard() {
    const role = currentRole;

    // ---- Compute stats based on role ----
    let stats = [];
    if (role === "admin") {
      const today = new Date();
      const y = today.getFullYear(), m = today.getMonth();
      const monthFees = fees.filter(f => {
        const d = f.date ? new Date(f.date) : null; return d && d.getFullYear() === y && d.getMonth() === m;
      });
      const todayFees = fees.filter(f => {
        const d = f.date ? new Date(f.date) : null; return d && d.toDateString() === today.toDateString();
      });
      const monthSalPaid = salaries.filter(s => {
        const d = s.date ? new Date(s.date) : null; return d && d.getFullYear() === y && d.getMonth() === m;
      });
      const totalCollection = monthFees.reduce((a, b) => a + Number(b.amount || 0), 0);
      const todayCollection = todayFees.reduce((a, b) => a + Number(b.amount || 0), 0);
      const pendingFees = fees.filter(f => (f.balance || 0) > 0).reduce((a, b) => a + Number(f.balance || 0), 0);
      const totalSalPaid = monthSalPaid.filter(s => s.status !== "Pending").reduce((a, b) => a + Number(s.amount || 0), 0);
      const pendingSalary = salaries.filter(s => s.status === "Pending").reduce((a, b) => a + Number(s.amount || 0), 0);

      stats = [
        { label: "Total Students", value: students.length, icon: ICON.users, tone: "" },
        { label: "Total Teachers", value: teachers.length, icon: ICON.briefcase, tone: "sky" },
        { label: "Monthly Fee Collection", value: fmtCurrency(totalCollection), icon: ICON.money, tone: "green", foot: `${monthFees.length} payments this month` },
        { label: "Pending Fees", value: fmtCurrency(pendingFees), icon: ICON.warn, tone: "red" },
        { label: "Today's Collection", value: fmtCurrency(todayCollection), icon: ICON.trend, tone: "amber", foot: `${todayFees.length} payments today` },
        { label: "Total Salary Paid", value: fmtCurrency(totalSalPaid), icon: ICON.receipt, tone: "green" },
        { label: "Pending Salary", value: fmtCurrency(pendingSalary), icon: ICON.clock, tone: "red" },
        { label: "Total Fee Records", value: fees.length, icon: ICON.inbox, tone: "" }
      ];
    } else if (role === "teacher") {
      const pendingSalary = salaries.filter(s => s.status === "Pending").reduce((a, b) => a + Number(s.amount || 0), 0);
      stats = [
        { label: "Total Teachers", value: teachers.length, icon: ICON.briefcase, tone: "sky" },
        { label: "Pending Salary", value: fmtCurrency(pendingSalary), icon: ICON.clock, tone: "red" },
        { label: "Total Students", value: students.length, icon: ICON.users, tone: "" },
        { label: "Total Fee Records", value: fees.length, icon: ICON.inbox, tone: "" }
      ];
    } else if (role === "student" || role === "parent") {
      const pendingFees = fees.filter(f => (f.balance || 0) > 0).reduce((a, b) => a + Number(f.balance || 0), 0);
      stats = [
        { label: "Total Students", value: students.length, icon: ICON.users, tone: "" },
        { label: "Pending Fees", value: fmtCurrency(pendingFees), icon: ICON.warn, tone: "red" },
        { label: "Total Fee Records", value: fees.length, icon: ICON.inbox, tone: "" }
      ];
    }

    // Update summary grid (replace children)
    summaryGrid.innerHTML = "";
    stats.forEach(s => summaryGrid.appendChild(stat(s)));

    // Update recent cards (only for admin, others can show empty)
    if (role === "admin") {
      fillRecent(bodies.admissions, students.slice(0, 6), r => ({
        title: r.name,
        sub: `${r.class || "—"} · ${r.section || "—"} · Adm #${r.admissionNumber || "—"}`,
        side: fmtDate(r.admissionDate || r.createdAt),
        avatar: r
      }));
      fillRecent(bodies.fees, fees.slice(0, 6), r => ({
        title: r.studentName || "—",
        sub: `${r.feeType || "Fee"} · Receipt #${r.receiptNumber}`,
        side: fmtCurrency(r.amount),
        avatar: { name: r.studentName }
      }));
      fillRecent(bodies.salaries, salaries.slice(0, 6), r => ({
        title: r.teacherName || "—",
        sub: `${r.month || ""} · Receipt #${r.receiptNumber}`,
        side: fmtCurrency(r.amount),
        avatar: { name: r.teacherName }
      }));
    } else {
      // Hide or clear recent cards for other roles
      bodies.admissions.innerHTML = el("div", { class: "state", text: "Not available for this role" }).outerHTML;
      bodies.fees.innerHTML = el("div", { class: "state", text: "Not available for this role" }).outerHTML;
      bodies.salaries.innerHTML = el("div", { class: "state", text: "Not available for this role" }).outerHTML;
    }

    // Activity feed (all roles)
    fillActivityFeed(bodies.activity, students, fees, salaries);

    // Events (placeholder)
    fillUpcomingEvents(bodies.events);

    // Pending tasks (all roles)
    fillPendingTasks(bodies.tasks, fees, salaries);
  }

  // Initial update
  updateDashboard();

  return page;
}

// ============================================================
// Helper functions (unchanged, but moved outside)
// ============================================================

// ---------- Role switcher injection ----------
function injectRoleSwitcher() {
  const topbarRight = document.querySelector(".topbar-right");
  if (!topbarRight) return;
  if (topbarRight.querySelector('[data-role-switcher]')) return;

  const wrapper = el("div", { "data-role-switcher": true, style: "display:flex;align-items:center;gap:8px;" });
  const label = el("span", { text: "Role:", style: "font-size:12px;color:var(--muted);" });
  const select = el("select", { class: "select", style: "padding:4px 8px;font-size:12px;min-width:100px;" }, [
    el("option", { value: "admin", text: "Admin" }),
    el("option", { value: "teacher", text: "Teacher" }),
    el("option", { value: "student", text: "Student" }),
    el("option", { value: "parent", text: "Parent" })
  ]);
  select.value = currentRole;
  select.addEventListener("change", (e) => {
    const newRole = e.target.value;
    setRole(newRole);
  });
  wrapper.appendChild(label);
  wrapper.appendChild(select);
  topbarRight.prepend(wrapper);
}

// ---------- Card creator ----------
function createCard(title, subtitle) {
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

// ---------- Stat ----------
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

// ---------- Fill recent lists ----------
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

function avatarNode(o = {}) {
  const av = el("div", { class: "avatar" });
  if (o.photoUrl) av.appendChild(el("img", { src: o.photoUrl, alt: "" }));
  else av.textContent = initials(o.name || "");
  return av;
}

// ---------- Activity Feed ----------
function fillActivityFeed(container, students, fees, salaries) {
  const activities = [];

  students.forEach(s => {
    activities.push({
      ts: s.createdAt || 0,
      type: "student",
      text: `New student admission: ${s.name} (${s.admissionNumber})`,
      link: `#/students/${s.id}`
    });
  });

  fees.forEach(f => {
    activities.push({
      ts: f.createdAt || 0,
      type: "fee",
      text: `Fee payment of ${fmtCurrency(f.amount)} from ${f.studentName} (Receipt ${f.receiptNumber})`,
      link: `#/fees`
    });
  });

  salaries.forEach(s => {
    activities.push({
      ts: s.createdAt || 0,
      type: "salary",
      text: `Salary ${s.status} for ${s.teacherName} (${s.receiptNumber})`,
      link: `#/salary`
    });
  });

  activities.sort((a, b) => b.ts - a.ts);
  const latest = activities.slice(0, 10);

  container.innerHTML = "";
  if (!latest.length) {
    container.appendChild(el("div", { class: "state" }, [
      el("div", { html: ICON.inbox }),
      el("div", { class: "state-sub", text: "No activity yet." })
    ]));
    return;
  }

  const list = el("div", { style: "display:flex;flex-direction:column;" });
  latest.forEach(act => {
    const row = el("div", { style: "display:flex;gap:12px;padding:10px 4px;border-bottom:1px solid var(--border);align-items:center;" }, [
      el("div", { style: "flex:1;", text: act.text }),
      el("a", { href: act.link, style: "font-size:12px;color:var(--primary);", text: "View" })
    ]);
    list.appendChild(row);
  });
  container.appendChild(list);
}

// ---------- Upcoming Events (placeholder) ----------
function fillUpcomingEvents(container) {
  container.innerHTML = "";
  container.appendChild(el("div", { class: "state" }, [
    el("div", { html: ICON.inbox }),
    el("div", { class: "state-sub", text: "No upcoming events scheduled." })
  ]));
}

// ---------- Pending Tasks ----------
function fillPendingTasks(container, fees, salaries) {
  const pendingFees = fees.filter(f => (f.balance || 0) > 0);
  const pendingSalaries = salaries.filter(s => s.status === "Pending");

  const tasks = [];

  pendingFees.forEach(f => {
    tasks.push({
      text: `Fee balance of ${fmtCurrency(f.balance)} due from ${f.studentName} (Receipt ${f.receiptNumber})`,
      link: `#/fees`
    });
  });

  pendingSalaries.forEach(s => {
    tasks.push({
      text: `Salary of ${fmtCurrency(s.amount)} pending for ${s.teacherName} (${s.receiptNumber})`,
      link: `#/salary`
    });
  });

  container.innerHTML = "";
  if (!tasks.length) {
    container.appendChild(el("div", { class: "state" }, [
      el("div", { html: ICON.check }),
      el("div", { class: "state-sub", text: "No pending tasks. Everything is up to date!" })
    ]));
    return;
  }

  const list = el("div", { style: "display:flex;flex-direction:column;" });
  tasks.forEach(task => {
    const row = el("div", { style: "display:flex;gap:12px;padding:10px 4px;border-bottom:1px solid var(--border);align-items:center;" }, [
      el("div", { style: "flex:1;", text: task.text }),
      el("a", { href: task.link, style: "font-size:12px;color:var(--primary);", text: "View" })
    ]);
    list.appendChild(row);
  });
  container.appendChild(list);
}
