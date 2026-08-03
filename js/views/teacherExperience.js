import { el, ICON, fmtDate } from "../utils.js";
import { toast, loadingState, confirmDialog, openModal } from "../ui.js";
import { addTeacherExperience, updateTeacherExperience, removeTeacherExperience, getTeacher } from "../data.js";

export function renderTeacherExperience(teacherId) {
  const wrap = el("div", { class: "card" });
  wrap.appendChild(el("div", { class: "card-header" }, [
    el("div", { class: "card-title", text: "Experience Records" }),
    el("div", { class: "card-subtitle", text: "Manage work history" })
  ]));
  const body = el("div", { class: "card-body" });

  const addBtn = el("button", { class: "btn btn-primary", html: `${ICON.plus}<span>Add Experience</span>`, onclick: () => openExperienceForm(teacherId, null, loadExperience) });
  body.appendChild(el("div", { style: "display:flex;justify-content:flex-end;margin-bottom:12px;" }, [addBtn]));

  const listContainer = el("div");
  body.appendChild(listContainer);

  async function loadExperience() {
    listContainer.innerHTML = loadingState("Loading experience…");
    const teacher = await getTeacher(teacherId);
    listContainer.innerHTML = "";
    const expList = teacher?.experience || [];
    if (!expList.length) {
      listContainer.appendChild(el("div", { class: "state", text: "No experience records yet." }));
      return;
    }
    const table = el("table", { class: "data-table" });
    table.innerHTML = `
      <thead><tr>
        <th>Company</th>
        <th>Role</th>
        <th>Start</th>
        <th>End</th>
        <th>Actions</th>
      </tr></thead>
    `;
    const tbody = el("tbody");
    expList.forEach(exp => {
      const tr = el("tr", {}, [
        el("td", { text: exp.company || "—" }),
        el("td", { text: exp.role || "—" }),
        el("td", { text: exp.startDate ? fmtDate(exp.startDate) : "—" }),
        el("td", { text: exp.endDate ? fmtDate(exp.endDate) : "Present" }),
        el("td", {}, [
          el("button", { class: "icon-btn-sm", html: ICON.edit, onclick: () => openExperienceForm(teacherId, exp, loadExperience) }),
          el("button", { class: "icon-btn-sm danger", html: ICON.trash, onclick: async () => {
            if (await confirmDialog({ title: "Delete this experience record?" })) {
              await removeTeacherExperience(teacherId, exp.id);
              loadExperience();
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

  function openExperienceForm(teacherId, exp, callback) {
    const isEdit = !!exp;
    const fields = [
      { key: "company", label: "Company", required: true, value: exp?.company || "" },
      { key: "role", label: "Role", required: true, value: exp?.role || "" },
      { key: "startDate", label: "Start Date", type: "date", value: exp?.startDate || "" },
      { key: "endDate", label: "End Date (leave blank if present)", type: "date", value: exp?.endDate || "" },
      { key: "description", label: "Description", type: "textarea", value: exp?.description || "" }
    ];
    const body = el("div");
    const grid = el("div", { class: "form-grid" });
    const inputs = {};
    fields.forEach(f => {
      const row = el("div", { class: "form-row" });
      row.appendChild(el("label", { html: `${f.label} ${f.required ? '<span class="req">*</span>' : ""}` }));
      let inp;
      if (f.type === "textarea") {
        inp = el("textarea", { class: "textarea", rows: 2 });
        inp.value = f.value;
      } else if (f.type === "date") {
        inp = el("input", { class: "input", type: "date" });
        inp.value = f.value;
      } else {
        inp = el("input", { class: "input", type: "text" });
        inp.value = f.value;
      }
      row.appendChild(inp);
      grid.appendChild(row);
      inputs[f.key] = inp;
    });
    body.appendChild(grid);

    const save = el("button", { class: "btn btn-primary", text: isEdit ? "Update" : "Add" });
    const cancel = el("button", { class: "btn btn-outline", text: "Cancel" });
    const m = openModal({ title: isEdit ? "Edit Experience" : "Add Experience", body, footer: [cancel, save] });
    cancel.onclick = () => m.close();
    save.onclick = async () => {
      const data = {};
      for (const [k, inp] of Object.entries(inputs)) {
        data[k] = inp.value?.trim?.() || inp.value;
      }
      if (!data.company || !data.role) {
        toast({ type: "error", title: "Company and Role are required" });
        return;
      }
      save.disabled = true; save.textContent = "Saving…";
      try {
        if (isEdit) {
          await updateTeacherExperience(teacherId, exp.id, data);
        } else {
          await addTeacherExperience(teacherId, data);
        }
        toast({ type: "success", title: isEdit ? "Updated" : "Added" });
        m.close();
        callback();
      } catch (e) {
        toast({ type: "error", title: "Failed", message: e.message });
        save.disabled = false; save.textContent = isEdit ? "Update" : "Add";
      }
    };
  }

  loadExperience();
  wrap.appendChild(body);
  return wrap;
}
