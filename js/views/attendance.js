import { el, ICON, fmtDate, todayISO } from "../utils.js";
import { toast, loadingState, confirmDialog } from "../ui.js";
import { updateTeacherAttendance, getTeacherAttendance, deleteTeacherAttendance } from "../data.js";

export function renderTeacherAttendance(teacherId) {
  const wrap = el("div", { class: "card" });
  wrap.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Attendance" }),
    el("div", { class: "card-subtitle", text: "Mark daily attendance" })
  ]));
  const body = el("div", { class: "card-body" });

  const today = todayISO();
  const dateInput = el("input", { class: "input", type: "date", value: today, style: "max-width:180px;" });
  const statusSelect = el("select", { class: "select", style: "max-width:120px;" }, [
    el("option", { value: "present", text: "Present" }),
    el("option", { value: "absent", text: "Absent" })
  ]);
  const markBtn = el("button", { class: "btn btn-primary", text: "Mark" });

  const actionRow = el("div", { style: "display:flex;gap:10px;align-items:center;margin-bottom:16px;" }, [
    dateInput, statusSelect, markBtn
  ]);
  body.appendChild(actionRow);

  const listContainer = el("div");
  body.appendChild(listContainer);

  async function loadAttendance() {
    listContainer.innerHTML = "";
    listContainer.appendChild(loadingState("Loading attendance…"));
    const data = await getTeacherAttendance(teacherId);
    listContainer.innerHTML = "";
    if (!data || Object.keys(data).length === 0) {
      listContainer.appendChild(el("div", { class: "state", text: "No attendance records yet." }));
      return;
    }
    const dates = Object.keys(data).sort().reverse();
    const table = el("table", { class: "data-table" });
    const thead = el("thead", {}, [
      el("tr", {}, [
        el("th", { text: "Date" }),
        el("th", { text: "Status" }),
        el("th", { text: "Action" })
      ])
    ]);
    table.appendChild(thead);
    const tbody = el("tbody");
    dates.forEach(d => {
      const status = data[d];
      const tr = el("tr", {}, [
        el("td", { text: fmtDate(d) }),
        el("td", {}, [el("span", { class: `badge ${status === "present" ? "green" : "red"}`, text: status })]),
        el("td", {}, [
          el("button", { class: "icon-btn-sm", html: ICON.trash, onclick: async () => {
            if (await confirmDialog({ title: "Delete this attendance record?" })) {
              await deleteTeacherAttendance(teacherId, d);
              loadAttendance();
              toast({ type: "success", title: "Record deleted" });
            }
          }})
        ])
      ]);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    listContainer.appendChild(table);
  }

  markBtn.onclick = async () => {
    const date = dateInput.value;
    if (!date) { toast({ type: "error", title: "Select a date" }); return; }
    const status = statusSelect.value;
    markBtn.disabled = true; markBtn.textContent = "Saving…";
    try {
      await updateTeacherAttendance(teacherId, date, status);
      toast({ type: "success", title: "Attendance marked" });
      loadAttendance();
    } catch (e) {
      toast({ type: "error", title: "Failed", message: e.message });
    } finally {
      markBtn.disabled = false; markBtn.textContent = "Mark";
    }
  };

  loadAttendance();
  wrap.appendChild(body);
  return wrap;
}
