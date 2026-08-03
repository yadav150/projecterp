// Student Attendance Tracking with Parent Notifications
import { el, ICON, fmtDate, todayISO } from "../utils.js";
import { toast, openModal, loadingState, confirmDialog, DataTable } from "../ui.js";
import { subscribeStudents, getStudent } from "../data.js";
import { markStudentAttendance, getStudentAttendance, deleteStudentAttendance, sendAttendanceAlert } from "../data_academic.js";

export function AttendanceView() {
  const page = el("div", { "data-testid": "attendance-view" });
  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "Student Attendance" }),
      el("p", { class: "page-subtitle", text: "Mark daily attendance and send alerts for absences." })
    ])
  ]));

  const mount = el("div");
  page.appendChild(mount);
  mount.appendChild(loadingState("Loading students…"));

  const dateFilter = el("input", { class: "input", type: "date", value: todayISO(), style: "max-width:180px;" });
  const statusFilter = el("select", { class: "select" }, [
    el("option", { value: "", text: "All" }),
    el("option", { value: "present", text: "Present" }),
    el("option", { value: "absent", text: "Absent" })
  ]);
  const filterBar = el("div", { style: "display:flex;gap:10px;margin-bottom:16px;align-items:center;" }, [
    el("label", { text: "Date:" }), dateFilter,
    el("label", { text: "Status:" }), statusFilter
  ]);

  let students = [];
  let attendanceData = {};
  let table = null;

  const unsub = subscribeStudents((list) => {
    students = list;
    render();
  });

  async function render() {
    const selectedDate = dateFilter.value || todayISO();
    const status = statusFilter.value;
    mount.innerHTML = "";
    mount.appendChild(filterBar);

    const rows = [];
    for (const s of students) {
      const att = await getStudentAttendance(s.id);
      const statusVal = att[selectedDate] || "Not Marked";
      rows.push({
        id: s.id,
        name: s.name,
        admissionNumber: s.admissionNumber,
        class: s.class,
        section: s.section,
        phone: s.phone || "—",
        status: statusVal,
        date: selectedDate,
        rawAtt: att
      });
    }

    const filtered = status ? rows.filter(r => r.status === status) : rows;

    table = DataTable({
      testId: "attendance-table",
      columns: [
        { key: "name", label: "Student", sortable: true, render: r => r.name || "—" },
        { key: "admissionNumber", label: "Admission #", sortable: true },
        { key: "class", label: "Class", render: r => `${r.class || "—"} ${r.section ? "· " + r.section : ""}` },
        {
          key: "status", label: "Status",
          render: r => {
            const color = r.status === "present" ? "green" : r.status === "absent" ? "red" : "slate";
            return `<span class="badge ${color}">${r.status}</span>`;
          }
        },
        {
          key: "_actions", label: "",
          render: r => el("div", { class: "row-actions" }, [
            el("button", { class: "icon-btn-sm", html: ICON.check, onclick: () => mark(r.id, r.date, "present", render) }),
            el("button", { class: "icon-btn-sm danger", html: ICON.close, onclick: () => mark(r.id, r.date, "absent", render) }),
            r.status !== "Not Marked" ? el("button", { class: "icon-btn-sm", html: ICON.bell, onclick: () => notifyAbsent(r), title: "Notify parent" }) : null,
            el("button", { class: "icon-btn-sm danger", html: ICON.trash, onclick: async () => {
              if (await confirmDialog({ title: "Delete attendance for this date?" })) {
                await deleteStudentAttendance(r.id, r.date);
                render();
                toast({ type: "success", title: "Attendance deleted" });
              }
            }})
          ])
        }
      ],
      rows: filtered,
      searchFields: ["name", "admissionNumber"],
      emptyTitle: "No students found",
      emptySub: "Add students first."
    });
    mount.appendChild(table.node);
  }

  dateFilter.addEventListener("change", render);
  statusFilter.addEventListener("change", render);

  page.addEventListener("view:unmount", () => unsub());
  return page;
}

async function mark(studentId, date, status, callback) {
  await markStudentAttendance(studentId, date, status);
  toast({ type: "success", title: `Marked ${status}` });
  callback();
}

async function notifyAbsent(r) {
  if (r.status !== "absent") {
    toast({ type: "info", title: "Student is not absent", message: "No notification sent." });
    return;
  }
  const student = await getStudent(r.id);
  const phone = student?.phone || r.phone || "Not available";
  const result = await sendAttendanceAlert(phone, r.name, r.date);
  toast({ type: "success", title: "Alert sent", message: result.message });
}
