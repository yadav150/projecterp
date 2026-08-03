// Timetable Management with Conflict Detection
import { el, ICON } from "../utils.js";
import { toast, openModal, confirmDialog, loadingState } from "../ui.js";
import { subscribeTeachers, subscribeStudents } from "../data.js";
import { setTimetable, getTimetable, deleteTimetable, getAllTimetables } from "../data_academic.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function TimetableView() {
  const page = el("div", { "data-testid": "timetable-view" });
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Timetable Management" }),
      el("p", { class: "page-subtitle", text: "Create and manage class schedules with conflict detection." })
    ])
  ]));

  const mount = el("div");
  page.appendChild(mount);
  mount.appendChild(loadingState("Loading classes…"));

  // Class selector
  const classSelect = el("select", { class: "select", style: "max-width:200px;margin-bottom:16px;" });
  const classList = ["Nursery", "LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  classList.forEach(c => classSelect.appendChild(el("option", { value: c, text: c })));
  classSelect.value = "V";

  const loadBtn = el("button", { class: "btn btn-primary", text: "Load Timetable", onclick: loadTimetable });

  const controls = el("div", { style: "display:flex;gap:10px;align-items:center;margin-bottom:16px;" }, [
    el("label", { text: "Class:" }), classSelect, loadBtn,
    el("button", { class: "btn btn-outline", onclick: () => openAddPeriod(classSelect.value, loadTimetable), html: `${ICON.plus}<span>Add Period</span>` })
  ]);
  mount.appendChild(controls);

  const tableContainer = el("div");
  mount.appendChild(tableContainer);

  async function loadTimetable() {
    const cls = classSelect.value;
    tableContainer.innerHTML = "";
    tableContainer.appendChild(loadingState("Loading timetable…"));

    const data = await getTimetable(cls);
    tableContainer.innerHTML = "";

    const table = el("table", { class: "data-table" });
    const thead = el("thead");
    const headerRow = el("tr");
    headerRow.appendChild(el("th", { text: "Period" }));
    DAYS.forEach(d => headerRow.appendChild(el("th", { text: d })));
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = el("tbody");
    PERIODS.forEach(p => {
      const tr = el("tr");
      tr.appendChild(el("td", { style: "font-weight:600;", text: `Period ${p}` }));
      DAYS.forEach(day => {
        const cell = data[day]?.[p];
        const td = el("td");
        if (cell) {
          td.appendChild(el("div", {}, [
            el("div", { style: "font-weight:500;", text: cell.subject || "—" }),
            el("div", { style: "font-size:11px;color:var(--muted);", text: cell.teacher || "" }),
            el("button", { class: "icon-btn-sm", style: "margin-top:4px;", html: ICON.trash, onclick: async () => {
              if (await confirmDialog({ title: "Remove this period?" })) {
                await deleteTimetable(cls, day, p);
                loadTimetable();
                toast({ type: "success", title: "Period removed" });
              }
            }})
          ]));
        } else {
          td.appendChild(el("span", { style: "color:var(--muted-2);font-size:12px;", text: "—" }));
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }

  loadTimetable();
  page.addEventListener("view:unmount", () => {});
  return page;
}

function openAddPeriod(cls, callback) {
  const body = el("div");
  const grid = el("div", { class: "form-grid" });

  const day = el("select", { class: "select" });
  DAYS.forEach(d => day.appendChild(el("option", { value: d, text: d })));

  const period = el("select", { class: "select" });
  PERIODS.forEach(p => period.appendChild(el("option", { value: p, text: `Period ${p}` })));

  const subject = el("input", { class: "input", placeholder: "Subject" });
  const teacher = el("input", { class: "input", placeholder: "Teacher Name" });

  grid.appendChild(field("Day *", day));
  grid.appendChild(field("Period *", period));
  grid.appendChild(field("Subject *", subject));
  grid.appendChild(field("Teacher", teacher));
  body.appendChild(grid);

  // Conflict detection
  const conflictMsg = el("div", { style: "margin-top:8px;font-size:13px;color:var(--danger);display:none;" });
  body.appendChild(conflictMsg);

  const save = el("button", { class: "btn btn-primary", text: "Add Period" });
  const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
  const m = openModal({ title: "Add Timetable Period", body, footer: [cancel, save] });
  cancel.onclick = () => m.close();
  save.onclick = async () => {
    if (!subject.value.trim()) { toast({ type: "error", title: "Subject is required" }); return; }
    // Check conflict
    const existing = await getTimetable(cls);
    const dayVal = day.value;
    const periodVal = Number(period.value);
    const existingPeriod = existing[dayVal]?.[periodVal];
    if (existingPeriod) {
      conflictMsg.style.display = "block";
      conflictMsg.textContent = `Conflict: Period ${periodVal} on ${dayVal} already has ${existingPeriod.subject} (${existingPeriod.teacher || "No teacher"})`;
      return;
    }
    // Check teacher conflict
    if (teacher.value.trim()) {
      const all = await getAllTimetables();
      for (const [classId, days] of Object.entries(all)) {
        for (const [d, periods] of Object.entries(days)) {
          for (const [p, val] of Object.entries(periods)) {
            if (val.teacher === teacher.value.trim() && d === dayVal && Number(p) === periodVal) {
              conflictMsg.style.display = "block";
              conflictMsg.textContent = `Conflict: Teacher ${teacher.value.trim()} already has a period in ${classId} on ${dayVal} period ${periodVal}`;
              return;
            }
          }
        }
      }
    }

    save.disabled = true; save.textContent = "Saving…";
    await setTimetable(cls, dayVal, periodVal, { subject: subject.value.trim(), teacher: teacher.value.trim() });
    toast({ type: "success", title: "Period added" });
    m.close();
    callback();
  };
}

function field(label, node) {
  return el("div", { class: "form-row" }, [el("label", { text: label }), node]);
}
