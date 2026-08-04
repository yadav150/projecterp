// Admission Module — Multi-step workflow with Personal, Education, Upload, Payment, Final, Print
import { el, ICON, fmtDate, todayISO, CLASSES, SECTIONS, GENDERS, required } from "../utils.js";
import { DataTable, setCrumbs, openModal, toast, loadingState, confirmDialog } from "../ui.js";
import { subscribeStudents, createStudent } from "../data.js";
import {
  createAdmission, updateAdmission, getAdmission, subscribeAdmissions,
  deleteAdmission, completeAdmission, uploadAdmissionDocument,
  verifyDocument, checkDuplicate, addAuditLog
} from "../admission/admission-data.js";
import {
  validateAdmission, generateQRToken, getStatusLabel, getStatusBadge,
  getDocStatusLabel, getDocBadge
} from "../admission/admission-utils.js";
import { openAdmissionPrint as admissionPrint } from "../admission/admission-print.js";
import { ADMISSION_PATH, STATUSES, DOC_TYPES, FEE_TYPES } from "../admission/admission-config.js";

let allAdmissions = [];
let unsub = null;

export function AdmissionView() {
  setCrumbs([{ label: "Admission" }]);
  const page = el("div", { "data-testid": "admission-view" });

  const tabBar = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;" });
  const tabs = {
    dashboard: tabBtn("Dashboard", true),
    list: tabBtn("Applications", false),
    new: tabBtn("New Application", false)
  };
  tabBar.appendChild(tabs.dashboard);
  tabBar.appendChild(tabs.list);
  tabBar.appendChild(tabs.new);
  page.appendChild(tabBar);

  const containers = {
    dashboard: el("div"),
    list: el("div", { style: "display:none;" }),
    new: el("div", { style: "display:none;" })
  };
  page.appendChild(containers.dashboard);
  page.appendChild(containers.list);
  page.appendChild(containers.new);

  function switchTab(name) {
    Object.keys(tabs).forEach(key => {
      const btn = tabs[key];
      if (key === name) {
        btn.className = "btn btn-primary";
        containers[key].style.display = "";
      } else {
        btn.className = "btn btn-outline";
        containers[key].style.display = "none";
      }
    });
    if (name === 'dashboard') renderDashboard(containers.dashboard);
    else if (name === 'list') renderList(containers.list);
    else if (name === 'new') renderNewForm(containers.new);
  }

  tabs.dashboard.onclick = () => switchTab('dashboard');
  tabs.list.onclick = () => switchTab('list');
  tabs.new.onclick = () => switchTab('new');

  unsub && unsub();
  unsub = subscribeAdmissions((list) => {
    allAdmissions = list || [];
    const activeTab = document.querySelector('.btn-primary');
    if (activeTab) {
      const tabName = Object.keys(tabs).find(k => tabs[k] === activeTab);
      if (tabName === 'dashboard') renderDashboard(containers.dashboard);
      else if (tabName === 'list') renderList(containers.list);
    }
  });

  page.addEventListener("view:unmount", () => { unsub && unsub(); unsub = null; });

  renderDashboard(containers.dashboard);
  return page;
}

// ---------- Dashboard ----------
function renderDashboard(container) {
  container.innerHTML = "";
  const stats = {
    total: allAdmissions.length,
    draft: allAdmissions.filter(a => a.status === STATUSES.DRAFT).length,
    submitted: allAdmissions.filter(a => a.status === STATUSES.SUBMITTED).length,
    docVer: allAdmissions.filter(a => a.status === STATUSES.DOC_VERIFICATION).length,
    feeVer: allAdmissions.filter(a => a.status === STATUSES.FEE_VERIFICATION).length,
    principal: allAdmissions.filter(a => a.status === STATUSES.PRINCIPAL_APPROVAL).length,
    completed: allAdmissions.filter(a => a.status === STATUSES.COMPLETED).length,
    rejected: allAdmissions.filter(a => a.status === STATUSES.REJECTED).length,
    today: allAdmissions.filter(a => {
      const d = a.createdAt ? new Date(a.createdAt).toISOString().slice(0,10) : '';
      return d === todayISO();
    }).length,
    month: allAdmissions.filter(a => {
      const d = a.createdAt ? new Date(a.createdAt).toISOString().slice(0,7) : '';
      return d === new Date().toISOString().slice(0,7);
    }).length
  };

  const grid = el("div", { class: "summary-grid" });
  const statItems = [
    { label: "Total Applications", value: stats.total, icon: ICON.inbox },
    { label: "Draft", value: stats.draft, icon: ICON.edit, tone: "slate" },
    { label: "Submitted", value: stats.submitted, icon: ICON.check, tone: "indigo" },
    { label: "Document Verification", value: stats.docVer, icon: ICON.view, tone: "amber" },
    { label: "Fee Verification", value: stats.feeVer, icon: ICON.money, tone: "amber" },
    { label: "Principal Approval", value: stats.principal, icon: ICON.users, tone: "amber" },
    { label: "Completed", value: stats.completed, icon: ICON.check, tone: "green" },
    { label: "Rejected", value: stats.rejected, icon: ICON.warn, tone: "red" },
    { label: "Today's Admissions", value: stats.today, icon: ICON.clock, tone: "sky" },
    { label: "This Month", value: stats.month, icon: ICON.trend, tone: "sky" }
  ];
  statItems.forEach(s => {
    const stat = el("div", { class: "stat" });
    stat.appendChild(el("div", { class: "stat-top" }, [
      el("div", { class: "stat-label", text: s.label }),
      el("div", { class: `stat-icon ${s.tone || ''}`, html: s.icon })
    ]));
    stat.appendChild(el("div", { class: "stat-value", text: String(s.value) }));
    grid.appendChild(stat);
  });
  container.appendChild(grid);
}

// ---------- List View ----------
function renderList(container) {
  container.innerHTML = "";
  const filterBar = el("div", { class: "filter-bar" });
  const search = el("input", { class: "input", placeholder: "Search by name, admission #, phone...", style: "flex:1;" });
  const statusFilter = el("select", { class: "select" }, [
    el("option", { value: "", text: "All Statuses" }),
    ...Object.values(STATUSES).map(s => el("option", { value: s, text: getStatusLabel(s) }))
  ]);
  filterBar.appendChild(search);
  filterBar.appendChild(statusFilter);
  container.appendChild(filterBar);

  const tableContainer = el("div");
  container.appendChild(tableContainer);

  function renderTable() {
    const q = search.value.toLowerCase();
    const status = statusFilter.value;
    let filtered = allAdmissions.filter(a => {
      if (status && a.status !== status) return false;
      if (q) {
        const match = a.studentName?.toLowerCase().includes(q) ||
          a.admissionNumber?.includes(q) ||
          a.fatherName?.toLowerCase().includes(q) ||
          a.phone?.includes(q);
        return match;
      }
      return true;
    });

    const columns = [
      { key: 'admissionNumber', label: 'Admission #', sortable: true },
      { key: 'studentName', label: 'Student', sortable: true, render: r => el("div", {}, [
        el("div", { style: "font-weight:600;", text: r.studentName || '—' }),
        el("div", { style: "font-size:12px;color:var(--muted);", text: r.class ? `${r.class} ${r.section || ''}` : '' })
      ]) },
      { key: 'fatherName', label: 'Father', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', render: r => `<span class="badge ${getStatusBadge(r.status)}">${getStatusLabel(r.status)}</span>` },
      { key: 'createdAt', label: 'Applied', sortable: true, render: r => fmtDate(r.createdAt) },
      { key: '_actions', label: '', render: r => rowActions([
        { icon: ICON.view, label: 'View', onClick: () => openAdmissionDetail(r.id) },
        { icon: ICON.edit, label: 'Edit', onClick: () => openAdmissionWorkflow(r.id) },
        { icon: ICON.print, label: 'Print', onClick: () => openAdmissionPrint(r.id) },
        { icon: ICON.trash, danger: true, label: 'Delete', onClick: async () => {
          if (await confirmDialog({ title: 'Delete admission?', message: 'This action cannot be undone.' })) {
            await deleteAdmission(r.id);
            toast({ type: 'success', title: 'Deleted' });
          }
        }}
      ]) }
    ];
    const table = DataTable({
      testId: 'admission-list',
      columns,
      rows: filtered,
      searchFields: ['studentName', 'admissionNumber', 'fatherName', 'phone'],
      emptyTitle: 'No applications found',
      emptySub: 'Create a new admission application.'
    });
    tableContainer.innerHTML = "";
    tableContainer.appendChild(table.node);
  }

  search.oninput = renderTable;
  statusFilter.onchange = renderTable;
  renderTable();
}

function rowActions(items) {
  const wrap = el("div", { class: "row-actions" });
  items.forEach(it => {
    const b = el("button", { class: `icon-btn-sm ${it.danger ? "danger" : ""}`, title: it.label, html: it.icon });
    b.onclick = it.onClick;
    wrap.appendChild(b);
  });
  return wrap;
}

// ---------- New Application – 6 Steps ----------
function renderNewForm(container) {
  container.innerHTML = "";
  const steps = [
    { id: 'personal', label: 'Personal' },
    { id: 'education', label: 'Education' },
    { id: 'upload', label: 'Upload' },
    { id: 'payment', label: 'Payment' },
    { id: 'final', label: 'Final' },
    { id: 'print', label: 'Print' }
  ];
  let currentStep = 0;
  let formData = {};
  let admissionId = null;

  const stepContainer = el("div");
  container.appendChild(stepContainer);

  function renderStep(idx) {
    stepContainer.innerHTML = "";
    const progress = el("div", { style: "display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;" });
    steps.forEach((s, i) => {
      const dot = el("div", {
        style: `padding:4px 12px;border-radius:20px;font-size:12px;background:${i <= idx ? 'var(--primary)' : 'var(--border)'};color:${i <= idx ? '#fff' : 'var(--muted)'};`
      }, [el("span", { text: s.label })]);
      progress.appendChild(dot);
    });
    stepContainer.appendChild(progress);

    const content = el("div");
    stepContainer.appendChild(content);

    if (idx === 0) renderPersonalStep(content);
    else if (idx === 1) renderEducationStep(content);
    else if (idx === 2) renderUploadStep(content);
    else if (idx === 3) renderPaymentStep(content);
    else if (idx === 4) renderFinalStep(content);
    else if (idx === 5) renderPrintStep(content);

    if (idx < steps.length - 1) {
      const nav = el("div", { style: "display:flex;justify-content:space-between;margin-top:16px;" });
      if (idx > 0) {
        const prevBtn = el("button", { class: "btn btn-outline", text: "Previous" });
        prevBtn.onclick = () => { currentStep--; renderStep(currentStep); };
        nav.appendChild(prevBtn);
      }
      const nextBtn = el("button", { class: "btn btn-primary", text: idx === steps.length-2 ? "Submit" : "Next" });
      nextBtn.onclick = () => {
        if (idx === steps.length-2) submitAdmission();
        else { currentStep++; renderStep(currentStep); }
      };
      nav.appendChild(nextBtn);
      stepContainer.appendChild(nav);
    } else {
      const nav = el("div", { style: "display:flex;justify-content:flex-end;margin-top:16px;" });
      const closeBtn = el("button", { class: "btn btn-ghost", text: "Close" });
      closeBtn.onclick = () => { switchTab('list'); };
      nav.appendChild(closeBtn);
      stepContainer.appendChild(nav);
    }
  }

  function renderPersonalStep(container) {
    const fields = [
      { key: 'studentName', label: 'Student Name', required: true },
      { key: 'gender', label: 'Gender', type: 'select', options: GENDERS },
      { key: 'dob', label: 'Date of Birth', type: 'date' },
      { key: 'aadhaar', label: 'Aadhaar Number' },
      { key: 'bloodGroup', label: 'Blood Group' },
      { key: 'category', label: 'Category' }
    ];
    const form = buildForm(fields, formData);
    container.appendChild(form);
    form.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', () => {
        const data = collectFormData(form);
        Object.assign(formData, data);
        autoSave();
      });
    });
  }

  function renderEducationStep(container) {
    const fields = [
      { key: 'class', label: 'Class', type: 'select', options: CLASSES, required: true },
      { key: 'section', label: 'Section', type: 'select', options: SECTIONS },
      { key: 'rollNumber', label: 'Roll Number' },
      { key: 'admissionDate', label: 'Admission Date', type: 'date' },
      { key: 'previousSchool', label: 'Previous School' }
    ];
    const form = buildForm(fields, formData);
    container.appendChild(form);
    form.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', () => {
        const data = collectFormData(form);
        Object.assign(formData, data);
        autoSave();
      });
    });
  }

  function renderUploadStep(container) {
    container.innerHTML = "";
    const uploadArea = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:12px;" });
    DOC_TYPES.forEach(doc => {
      const card = el("div", { class: "card", style: "padding:12px;" });
      const label = el("div", { style: "font-weight:600;", text: doc.label + (doc.required ? ' *' : '') });
      const fileInput = el("input", { type: "file", accept: "image/*,.pdf,.doc,.docx", "data-doc-key": doc.key });
      const statusDisplay = el("div", { style: "font-size:12px;color:var(--muted);margin-top:4px;", text: "No file uploaded" });
      const existing = (formData.documents || []).find(d => d.key === doc.key);
      if (existing) {
        statusDisplay.textContent = `Uploaded: ${existing.name} (${existing.status})`;
      }
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5*1024*1024) { toast({type:'error', title:'File too large', message:'Max 5MB'}); return; }
        if (!admissionId) {
          const temp = await createAdmission(formData);
          admissionId = temp.id;
          formData = temp;
        }
        try {
          const docEntry = await uploadAdmissionDocument(admissionId, doc.key, file);
          statusDisplay.textContent = `Uploaded: ${file.name} (${docEntry.status})`;
          const updated = await getAdmission(admissionId);
          Object.assign(formData, updated);
          toast({type:'success', title:'Uploaded'});
        } catch(err) {
          toast({type:'error', title:'Upload failed', message: err.message});
        }
      };
      card.appendChild(label);
      card.appendChild(fileInput);
      card.appendChild(statusDisplay);
      uploadArea.appendChild(card);
    });
    container.appendChild(uploadArea);
    const contactFields = [
      { key: 'fatherName', label: "Father's Name", required: true },
      { key: 'motherName', label: "Mother's Name" },
      { key: 'guardian', label: 'Guardian (if any)' },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'emergencyContact', label: 'Emergency Contact' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' }
    ];
    const contactForm = buildForm(contactFields, formData);
    container.appendChild(el("div", { style: "margin-top:16px;font-weight:600;", text: "Contact Details" }));
    container.appendChild(contactForm);
    contactForm.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', () => {
        const data = collectFormData(contactForm);
        Object.assign(formData, data);
        autoSave();
      });
    });
  }

  function renderPaymentStep(container) {
    container.innerHTML = "";
    const grid = el("div", { class: "form-grid" });
    FEE_TYPES.forEach(ft => {
      const row = el("div", { class: "form-row" });
      row.appendChild(el("label", { html: ft.label }));
      const inp = el("input", { type: "number", class: "input", placeholder: "0.00", "data-key": `fee_${ft.key}` });
      inp.value = formData[`fee_${ft.key}`] || '';
      inp.addEventListener('change', () => {
        formData[`fee_${ft.key}`] = inp.value;
        autoSave();
      });
      row.appendChild(inp);
      grid.appendChild(row);
    });
    container.appendChild(grid);
  }

  function renderFinalStep(container) {
    container.innerHTML = "";
    const summary = el("div", { class: "card", style: "padding:16px;" });
    const fields = ['studentName', 'gender', 'dob', 'class', 'section', 'fatherName', 'phone', 'address'];
    const labels = {
      studentName: 'Student Name', gender: 'Gender', dob: 'Date of Birth',
      class: 'Class', section: 'Section', fatherName: "Father's Name",
      phone: 'Phone', address: 'Address'
    };
    fields.forEach(key => {
      const val = formData[key] || '—';
      summary.appendChild(el("div", { style: "display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);" }, [
        el("span", { style: "font-weight:600;", text: labels[key] || key }),
        el("span", { text: val })
      ]));
    });
    container.appendChild(summary);
    const errors = validateAdmission(formData, formData.documents || []);
    if (errors.length) {
      const errDiv = el("div", { class: "card", style: "padding:12px;margin-top:12px;border-color:var(--danger);" });
      errDiv.appendChild(el("div", { style: "font-weight:600;color:var(--danger);", text: "Validation errors:" }));
      errors.forEach(e => errDiv.appendChild(el("div", { style: "font-size:13px;color:var(--danger);", text: `• ${e}` })));
      container.appendChild(errDiv);
    } else {
      container.appendChild(el("div", { style: "padding:12px;text-align:center;color:var(--success);", text: "All fields are valid. Ready to submit." }));
    }
  }

  function renderPrintStep(container) {
    container.innerHTML = "";
    if (!admissionId) {
      container.appendChild(el("div", { class: "state", text: "No admission to print." }));
      return;
    }
    const printBtn = el("button", { class: "btn btn-primary", text: "Print Admission Form" });
    printBtn.onclick = () => admissionPrint(admissionId);
    container.appendChild(printBtn);
    container.appendChild(el("div", { style: "margin-top:16px;", text: `Admission #${formData.admissionNumber || '—'} successfully submitted.` }));
  }

  function buildForm(fields, data) {
    const form = el("div", { class: "form-grid" });
    fields.forEach(f => {
      const row = el("div", { class: "form-row" });
      row.appendChild(el("label", { html: f.label + (f.required ? ' <span class="req">*</span>' : '') }));
      let input;
      if (f.type === 'select') {
        input = el("select", { class: "select", "data-key": f.key });
        input.appendChild(el("option", { value: "", text: `Select ${f.label}` }));
        f.options.forEach(o => input.appendChild(el("option", { value: o, text: o })));
        if (data[f.key]) input.value = data[f.key];
      } else if (f.type === 'date') {
        input = el("input", { type: "date", class: "input", "data-key": f.key, value: data[f.key] || '' });
      } else {
        input = el("input", { type: "text", class: "input", "data-key": f.key, value: data[f.key] || '', placeholder: f.label });
      }
      row.appendChild(input);
      form.appendChild(row);
    });
    return form;
  }

  function collectFormData(form) {
    const data = {};
    form.querySelectorAll('input, select').forEach(el => {
      const key = el.dataset.key;
      if (key) data[key] = el.value;
    });
    return data;
  }

  async function autoSave() {
    if (!admissionId) {
      try {
        const created = await createAdmission(formData);
        admissionId = created.id;
        Object.assign(formData, created);
      } catch(e) { console.warn('Auto-save failed:', e); }
    } else {
      try {
        await updateAdmission(admissionId, formData);
      } catch(e) { console.warn('Auto-save failed:', e); }
    }
  }

  async function submitAdmission() {
    const errors = validateAdmission(formData, formData.documents || []);
    if (errors.length) {
      toast({ type: 'error', title: 'Validation failed', message: errors.join('; ') });
      return;
    }
    if (!admissionId) {
      toast({ type: 'error', title: 'No admission in progress' });
      return;
    }
    try {
      await updateAdmission(admissionId, { status: STATUSES.SUBMITTED });
      await addAuditLog(admissionId, 'Application submitted');
      toast({ type: 'success', title: 'Admission submitted successfully' });
      currentStep = steps.length - 1;
      const updated = await getAdmission(admissionId);
      Object.assign(formData, updated);
      renderStep(currentStep);
    } catch(e) {
      toast({ type: 'error', title: 'Submission failed', message: e.message });
    }
  }

  renderStep(0);
}

// ---------- Detail View ----------
async function openAdmissionDetail(id) {
  const admission = await getAdmission(id);
  if (!admission) { toast({type:'error', title:'Not found'}); return; }
  const body = el("div", { style: "padding:12px;max-height:500px;overflow:auto;" });
  const details = [
    ['Admission #', admission.admissionNumber],
    ['Student', admission.studentName],
    ['Class', admission.class],
    ['Status', getStatusLabel(admission.status)],
    ['Father', admission.fatherName],
    ['Phone', admission.phone],
    ['Applied', fmtDate(admission.createdAt)]
  ];
  const grid = el("div", { class: "detail-grid" });
  details.forEach(([k,v]) => {
    grid.appendChild(el("div", { class: "detail-row" }, [
      el("div", { class: "k", text: k }),
      el("div", { class: "v", text: v || '—' })
    ]));
  });
  body.appendChild(grid);
  const docList = el("div", { style: "margin-top:12px;" });
  docList.appendChild(el("div", { style: "font-weight:600;margin-bottom:4px;", text: "Documents:" }));
  (admission.documents || []).forEach(d => {
    docList.appendChild(el("div", { style: "display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);" }, [
      el("span", { text: d.key }),
      el("span", { class: `badge ${getDocBadge(d.status)}`, text: getDocStatusLabel(d.status) })
    ]));
  });
  body.appendChild(docList);

  const actions = el("div", { style: "display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;" });
  if (admission.status === STATUSES.SUBMITTED) {
    const verifyBtn = el("button", { class: "btn btn-primary", text: "Start Verification" });
    verifyBtn.onclick = async () => {
      await updateAdmission(id, { status: STATUSES.DOC_VERIFICATION });
      toast({type:'success', title:'Moved to Document Verification'});
      openAdmissionDetail(id);
    };
    actions.appendChild(verifyBtn);
  }
  if (admission.status === STATUSES.DOC_VERIFICATION) {
    const docVer = el("div", { style: "margin:8px 0;" });
    (admission.documents || []).forEach(d => {
      const row = el("div", { style: "display:flex;gap:8px;align-items:center;margin:4px 0;" }, [
        el("span", { style: "flex:1;", text: d.key }),
        el("select", { class: "select", style: "width:auto;", "data-doc": d.key }, [
          el("option", { value: "pending", selected: d.status==='pending', text: "Pending" }),
          el("option", { value: "verified", selected: d.status==='verified', text: "Verified" }),
          el("option", { value: "rejected", selected: d.status==='rejected', text: "Rejected" }),
          el("option", { value: "missing", selected: d.status==='missing', text: "Missing" })
        ]),
        el("input", { type: "text", class: "input", placeholder: "Remarks", style: "flex:1;", value: d.remarks || '' })
      ]);
      docVer.appendChild(row);
    });
    const saveVer = el("button", { class: "btn btn-primary btn-sm", text: "Save Verification" });
    saveVer.onclick = async () => {
      const selects = docVer.querySelectorAll('select');
      const inputs = docVer.querySelectorAll('input');
      for (let i=0; i<selects.length; i++) {
        const key = selects[i].dataset.doc;
        const status = selects[i].value;
        const remarks = inputs[i].value;
        await verifyDocument(id, key, status, remarks);
      }
      toast({type:'success', title:'Verification saved'});
      openAdmissionDetail(id);
    };
    actions.appendChild(docVer);
    actions.appendChild(saveVer);
    const approveBtn = el("button", { class: "btn btn-success", text: "Move to Fee Verification" });
    approveBtn.onclick = async () => {
      await updateAdmission(id, { status: STATUSES.FEE_VERIFICATION });
      toast({type:'success', title:'Moved to Fee Verification'});
      openAdmissionDetail(id);
    };
    actions.appendChild(approveBtn);
  }
  if (admission.status === STATUSES.FEE_VERIFICATION) {
    const feeBtn = el("button", { class: "btn btn-primary", text: "Mark Fee Paid" });
    feeBtn.onclick = async () => {
      await updateAdmission(id, { status: STATUSES.PRINCIPAL_APPROVAL, feeDetails: { admission_fee: 5000 } });
      toast({type:'success', title:'Fee verified'});
      openAdmissionDetail(id);
    };
    actions.appendChild(feeBtn);
  }
  if (admission.status === STATUSES.PRINCIPAL_APPROVAL) {
    const approveBtn = el("button", { class: "btn btn-success", text: "Approve & Complete" });
    approveBtn.onclick = async () => {
      try {
        const student = await completeAdmission(id);
        toast({type:'success', title:'Admission completed', message: `Student created: ${student.admissionNumber}`});
        openAdmissionDetail(id);
      } catch(e) {
        toast({type:'error', title:'Failed', message:e.message});
      }
    };
    actions.appendChild(approveBtn);
    const rejectBtn = el("button", { class: "btn btn-danger", text: "Reject" });
    rejectBtn.onclick = async () => {
      await updateAdmission(id, { status: STATUSES.REJECTED });
      toast({type:'success', title:'Rejected'});
      openAdmissionDetail(id);
    };
    actions.appendChild(rejectBtn);
  }
  if (admission.status === STATUSES.COMPLETED) {
    const printBtn = el("button", { class: "btn btn-outline", text: "Print Form" });
    printBtn.onclick = () => admissionPrint(id);
    actions.appendChild(printBtn);
    const studentBtn = el("button", { class: "btn btn-primary", text: "View Student Profile" });
    studentBtn.onclick = () => { location.hash = `#/students/${admission.studentId}`; };
    actions.appendChild(studentBtn);
  }

  body.appendChild(actions);
  openModal({ title: `Admission #${admission.admissionNumber}`, body, size: 'large' });
}

async function openAdmissionPrint(id) {
  const admission = await getAdmission(id);
  if (!admission) return;
  const token = generateQRToken(id);
  const qrContainer = el('div');
  new QRCode(qrContainer, {
    text: `${window.location.origin}/#/admission/verify?token=${token}`,
    width: 120,
    height: 120
  });
  const qrImage = qrContainer.querySelector('img')?.src || '';
  admissionPrint(admission, qrImage);
}

function tabBtn(label, active) {
  return el("button", { class: `btn ${active ? "btn-primary" : "btn-outline"}`, text: label });
}
