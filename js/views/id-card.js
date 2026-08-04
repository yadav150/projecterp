// ID Card & Certificate Generator
import { el, ICON, fmtDate, initials, SCHOOL } from "../utils.js";
import { setCrumbs, toast, loadingState, openModal } from "../ui.js";
import { subscribeStudents, subscribeTeachers, getStudent, getTeacher } from "../data.js";
import { printNode } from "../pdf.js";

let unsubStudents = null;
let unsubTeachers = null;

export function IDCardView() {
  setCrumbs([{ label: "ID Card & Certificate" }]);
  const page = el("div", { "data-testid": "id-card-view" });

  page.appendChild(el("div", { class: "page-header" }, [
    el("div", {}, [
      el("h1", { class: "page-title", text: "ID Card & Certificate Generator" }),
      el("p", { class: "page-subtitle", text: "Generate ID cards and certificates for students and teachers." })
    ])
  ]));

  // Tabs
  const tabs = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;" });
  const tabNames = ["ID Card", "Certificate"];
  const tabButtons = {};
  const containers = {};

  tabNames.forEach((name, index) => {
    const active = index === 0;
    const btn = el("button", {
      class: `btn ${active ? "btn-primary" : "btn-outline"}`,
      text: name,
      "data-tab": name.toLowerCase().replace(/\s/g, '-')
    });
    tabButtons[name] = btn;
    tabs.appendChild(btn);

    const container = el("div", {
      style: active ? "display:block;" : "display:none;",
      "data-container": name.toLowerCase().replace(/\s/g, '-')
    });
    containers[name] = container;
    page.appendChild(container);
  });
  page.appendChild(tabs);

  // Tab switching
  Object.keys(tabButtons).forEach(name => {
    tabButtons[name].onclick = () => {
      Object.keys(tabButtons).forEach(n => {
        tabButtons[n].className = `btn ${n === name ? "btn-primary" : "btn-outline"}`;
        containers[n].style.display = n === name ? "block" : "none";
      });
    };
  });

  // Load initial tab
  renderIDCardTab(containers["ID Card"]);
  renderCertificateTab(containers["Certificate"]);

  page.addEventListener("view:unmount", () => {
    if (unsubStudents) { unsubStudents(); unsubStudents = null; }
    if (unsubTeachers) { unsubTeachers(); unsubTeachers = null; }
  });

  return page;
}

// ---------- ID Card Tab ----------
function renderIDCardTab(container) {
  container.innerHTML = "";
  container.appendChild(el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Generate ID Card" })]),
    el("div", { class: "card-body" }, [
      el("p", { style: "font-size:13px;color:var(--muted);margin-bottom:12px;", text: "Select a student or teacher to generate an ID card." }),
      el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px;" }, [
        el("span", { style: "font-weight:500;", text: "Type:" }),
        el("select", { class: "select", "data-testid": "id-type", style: "min-width:120px;" }, [
          el("option", { value: "student", text: "Student" }),
          el("option", { value: "teacher", text: "Teacher" })
        ]),
        el("span", { style: "font-weight:500;", text: "Select:" }),
        el("select", { class: "select", "data-testid": "id-person", style: "min-width:200px;" }, [
          el("option", { value: "", text: "-- Select --" })
        ]),
        el("button", { class: "btn btn-primary", "data-testid": "generate-id-btn", text: "Generate ID Card", onclick: generateIDCard })
      ]),
      el("div", { id: "id-card-preview", style: "margin-top:12px;" })
    ])
  ]));

  const typeSelect = container.querySelector('[data-testid="id-type"]');
  const personSelect = container.querySelector('[data-testid="id-person"]');

  // Populate person select based on type
  function populatePersons() {
    const type = typeSelect.value;
    personSelect.innerHTML = "";
    personSelect.appendChild(el("option", { value: "", text: "-- Select --" }));

    if (type === "student") {
      if (unsubStudents) unsubStudents();
      unsubStudents = subscribeStudents((list) => {
        const currentValue = personSelect.value;
        personSelect.innerHTML = "";
        personSelect.appendChild(el("option", { value: "", text: "-- Select --" }));
        (list || []).forEach(s => {
          personSelect.appendChild(el("option", { value: s.id, text: `${s.name} (${s.admissionNumber || "No ID"})` }));
        });
        if (currentValue) personSelect.value = currentValue;
      });
    } else {
      if (unsubTeachers) unsubTeachers();
      unsubTeachers = subscribeTeachers((list) => {
        const currentValue = personSelect.value;
        personSelect.innerHTML = "";
        personSelect.appendChild(el("option", { value: "", text: "-- Select --" }));
        (list || []).forEach(t => {
          personSelect.appendChild(el("option", { value: t.id, text: `${t.name} (${t.teacherId || "No ID"})` }));
        });
        if (currentValue) personSelect.value = currentValue;
      });
    }
  }

  typeSelect.addEventListener("change", populatePersons);
  populatePersons();

  async function generateIDCard() {
    const type = typeSelect.value;
    const personId = personSelect.value;
    const previewDiv = container.querySelector("#id-card-preview");

    if (!personId) {
      toast({ type: "error", title: "Selection required", message: "Please select a person." });
      return;
    }

    previewDiv.innerHTML = "";
    previewDiv.appendChild(loadingState("Generating ID card..."));

    try {
      let person;
      if (type === "student") {
        person = await getStudent(personId);
      } else {
        person = await getTeacher(personId);
      }

      previewDiv.innerHTML = "";
      if (!person) {
        previewDiv.appendChild(el("div", { class: "state", text: "Person not found." }));
        return;
      }

      const card = renderIDCard(person, type);
      const printBtn = el("button", { class: "btn btn-outline", style: "margin-top:12px;", html: `${ICON.print}<span>Print</span>` });
      printBtn.onclick = () => printNode(card);
      previewDiv.appendChild(card);
      previewDiv.appendChild(printBtn);

    } catch (err) {
      previewDiv.innerHTML = "";
      previewDiv.appendChild(el("div", { class: "state", text: "Error: " + err.message }));
      toast({ type: "error", title: "Generation failed", message: err.message });
    }
  }
}

// Render ID Card HTML
function renderIDCard(person, type) {
  const isStudent = type === "student";
  const idLabel = isStudent ? "Admission #" : "Teacher ID";
  const idValue = isStudent ? person.admissionNumber : person.teacherId;
  const role = isStudent ? `Class ${person.class || "—"} · Section ${person.section || "—"}` : person.designation || "—";
  const dept = isStudent ? "" : person.department || "";

  const card = el("div", {
    class: "print-area",
    style: "width:350px;background:#fff;border:2px solid var(--primary);border-radius:12px;padding:20px;font-family:'Plus Jakarta Sans',sans-serif;margin:0 auto;box-shadow:var(--shadow);"
  });

  // Header
  card.appendChild(el("div", { style: "text-align:center;border-bottom:2px solid var(--primary);padding-bottom:12px;margin-bottom:12px;" }, [
    el("div", { style: "font-weight:800;font-size:16px;color:var(--primary);", text: SCHOOL.name }),
    el("div", { style: "font-size:10px;color:var(--muted);", text: SCHOOL.address })
  ]));

  // Photo and details
  const body = el("div", { style: "display:flex;gap:14px;align-items:center;" });

  // Photo
  const photo = el("div", { style: "width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid var(--primary);flex-shrink:0;background:var(--primary-soft);display:flex;align-items:center;justify-content:center;" });
  if (person.photoUrl) {
    photo.appendChild(el("img", { src: person.photoUrl, style: "width:100%;height:100%;object-fit:cover;" }));
  } else {
    photo.textContent = initials(person.name || "?");
    photo.style.fontSize = "28px";
    photo.style.fontWeight = "700";
    photo.style.color = "var(--primary)";
  }
  body.appendChild(photo);

  // Details
  const details = el("div", { style: "flex:1;" }, [
    el("div", { style: "font-weight:700;font-size:15px;", text: person.name || "—" }),
    el("div", { style: "font-size:11px;color:var(--muted);", text: `${idLabel} ${idValue || "—"}` }),
    el("div", { style: "font-size:12px;font-weight:500;color:var(--text-2);", text: role }),
    dept ? el("div", { style: "font-size:11px;color:var(--muted);", text: dept }) : null
  ]);
  body.appendChild(details);
  card.appendChild(body);

  // Footer
  card.appendChild(el("div", { style: "margin-top:12px;padding-top:10px;border-top:1px solid var(--border);text-align:center;font-size:9px;color:var(--muted);display:flex;justify-content:space-between;" }, [
    el("span", { text: `Valid until: ${new Date().getFullYear() + 1}` }),
    el("span", { text: SCHOOL.phone })
  ]));

  return card;
}

// ---------- Certificate Tab ----------
function renderCertificateTab(container) {
  container.innerHTML = "";
  container.appendChild(el("div", { class: "card" }, [
    el("div", { class: "card-header" }, [el("div", { class: "card-title", text: "Generate Certificate" })]),
    el("div", { class: "card-body" }, [
      el("p", { style: "font-size:13px;color:var(--muted);margin-bottom:12px;", text: "Generate certificates for students." }),
      el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px;" }, [
        el("span", { style: "font-weight:500;", text: "Certificate Type:" }),
        el("select", { class: "select", "data-testid": "cert-type", style: "min-width:150px;" }, [
          el("option", { value: "bonafide", text: "Bonafide Certificate" }),
          el("option", { value: "tc", text: "Transfer Certificate" }),
          el("option", { value: "achievement", text: "Achievement Certificate" })
        ]),
        el("span", { style: "font-weight:500;", text: "Student:" }),
        el("select", { class: "select", "data-testid": "cert-student", style: "min-width:200px;" }, [
          el("option", { value: "", text: "-- Select --" })
        ]),
        el("button", { class: "btn btn-primary", "data-testid": "generate-cert-btn", text: "Generate Certificate", onclick: generateCertificate })
      ]),
      el("div", { id: "cert-preview", style: "margin-top:12px;" })
    ])
  ]));

  const studentSelect = container.querySelector('[data-testid="cert-student"]');

  // Populate students
  if (unsubStudents) unsubStudents();
  unsubStudents = subscribeStudents((list) => {
    const currentValue = studentSelect.value;
    studentSelect.innerHTML = "";
    studentSelect.appendChild(el("option", { value: "", text: "-- Select --" }));
    (list || []).forEach(s => {
      studentSelect.appendChild(el("option", { value: s.id, text: `${s.name} (${s.admissionNumber || "No ID"})` }));
    });
    if (currentValue) studentSelect.value = currentValue;
  });

  async function generateCertificate() {
    const certType = container.querySelector('[data-testid="cert-type"]').value;
    const studentId = studentSelect.value;
    const previewDiv = container.querySelector("#cert-preview");

    if (!studentId) {
      toast({ type: "error", title: "Selection required", message: "Please select a student." });
      return;
    }

    previewDiv.innerHTML = "";
    previewDiv.appendChild(loadingState("Generating certificate..."));

    try {
      const student = await getStudent(studentId);
      previewDiv.innerHTML = "";
      if (!student) {
        previewDiv.appendChild(el("div", { class: "state", text: "Student not found." }));
        return;
      }

      const cert = renderCertificate(student, certType);
      const printBtn = el("button", { class: "btn btn-outline", style: "margin-top:12px;", html: `${ICON.print}<span>Print</span>` });
      printBtn.onclick = () => printNode(cert);
      previewDiv.appendChild(cert);
      previewDiv.appendChild(printBtn);

    } catch (err) {
      previewDiv.innerHTML = "";
      previewDiv.appendChild(el("div", { class: "state", text: "Error: " + err.message }));
      toast({ type: "error", title: "Generation failed", message: err.message });
    }
  }
}

// Render Certificate HTML
function renderCertificate(student, type) {
  const typeLabels = {
    bonafide: "Bonafide Certificate",
    tc: "Transfer Certificate",
    achievement: "Achievement Certificate"
  };

  const title = typeLabels[type] || "Certificate";

  const cert = el("div", {
    class: "print-area",
    style: "width:650px;background:#fff;border:3px solid var(--primary);border-radius:8px;padding:40px;font-family:'Plus Jakarta Sans',sans-serif;margin:0 auto;text-align:center;box-shadow:var(--shadow);"
  });

  // Decorative border
  cert.appendChild(el("div", {
    style: "border:1px dashed var(--primary);padding:30px;border-radius:4px;"
  }, [

    // School name
    el("div", { style: "font-size:22px;font-weight:800;color:var(--primary);letter-spacing:1px;", text: SCHOOL.name }),

    // Address
    el("div", { style: "font-size:11px;color:var(--muted);margin-bottom:16px;", text: SCHOOL.address }),

    // Certificate title
    el("div", { style: "font-size:24px;font-weight:700;color:var(--text);margin:16px 0;text-transform:uppercase;letter-spacing:2px;", text: title }),

    // Decorative line
    el("div", { style: "width:100px;height:2px;background:var(--primary);margin:0 auto 16px;" }),

    // Body text
    el("div", { style: "font-size:14px;color:var(--text-2);line-height:1.8;text-align:left;padding:0 20px;" }, [
      type === "bonafide" ? [
        el("p", { text: `This is to certify that ${student.name || "__________"} is a bonafide student of this institution.` }),
        el("p", { text: `He/She is studying in Class ${student.class || "—"} · Section ${student.section || "—"} and bears Admission Number ${student.admissionNumber || "—"}.` })
      ] : type === "tc" ? [
        el("p", { text: `This is to certify that ${student.name || "__________"} was a student of this institution.` }),
        el("p", { text: `He/She studied in Class ${student.class || "—"} · Section ${student.section || "—"} and bears Admission Number ${student.admissionNumber || "—"}.` }),
        el("p", { text: `His/Her conduct and character during the period of study was satisfactory.` })
      ] : [
        el("p", { text: `This is to certify that ${student.name || "__________"} has shown outstanding performance.` }),
        el("p", { text: `He/She is studying in Class ${student.class || "—"} · Section ${student.section || "—"} and bears Admission Number ${student.admissionNumber || "—"}.` })
      ]
    ]),

    // Date and signature
    el("div", { style: "display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--border);" }, [
      el("div", { style: "font-size:12px;color:var(--muted);text-align:left;" }, [
        el("div", { text: `Date: ${fmtDate(new Date())}` }),
        el("div", { text: `Place: ${SCHOOL.address.split(",").pop().trim()}` })
      ]),
      el("div", { style: "text-align:right;" }, [
        el("div", { style: "width:140px;border-top:1px solid var(--text);margin:0 auto 4px;" }),
        el("div", { style: "font-size:11px;color:var(--muted);", text: "Authorized Signatory" })
      ])
    ])
  ]));

  return cert;
}
