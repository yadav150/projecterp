// Certificate generation
import { el, SCHOOL, fmtDate, initials } from "../utils.js";
import { printNode } from "../pdf.js";

const CERTIFICATE_TYPES = [
  { value: 'bonafide', label: 'Bonafide Certificate' },
  { value: 'transfer', label: 'Transfer Certificate' },
  { value: 'conduct', label: 'Character Certificate' }
];

/**
 * Generate certificate HTML
 * @param {Object} student - student object
 * @param {string} type - certificate type
 * @param {string} issueDate - ISO date
 * @returns {HTMLElement} - printable certificate element
 */
export function generateCertificate(student, type, issueDate) {
  const cert = el('div', {
    class: 'certificate',
    style: 'width:700px;padding:40px;border:8px double var(--primary);border-radius:12px;background:#fff;font-family:serif;text-align:center;margin:0 auto;'
  });

  // School header
  const header = el('div', { style: 'border-bottom:2px solid var(--primary);padding-bottom:16px;margin-bottom:20px;' }, [
    el('div', { style: 'font-size:24px;font-weight:800;letter-spacing:2px;', text: SCHOOL.name }),
    el('div', { style: 'font-size:13px;color:var(--muted);', text: SCHOOL.address }),
    el('div', { style: 'font-size:13px;color:var(--muted);', text: `${SCHOOL.phone} · ${SCHOOL.email}` })
  ]);
  cert.appendChild(header);

  // Title
  const typeLabel = CERTIFICATE_TYPES.find(t => t.value === type)?.label || 'Certificate';
  cert.appendChild(el('div', { style: 'font-size:22px;font-weight:700;margin-bottom:20px;text-transform:uppercase;letter-spacing:4px;', text: typeLabel }));

  // Body
  const bodyText = el('div', { style: 'font-size:15px;line-height:1.8;text-align:left;padding:0 20px;' });

  if (type === 'bonafide') {
    bodyText.appendChild(el('p', { text: `This is to certify that ${student.name || '—'} is a bonafide student of this school.` }));
    bodyText.appendChild(el('p', { text: `He/She is studying in Class ${student.class || '—'} Section ${student.section || '—'}.` }));
    bodyText.appendChild(el('p', { text: `Admission Number: ${student.admissionNumber || '—'}` }));
  } else if (type === 'transfer') {
    bodyText.appendChild(el('p', { text: `This is to certify that ${student.name || '—'} was a student of this school.` }));
    bodyText.appendChild(el('p', { text: `He/She studied in Class ${student.class || '—'} Section ${student.section || '—'} during the academic year 2024-25.` }));
    bodyText.appendChild(el('p', { text: `He/She is eligible for transfer to another school.` }));
  } else if (type === 'conduct') {
    bodyText.appendChild(el('p', { text: `This is to certify that ${student.name || '—'} has good moral character and conduct.` }));
    bodyText.appendChild(el('p', { text: `He/She has been a student of this school and maintained good behavior.` }));
  }

  // Signature and date
  bodyText.appendChild(el('p', { style: 'margin-top:30px;text-align:right;' }, [
    el('span', { text: `Date: ${fmtDate(issueDate)}` })
  ]));
  bodyText.appendChild(el('div', { style: 'margin-top:40px;display:flex;justify-content:space-between;' }, [
    el('div', {}, [
      el('div', { style: 'width:150px;border-top:1px solid #000;' }),
      el('div', { style: 'font-size:12px;margin-top:4px;', text: 'Authorized Signatory' })
    ])
  ]));

  cert.appendChild(bodyText);

  // Footer
  cert.appendChild(el('div', { style: 'margin-top:30px;border-top:1px solid var(--border);padding-top:12px;font-size:11px;color:var(--muted);' }, [
    el('span', { text: 'This is a system-generated certificate. No signature required.' })
  ]));

  return cert;
}

/**
 * Open certificate modal with print options
 * @param {Object} student - student object
 */
export function openCertificateModal(student) {
  const body = el('div', { style: 'padding:12px;' });

  // Type selector
  const typeSel = el('select', { class: 'select', style: 'width:100%;margin-bottom:12px;' });
  CERTIFICATE_TYPES.forEach(t => typeSel.appendChild(el('option', { value: t.value, text: t.label })));

  const issueDate = el('input', { type: 'date', class: 'input', value: new Date().toISOString().slice(0,10), style: 'width:100%;' });

  const generateBtn = el('button', { class: 'btn btn-primary', text: 'Generate Certificate' });
  const previewContainer = el('div', { style: 'margin-top:16px;overflow:auto;' });

  body.appendChild(el('div', { style: 'margin-bottom:8px;', text: 'Certificate Type:' }));
  body.appendChild(typeSel);
  body.appendChild(el('div', { style: 'margin-bottom:8px;', text: 'Issue Date:' }));
  body.appendChild(issueDate);
  body.appendChild(generateBtn);
  body.appendChild(previewContainer);

  const m = openModal({ title: 'Generate Certificate', body, size: 'large' });

  generateBtn.onclick = () => {
    const cert = generateCertificate(student, typeSel.value, issueDate.value);
    previewContainer.innerHTML = '';
    previewContainer.appendChild(cert);
    // Add print button
    const printBtn = el('button', { class: 'btn btn-outline', style: 'margin-top:10px;', text: 'Print Certificate' });
    previewContainer.appendChild(printBtn);
    printBtn.onclick = () => printNode(cert);
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generated';
  };
}
