// Print / PDF generation for admission form
import { el, SCHOOL, fmtDate } from "../utils.js";
import { elementToPdf, printNode } from "../pdf.js";
import { getStatusLabel, getStatusBadge } from "./admission-utils.js";

/**
 * Generate printable admission form HTML
 * @param {Object} admission - Admission record
 * @param {string} qrCodeImage - QR code image data URL
 * @returns {HTMLElement} - Printable container element
 */
export function renderAdmissionForm(admission, qrCodeImage = '') {
  const wrap = el('div', {
    class: 'admission-print-container',
    style: 'max-width:780px;margin:0 auto;font-size:12px;font-family:Inter,sans-serif;padding:20px;background:#fff;'
  });

  // Header with school logo and admission number
  const header = el('div', {
    style: 'display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #dc3545;padding-bottom:10px;margin-bottom:16px;'
  });
  const left = el('div', {}, [
    el('div', { style: 'font-size:20px;font-weight:800;color:#1e293b;', text: SCHOOL.name }),
    el('div', { style: 'font-size:11px;color:#64748b;', text: SCHOOL.address }),
    el('div', { style: 'font-size:11px;color:#64748b;', text: `${SCHOOL.phone} · ${SCHOOL.email}` })
  ]);
  const right = el('div', { style: 'text-align:right;' }, [
    el('div', { style: 'font-size:12px;font-weight:600;color:#1e293b;', text: `Admission #: ${admission.admissionNumber || '—'}` }),
    el('div', { style: 'font-size:11px;color:#64748b;', text: `Date: ${fmtDate(admission.createdAt)}` }),
    el('div', { style: 'margin-top:4px;', html: `<span class="badge ${getStatusBadge(admission.status)}">${getStatusLabel(admission.status)}</span>` })
  ]);
  header.appendChild(left);
  header.appendChild(right);
  wrap.appendChild(header);

  // Student photo and QR code
  const photoQR = el('div', {
    style: 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;'
  });
  const photo = el('div', { style: 'display:flex;align-items:center;gap:12px;' });
  const avatar = el('div', {
    class: 'avatar lg',
    style: 'width:80px;height:80px;border-radius:50%;border:2px solid #dc3545;overflow:hidden;display:grid;place-items:center;background:#f1f5f9;'
  });
  if (admission.photoUrl) {
    avatar.appendChild(el('img', { src: admission.photoUrl, style: 'width:100%;height:100%;object-fit:cover;' }));
  } else {
    avatar.textContent = 'Photo';
  }
  photo.appendChild(avatar);
  photo.appendChild(el('div', {}, [
    el('div', { style: 'font-weight:700;font-size:16px;color:#1e293b;', text: admission.studentName || '—' }),
    el('div', { style: 'font-size:12px;color:#64748b;', text: `${admission.class || '—'} · Section ${admission.section || '—'}` })
  ]));
  photoQR.appendChild(photo);

  // QR Code
  if (qrCodeImage) {
    const qrContainer = el('div', { style: 'text-align:center;' });
    qrContainer.appendChild(el('img', { src: qrCodeImage, style: 'width:80px;height:80px;' }));
    qrContainer.appendChild(el('div', { style: 'font-size:10px;color:#64748b;', text: 'Scan to verify' }));
    photoQR.appendChild(qrContainer);
  }
  wrap.appendChild(photoQR);

  // Helper: render key-value table
  function renderSection(title, fields) {
    const table = el('table', {
      style: 'width:100%;border-collapse:collapse;margin-bottom:12px;'
    });
    table.appendChild(el('caption', {
      style: 'font-weight:700;font-size:13px;text-align:left;margin-bottom:6px;color:#1e293b;',
      text: title
    }));
    const tbody = el('tbody');
    fields.forEach(([label, value]) => {
      const tr = el('tr', { style: 'border-bottom:1px solid #e2e8f0;' });
      tr.appendChild(el('td', {
        style: 'padding:4px 8px;width:40%;font-weight:600;color:#334155;',
        text: label
      }));
      tr.appendChild(el('td', {
        style: 'padding:4px 8px;color:#1e293b;',
        text: value || '—'
      }));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  // Student Information
  wrap.appendChild(renderSection('Student Information', [
    ['Full Name', admission.studentName],
    ['Gender', admission.gender],
    ['Date of Birth', fmtDate(admission.dob)],
    ['Class', admission.class],
    ['Section', admission.section],
    ['Roll Number', admission.rollNumber || '—']
  ]));

  // Parent / Guardian
  wrap.appendChild(renderSection('Parent / Guardian', [
    ["Father's Name", admission.fatherName],
    ["Mother's Name", admission.motherName],
    ['Guardian', admission.guardian || '—']
  ]));

  // Contact Details
  wrap.appendChild(renderSection('Contact Details', [
    ['Phone', admission.phone],
    ['Emergency Contact', admission.emergencyContact || '—'],
    ['Email', admission.email || '—'],
    ['Address', admission.address || '—']
  ]));

  // Academic History
  wrap.appendChild(renderSection('Academic History', [
    ['Previous School', admission.previousSchool || '—'],
    ['Admission Date', fmtDate(admission.admissionDate)]
  ]));

  // Documents summary
  const docTable = el('table', {
    style: 'width:100%;border-collapse:collapse;margin-bottom:12px;'
  });
  docTable.appendChild(el('caption', {
    style: 'font-weight:700;font-size:13px;text-align:left;margin-bottom:6px;color:#1e293b;',
    text: 'Uploaded Documents'
  }));
  const docHeader = el('thead', {}, [
    el('tr', {}, [
      el('th', { style: 'text-align:left;padding:4px 8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;', text: 'Document' }),
      el('th', { style: 'text-align:left;padding:4px 8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;', text: 'Status' })
    ])
  ]);
  docTable.appendChild(docHeader);
  const docBody = el('tbody');
  (admission.documents || []).forEach(doc => {
    const tr = el('tr', {});
    tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e2e8f0;', text: doc.key }));
    tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e2e8f0;', text: doc.status }));
    docBody.appendChild(tr);
  });
  docTable.appendChild(docBody);
  wrap.appendChild(docTable);

  // Fee details (if any)
  if (admission.feeDetails && Object.keys(admission.feeDetails).length) {
    const feeTable = el('table', {
      style: 'width:100%;border-collapse:collapse;margin-bottom:12px;'
    });
    feeTable.appendChild(el('caption', {
      style: 'font-weight:700;font-size:13px;text-align:left;margin-bottom:6px;color:#1e293b;',
      text: 'Fee Details'
    }));
    const feeHeader = el('thead', {}, [
      el('tr', {}, [
        el('th', { style: 'text-align:left;padding:4px 8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;', text: 'Fee Type' }),
        el('th', { style: 'text-align:right;padding:4px 8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;', text: 'Amount' })
      ])
    ]);
    feeTable.appendChild(feeHeader);
    const feeBody = el('tbody');
    Object.entries(admission.feeDetails).forEach(([type, amount]) => {
      const tr = el('tr', {});
      tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e2e8f0;', text: type }));
      tr.appendChild(el('td', { style: 'padding:4px 8px;border:1px solid #e2e8f0;text-align:right;', text: `₹${amount}` }));
      feeBody.appendChild(tr);
    });
    feeTable.appendChild(feeBody);
    wrap.appendChild(feeTable);
  }

  // Remarks and signatures
  if (admission.remarks) {
    wrap.appendChild(el('div', { style: 'margin:12px 0;' }, [
      el('div', { style: 'font-weight:600;color:#1e293b;', text: 'Office Remarks:' }),
      el('div', { style: 'color:#334155;', text: admission.remarks })
    ]));
  }

  const signatureSection = el('div', {
    style: 'display:flex;justify-content:space-between;margin-top:24px;'
  });
  const sign1 = el('div', { style: 'text-align:center;' }, [
    el('div', { style: 'width:150px;border-top:1px solid #1e293b;margin:0 auto;' }),
    el('div', { style: 'font-size:10px;color:#64748b;margin-top:4px;', text: 'Parent/Guardian Signature' })
  ]);
  const sign2 = el('div', { style: 'text-align:center;' }, [
    el('div', { style: 'width:150px;border-top:1px solid #1e293b;margin:0 auto;' }),
    el('div', { style: 'font-size:10px;color:#64748b;margin-top:4px;', text: 'Authorized Signatory' })
  ]);
  signatureSection.appendChild(sign1);
  signatureSection.appendChild(sign2);
  wrap.appendChild(signatureSection);

  // Footer
  wrap.appendChild(el('div', {
    style: 'font-size:10px;color:#94a3b8;text-align:center;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;'
  }, [
    el('span', { text: 'This is a system-generated admission form. Verification QR code is included.' })
  ]));

  return wrap;
}

/**
 * Open print modal for admission form
 * @param {Object} admission - Admission record
 * @param {string} qrImage - QR code image data URL
 */
export function openAdmissionPrint(admission, qrImage) {
  const form = renderAdmissionForm(admission, qrImage);
  const body = el('div', { style: 'padding:12px;overflow:auto;max-height:80vh;' });
  body.appendChild(form);

  const printBtn = el('button', { class: 'btn btn-outline', text: 'Print' });
  const pdfBtn = el('button', { class: 'btn btn-primary', text: 'Download PDF' });
  const closeBtn = el('button', { class: 'btn btn-ghost', text: 'Close' });

  // We need openModal from ui.js – import dynamically to avoid circular deps
  // Use a function to open modal with these buttons

  // Simple modal fallback – just open a new window for print
  // But we want a modal with preview. We'll use the global openModal from ui.js
  import("../ui.js").then(({ openModal }) => {
    const m = openModal({
      title: `Admission Form #${admission.admissionNumber}`,
      body: body,
      footer: [closeBtn, printBtn, pdfBtn],
      size: 'large'
    });

    closeBtn.onclick = () => m.close();
    printBtn.onclick = () => printNode(form);
    pdfBtn.onclick = () => elementToPdf(form, `Admission_${admission.admissionNumber}.pdf`);
  });
}

/**
 * Quick print function – directly prints the form without modal
 * @param {Object} admission - Admission record
 * @param {string} qrImage - QR code image data URL
 */
export function directPrintAdmission(admission, qrImage) {
  const form = renderAdmissionForm(admission, qrImage);
  printNode(form);
}

/**
 * Download PDF directly without modal preview
 * @param {Object} admission - Admission record
 * @param {string} qrImage - QR code image data URL
 * @param {string} filename - Optional filename
 */
export function downloadAdmissionPDF(admission, qrImage, filename) {
  const form = renderAdmissionForm(admission, qrImage);
  const fname = filename || `Admission_${admission.admissionNumber}.pdf`;
  elementToPdf(form, fname);
}
