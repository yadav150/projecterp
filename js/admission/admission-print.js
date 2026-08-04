// Print / PDF generation for admission form
import { el, SCHOOL, fmtDate } from "../utils.js";
import { elementToPdf, printNode } from "../pdf.js";
import { getStatusLabel, getStatusBadge } from "./admission-utils.js";

/**
 * Generate printable admission form HTML
 */
export function renderAdmissionForm(admission, qrCodeImage) {
  const wrap = el('div', { class: 'admission-print-container', style: 'max-width:780px;margin:0 auto;font-size:12px;' });

  // Header with school logo and admission number
  const header = el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4f46e5;padding-bottom:10px;margin-bottom:16px;' });
  const left = el('div', {}, [
    el('div', { style: 'font-size:20px;font-weight:800;', text: SCHOOL.name }),
    el('div', { style: 'font-size:11px;color:#6b7280;', text: SCHOOL.address }),
    el('div', { style: 'font-size:11px;color:#6b7280;', text: `${SCHOOL.phone} · ${SCHOOL.email}` })
  ]);
  const right = el('div', { style: 'text-align:right;' }, [
    el('div', { style: 'font-size:12px;font-weight:600;', text: `Admission #: ${admission.admissionNumber}` }),
    el('div', { style: 'font-size:11px;color:#6b7280;', text: `Date: ${fmtDate(admission.createdAt)}` }),
    el('div', { style: 'margin-top:4px;', html: `<span class="badge ${getStatusBadge(admission.status)}">${getStatusLabel(admission.status)}</span>` })
  ]);
  header.appendChild(left);
  header.appendChild(right);
  wrap.appendChild(header);

  // Student photo and QR code
  const photoQR = el('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;' });
  const photo = el('div', { style: 'display:flex;align-items:center;gap:12px;' });
  const avatar = el('div', { class: 'avatar lg', style: 'width:80px;height:80px;' });
  if (admission.photoUrl) {
    avatar.appendChild(el('img', { src: admission.photoUrl, style: 'width:100%;height:100%;object-fit:cover;' }));
  } else {
    avatar.textContent = 'Photo';
  }
  photo.appendChild(avatar);
  photo.appendChild(el('div', {}, [
    el('div', { style: 'font-weight:600;font-size:16px;', text: admission.studentName || '—' }),
    el('div', { style: 'font-size:12px;color:#6b7280;', text: `${admission.class || '—'} · Section ${admission.section || '—'}` })
  ]));
  photoQR.appendChild(photo);

  // QR Code
  if (qrCodeImage) {
    const qrContainer = el('div', { style: 'text-align:center;' });
    qrContainer.appendChild(el('img', { src: qrCodeImage, style: 'width:80px;height:80px;' }));
    qrContainer.appendChild(el('div', { style: 'font-size:10px;color:#6b7280;', text: 'Scan to verify' }));
    photoQR.appendChild(qrContainer);
  }
  wrap.appendChild(photoQR);

  // Sections as tables
  const sections = [
    { title: 'Student Information', fields: [
      ['Full Name', admission.studentName],
      ['Gender', admission.gender],
      ['Date of Birth', fmtDate(admission.dob)],
      ['Class', admission.class],
      ['Section', admission.section],
      ['Roll Number', admission.rollNumber || '—']
    ]},
    { title: 'Parent / Guardian', fields: [
      ["Father's Name", admission.fatherName],
      ["Mother's Name", admission.motherName],
      ['Guardian', admission.guardian || '—']
    ]},
    { title: 'Contact Details', fields: [
      ['Phone', admission.phone],
      ['Emergency Contact', admission.emergencyContact || '—'],
      ['Email', admission.email || '—'],
      ['Address', admission.address || '—']
    ]},
    { title: 'Academic History', fields: [
      ['Previous School', admission.previousSchool || '—'],
      ['Admission Date', fmtDate(admission.admissionDate)]
    ]}
  ];

  sections.forEach(sec => {
    const table = el('table', { style: 'width:100%;border-collapse:collapse;margin-bottom:12px;' });
    table.appendChild(el('caption', { style: 'font-weight:700;font-size:13px;text-align:left;margin-bottom:6px;', text: sec.title }));
    const tbody = el('tbody');
    sec.fields.forEach(([label, value]) => {
      const tr = el('tr', { style: 'border-bottom:1px solid #e5e7eb;' });
      tr.appendChild(el('td', { style: 'padding:4px 8px;width:40%;font-weight:600;', text: label }));
      tr.appendChild(el('td', { style: 'padding:4px 8px;', text: value || '—' }));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  });

  // Documents summary
  const docTable = el('table', { style: 'width:100%;border-collapse:collapse;margin-bottom:12px;' });
  docTable.appendChild(el('caption', { style: 'font-weight:700;font-size:13px;text-align:left;margin-bottom:6px;', text: 'Uploaded Documents' }));
  const docHeader = el('thead', {}, [
    el('tr', {}, [
      el('th', { style: 'text-align:left;padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;', text: 'Document' }),
      el('th', { style: 'text-align:left;padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;', text: 'Status' })
    ])
  ]);
  docTable.appendChild(docHeader);
  const docBody = el('tbody');
  (admission.documents || []).forEach(doc => {
    const tr = el('tr', {});
    tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e5e7eb;', text: doc.key }));
    tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e5e7eb;', text: doc.status }));
    docBody.appendChild(tr);
  });
  docTable.appendChild(docBody);
  wrap.appendChild(docTable);

  // Fee details (if any)
  if (admission.feeDetails && Object.keys(admission.feeDetails).length) {
    const feeTable = el('table', { style: 'width:100%;border-collapse:collapse;margin-bottom:12px;' });
    feeTable.appendChild(el('caption', { style: 'font-weight:700;font-size:13px;text-align:left;margin-bottom:6px;', text: 'Fee Details' }));
    const feeHeader = el('thead', {}, [
      el('tr', {}, [
        el('th', { style: 'text-align:left;padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;', text: 'Fee Type' }),
        el('th', { style: 'text-align:right;padding:4px 8px;background:#f9fafb;border:1px solid #e5e7eb;', text: 'Amount' })
      ])
    ]);
    feeTable.appendChild(feeHeader);
    const feeBody = el('tbody');
    Object.entries(admission.feeDetails).forEach(([type, amount]) => {
      const tr = el('tr', {});
      tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e5e7eb;', text: type }));
      tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e5e7eb;text-align:right;', text: `₹${amount}` }));
      feeBody.appendChild(tr);
    });
    feeTable.appendChild(feeBody);
    wrap.appendChild(feeTable);
  }

  // Remarks and signatures
  if (admission.remarks) {
    wrap.appendChild(el('div', { style: 'margin:12px 0;', }, [
      el('div', { style: 'font-weight:600;', text: 'Office Remarks:' }),
      el('div', { text: admission.remarks })
    ]));
  }

  const signatureSection = el('div', { style: 'display:flex;justify-content:space-between;margin-top:24px;' });
  const sign1 = el('div', { style: 'text-align:center;' }, [
    el('div', { style: 'width:150px;border-top:1px solid #000;margin:0 auto;' }),
    el('div', { style: 'font-size:10px;', text: 'Parent/Guardian Signature' })
  ]);
  const sign2 = el('div', { style: 'text-align:center;' }, [
    el('div', { style: 'width:150px;border-top:1px solid #000;margin:0 auto;' }),
    el('div', { style: 'font-size:10px;', text: 'Authorized Signatory' })
  ]);
  signatureSection.appendChild(sign1);
  signatureSection.appendChild(sign2);
  wrap.appendChild(signatureSection);

  // Footer
  wrap.appendChild(el('div', { style: 'font-size:10px;color:#6b7280;text-align:center;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:10px;' }, [
    el('span', { text: 'This is a system-generated admission form. Verification QR code is included.' })
  ]));

  return wrap;
}

/**
 * Open print modal for admission form
 */
export function openAdmissionPrint(admission, qrImage) {
  const form = renderAdmissionForm(admission, qrImage);
  const body = el('div', { style: 'padding:12px;overflow:auto;' });
  body.appendChild(form);

  const printBtn = el('button', { class: 'btn btn-outline', text: 'Print' });
  const pdfBtn = el('button', { class: 'btn btn-primary', text: 'Download PDF' });
  const closeBtn = el('button', { class: 'btn btn-ghost', text: 'Close' });
  const m = openModal({ title: 'Admission Form Preview', body, footer: [closeBtn, printBtn, pdfBtn], size: 'large' });

  closeBtn.onclick = () => m.close();
  printBtn.onclick = () => printNode(form);
  pdfBtn.onclick = () => elementToPdf(form, `Admission_${admission.admissionNumber}.pdf`);
}
