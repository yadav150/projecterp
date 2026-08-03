import { el, ICON } from "../utils.js";
import { toast, loadingState, confirmDialog } from "../ui.js";
import { addTeacherSubject, removeTeacherSubject, getTeacher } from "../data.js";

export function renderTeacherSubjects(teacherId) {
  const wrap = el("div", { class: "card" });
  wrap.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Subjects Assigned" }),
    el("div", { class: "card-subtitle", text: "Add or remove subjects for this teacher" })
  ]));
  const body = el("div", { class: "card-body" });

  const input = el("input", { class: "input", placeholder: "Enter subject name", style: "flex:1;" });
  const addBtn = el("button", { class: "btn btn-primary", html: `${ICON.plus}<span>Add</span>` });

  const addRow = el("div", { style: "display:flex;gap:10px;margin-bottom:16px;" }, [input, addBtn]);
  body.appendChild(addRow);

  const listContainer = el("div");
  body.appendChild(listContainer);

  async function loadSubjects() {
    listContainer.innerHTML = loadingState("Loading subjects…");
    const teacher = await getTeacher(teacherId);
    listContainer.innerHTML = "";
    const subjects = teacher?.subjects || [];
    if (!subjects.length) {
      listContainer.appendChild(el("div", { class: "state", text: "No subjects assigned yet." }));
      return;
    }
    const list = el("div", { style: "display:flex;flex-wrap:wrap;gap:8px;" });
    subjects.forEach(s => {
      const chip = el("span", { class: "badge indigo", style: "padding:6px 12px;display:inline-flex;align-items:center;gap:6px;" }, [
        document.createTextNode(s),
        el("button", { class: "icon-btn-sm", style: "border:none;background:transparent;color:var(--danger);padding:0;", html: ICON.close, onclick: async () => {
          if (await confirmDialog({ title: `Remove subject "${s}"?` })) {
            await removeTeacherSubject(teacherId, s);
            loadSubjects();
            toast({ type: "success", title: "Subject removed" });
          }
        }})
      ]);
      list.appendChild(chip);
    });
    listContainer.appendChild(list);
  }

  addBtn.onclick = async () => {
    const subject = input.value.trim();
    if (!subject) { toast({ type: "error", title: "Enter a subject" }); return; }
    addBtn.disabled = true; addBtn.textContent = "Adding…";
    try {
      await addTeacherSubject(teacherId, subject);
      input.value = "";
      loadSubjects();
      toast({ type: "success", title: "Subject added" });
    } catch (e) {
      toast({ type: "error", title: "Failed", message: e.message });
    } finally {
      addBtn.disabled = false; addBtn.innerHTML = `${ICON.plus}<span>Add</span>`;
    }
  };

  loadSubjects();
  wrap.appendChild(body);
  return wrap;
}
