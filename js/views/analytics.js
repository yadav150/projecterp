// Essential Analytics Dashboard
import { el, ICON, fmtDate, fmtCurrency } from "../utils.js";
import { setCrumbs, loadingState, DataTable } from "../ui.js";
import { subscribeStudents, getStudent } from "../data.js";
import {
  subscribeFLNData,
  subscribeSkills,
  subscribeBehavioral,
  subscribeParentEngagement,
  subscribeFamilies,
  getAllFamilies
} from "../data_analytics.js";

const READING_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const MATH_SKILLS = ["Counting", "Addition", "Subtraction", "Multiplication", "Division", "Shapes", "Measurement"];

export function AnalyticsView() {
  setCrumbs([{ label: "Analytics" }]);
  const page = el("div", { "data-testid": "analytics-view" });
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Essential Analytics" }),
      el("p", { class: "page-subtitle", text: "FLN tracking, skill dashboards, behavioral trends, parent engagement, and sibling analytics." })
    ])
  ]));

  const tabContainer = el("div", { class: "profile-tabs", style: "display:flex; gap:4px; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:4px;" });
  const tabs = ["FLN Tracking", "Skill Competencies", "Behavioral Trends", "Parent Engagement", "Sibling & Fee"];
  const tabButtons = [];
  const content = el("div", { class: "tab-content", style: "min-height:400px;" });

  tabs.forEach(name => {
    const btn = el("button", {
      class: "btn btn-sm",
      style: `border-radius: var(--radius) var(--radius) 0 0; background:transparent; color:var(--text-2);`
    }, name);
    btn.dataset.tab = name;
    btn.addEventListener("click", () => switchTab(name));
    tabContainer.appendChild(btn);
    tabButtons.push(btn);
  });
  page.appendChild(tabContainer);
  page.appendChild(content);

  let students = [];
  let flnData = {};
  let skillsData = {};
  let behavioralData = {};
  let engagementData = {};
  let familiesData = {};

  const unsubs = [
    subscribeStudents(list => { students = list; }),
    subscribeFLNData(list => { flnData = Object.fromEntries(list.map(({id,...v}) => [id, v])); }),
    subscribeSkills(list => { skillsData = Object.fromEntries(list.map(({id,...v}) => [id, v])); }),
    subscribeBehavioral(list => { behavioralData = Object.fromEntries(list.map(({id,...v}) => [id, v])); }),
    subscribeParentEngagement(list => { engagementData = Object.fromEntries(list.map(({id,...v}) => [id, v])); }),
    subscribeFamilies(list => { familiesData = Object.fromEntries(list.map(({id,...v}) => [id, v])); })
  ];

  page.addEventListener("view:unmount", () => unsubs.forEach(u => u && u()));

  function renderFLN() {
    const wrap = el("div");
    const stats = el("div", { class: "summary-grid" });
    const totalStudents = students.length;
    const withFLN = Object.keys(flnData).length;
    const readingCounts = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    const mathLevels = {};
    MATH_SKILLS.forEach(s => mathLevels[s] = { Beginner: 0, Intermediate: 0, Advanced: 0 });
    Object.values(flnData).forEach(d => {
      if (d.readingLevel) readingCounts[d.readingLevel] = (readingCounts[d.readingLevel] || 0) + 1;
      if (d.mathSkills) {
        for (const [skill, level] of Object.entries(d.mathSkills)) {
          if (mathLevels[skill]) mathLevels[skill][level] = (mathLevels[skill][level] || 0) + 1;
        }
      }
    });
    stats.appendChild(stat("Students with FLN Data", `${withFLN}/${totalStudents}`, ICON.users));
    stats.appendChild(stat("Beginner Readers", readingCounts.Beginner || 0, ICON.warn, "red"));
    stats.appendChild(stat("Intermediate Readers", readingCounts.Intermediate || 0, ICON.check, "amber"));
    stats.appendChild(stat("Advanced Readers", readingCounts.Advanced || 0, ICON.check, "green"));
    wrap.appendChild(stats);

    const rows = students.filter(s => flnData[s.id]).map(s => ({
      id: s.id,
      name: s.name,
      class: s.class,
      readingLevel: flnData[s.id]?.readingLevel || "—",
      mathSkills: flnData[s.id]?.mathSkills || {}
    }));
    const table = DataTable({
      testId: "fln-table",
      columns: [
        { key: "name", label: "Student", sortable: true },
        { key: "class", label: "Class", sortable: true },
        { key: "readingLevel", label: "Reading Level", sortable: true },
        {
          key: "mathSkills",
          label: "Math Skills",
          render: r => {
            const skills = r.mathSkills;
            return el("span", {}, Object.entries(skills).map(([skill, level]) => 
              el("span", { class: "badge", style: `margin:2px;${level === 'Beginner' ? 'background:var(--danger-soft);color:var(--danger);' : level === 'Intermediate' ? 'background:var(--warning-soft);color:var(--warning);' : 'background:var(--success-soft);color:var(--success);'}` }, `${skill}: ${level}`)
            ));
          }
        }
      ],
      rows,
      searchFields: ["name", "class"],
      emptyTitle: "No FLN data recorded yet.",
      emptySub: "Add FLN assessments in the student records or manually via data layer."
    });
    wrap.appendChild(table.node);
    return wrap;
  }

  function renderSkills() {
    const wrap = el("div");
    const subjectSkills = {};
    Object.values(skillsData).forEach(studentSkills => {
      for (const [subject, data] of Object.entries(studentSkills)) {
        if (!subjectSkills[subject]) subjectSkills[subject] = {};
        for (const [skill, rating] of Object.entries(data.skills || {})) {
          if (!subjectSkills[subject][skill]) subjectSkills[subject][skill] = { total: 0, count: 0 };
          subjectSkills[subject][skill].total += Number(rating);
          subjectSkills[subject][skill].count += 1;
        }
      }
    });
    const rows = [];
    for (const [subject, skills] of Object.entries(subjectSkills)) {
      for (const [skill, stats] of Object.entries(skills)) {
        rows.push({ subject, skill, avgRating: (stats.total / stats.count).toFixed(1), count: stats.count });
      }
    }
    const table = DataTable({
      testId: "skills-table",
      columns: [
        { key: "subject", label: "Subject", sortable: true },
        { key: "skill", label: "Skill", sortable: true },
        { key: "avgRating", label: "Average Rating (1-5)", sortable: true },
        { key: "count", label: "Students Assessed", sortable: true }
      ],
      rows,
      searchFields: ["subject", "skill"],
      emptyTitle: "No skill data recorded.",
      emptySub: "Add competency assessments per student."
    });
    wrap.appendChild(table.node);
    return wrap;
  }

  function renderBehavioral() {
    const wrap = el("div");
    const rows = [];
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    students.forEach(s => {
      const notes = behavioralData[s.id] || [];
      const recentNotes = notes.filter(n => n.createdAt && n.createdAt > last30Days.getTime());
      rows.push({
        id: s.id,
        name: s.name,
        class: s.class,
        recentNotesCount: recentNotes.length,
        latestNote: notes.length ? notes[notes.length-1].note : "—",
        lastNoteDate: notes.length ? fmtDate(notes[notes.length-1].createdAt) : "—"
      });
    });
    const table = DataTable({
      testId: "behavioral-table",
      columns: [
        { key: "name", label: "Student", sortable: true },
        { key: "class", label: "Class", sortable: true },
        { key: "recentNotesCount", label: "Notes (30d)", sortable: true },
        { key: "latestNote", label: "Latest Note" },
        { key: "lastNoteDate", label: "Date" }
      ],
      rows,
      searchFields: ["name", "class"],
      emptyTitle: "No behavioral notes recorded.",
      emptySub: "Add notes in student records or via data layer."
    });
    wrap.appendChild(table.node);
    return wrap;
  }

  function renderEngagement() {
    const wrap = el("div");
    const rows = students.map(s => {
      const e = engagementData[s.id] || {};
      const lastLogin = e.lastLogin ? fmtDate(e.lastLogin) : "Never";
      const noticesRead = e.noticesRead ? e.noticesRead.length : 0;
      const homeworkChecked = e.homeworkChecked ? e.homeworkChecked.length : 0;
      return {
        id: s.id,
        name: s.name,
        class: s.class,
        lastLogin,
        noticesRead,
        homeworkChecked,
        engagementScore: (noticesRead + homeworkChecked + (lastLogin !== "Never" ? 1 : 0))
      };
    });
    const table = DataTable({
      testId: "engagement-table",
      columns: [
        { key: "name", label: "Student", sortable: true },
        { key: "class", label: "Class", sortable: true },
        { key: "lastLogin", label: "Last Login", sortable: true },
        { key: "noticesRead", label: "Notices Read", sortable: true },
        { key: "homeworkChecked", label: "Homework Checked", sortable: true },
        { key: "engagementScore", label: "Engagement Score", sortable: true }
      ],
      rows,
      searchFields: ["name", "class"],
      emptyTitle: "No parent engagement data recorded.",
      emptySub: "Update parent engagement via data layer."
    });
    wrap.appendChild(table.node);
    return wrap;
  }

  async function renderSiblingFee() {
    const wrap = el("div");
    const families = await getAllFamilies();
    const familyRows = [];
    for (const [familyId, family] of Object.entries(families)) {
      const siblings = family.siblings || [];
      const concession = family.concessionPercent || 0;
      const studentDetails = await Promise.all(siblings.map(id => getStudent(id)));
      const names = studentDetails.map(s => s ? s.name : "Unknown").join(", ");
      familyRows.push({
        familyId,
        siblingsCount: siblings.length,
        names,
        concessionPercent: concession,
        predictedEnrollment: siblings.length + 1
      });
    }
    const table = DataTable({
      testId: "sibling-table",
      columns: [
        { key: "familyId", label: "Family ID", sortable: true },
        { key: "siblingsCount", label: "Siblings", sortable: true },
        { key: "names", label: "Student Names" },
        { key: "concessionPercent", label: "Concession %", sortable: true, render: r => r.concessionPercent + "%" },
        { key: "predictedEnrollment", label: "Predicted Future Enrollment", sortable: true }
      ],
      rows: familyRows,
      searchFields: ["familyId", "names"],
      emptyTitle: "No sibling/fee data recorded.",
      emptySub: "Create family groups to track sibling discounts."
    });
    wrap.appendChild(table.node);
    return wrap;
  }

  const tabRenderers = {
    "FLN Tracking": renderFLN,
    "Skill Competencies": renderSkills,
    "Behavioral Trends": renderBehavioral,
    "Parent Engagement": renderEngagement,
    "Sibling & Fee": renderSiblingFee
  };

  let currentTab = "FLN Tracking";

  async function switchTab(name) {
    if (name === currentTab) return;
    currentTab = name;
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === name) {
        btn.style.background = "var(--primary)";
        btn.style.color = "#fff";
      } else {
        btn.style.background = "transparent";
        btn.style.color = "var(--text-2)";
      }
    });
    content.innerHTML = "";
    content.appendChild(loadingState("Loading analytics…"));
    const renderFn = tabRenderers[name];
    if (renderFn) {
      try {
        const node = await renderFn();
        content.innerHTML = "";
        content.appendChild(node);
      } catch (e) {
        content.innerHTML = "";
        content.appendChild(el("div", { class: "state", text: "Error loading tab: " + e.message }));
      }
    }
  }

  switchTab("FLN Tracking");
  return page;
}

function stat(label, value, icon, tone = "") {
  return el("div", { class: "stat" }, [
    el("div", { class: "stat-top" }, [
      el("div", { class: "stat-label", text: label }),
      el("div", { class: `stat-icon ${tone}`, html: icon })
    ]),
    el("div", { class: "stat-value", text: String(value) })
  ]);
}
