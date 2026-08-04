// Certificate generation
import { el, SCHOOL, fmtDate, initials } from "../utils.js";
import { openModal } from "../ui.js";
import { printNode } from "../pdf.js";

const CERTIFICATE_TYPES = [
  { value: 'bonafide', label: 'Bonafide Certificate' },
  { value: 'transfer', label: 'Transfer Certificate' },
  { value: 'conduct', label: 'Character Certificate' }
];

export function generateCertificate(student, type, issueDate) {
  const cert = el('div', {
    class: 'certificate',
    style: 'width:700px;padding:40px;border:8px double #dc3545;border-radius:5px;background:#fff;font-family:Inter,serif;text-align:center;margin:0 auto;'
  });

  const header = el('div', { style: 'border-bottom:2px solid #dc3545;padding-bottom:16px;margin-bottom:20px;' }, [
    el('div', { style: 'font-size:24px;font-weight:800;letter-spacing:2px;color:#1e293b;', text: SCHOOL.name }),
    el('div', { style: 'font-size:13px;color:#64748b;', text: SCHOOL.address }),
    el('div', { style: 'font-size:13px;color:#64748b;', text: `${SCHOOL.phone} · ${SCHOOL.email}` })
  ]);
  cert.appendChild(header);

  const typeLabel = CERTIFICATE_TYPES.find(t => t.value === type)?.label || 'Certificate';
  cert.appendChild(el('div', { style: 'font-size:22px;font-weight:700;margin-bottom:20px;text-transform:uppercase;letter-spacing:4px;color:#dc3545;', text: typeLabel }));

  const certNumber = `JPA/CERT/${String(Date.now()).slice(-6)}`;
  cert.appendChild(el('div', { style: 'font-size:12px;color:#64748b;margin-bottom:16px;', text: `Certificate No: ${certNumber}` }));

  const bodyText = el('div', { style: 'font-size:15px;line-height:1.8;text-align:left;padding:0 20px;' });

  if (type === 'bonafide') {
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `This is to certify that ${student.name || '—'} is a bonafide student of this school.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `He/She is studying in Class ${student.class || '—'} Section ${student.section || '—'}.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `Admission Number: ${student.admissionNumber || '—'}` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `Date of Birth: ${fmtDate(student.dob)}` }));
  } else if (type === 'transfer') {
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `This is to certify that ${student.name || '—'} was a student of this school.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `He/She studied in Class ${student.class || '—'} Section ${student.section || '—'} during the academic year 2024-25.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `Admission Number: ${student.admissionNumber || '—'}` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `He/She is eligible for transfer to another school.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `Character and conduct: Satisfactory.` }));
  } else if (type === 'conduct') {
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `This is to certify that ${student.name || '—'} has good moral character and conduct.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `He/She has been a student of this school and maintained good behavior.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `During his/her stay at this school, no misconduct was reported.` }));
    bodyText.appendChild(el('p', { style: 'text-indent:40px;', text: `He/She is recommended for further studies.` }));
  }

  bodyText.appendChild(el('p', { style: 'margin-top:20px;text-align:right;', text: `Date: ${fmtDate(issueDate)}` }));

  bodyText.appendChild(el('div', { style: 'margin-top:40px;display:flex;justify-content:space-between;' }, [
    el('div', { style: 'text-align:center;' }, [
      el('div', { style: 'width:150px;border-top:1px solid #1e293b;margin:0 auto;' }),
      el('div', { style: 'font-size:12px;color:#64748b;margin-top:4px;', text: 'Class Teacher' })
    ]),
    el('div', { style: 'text-align:center;' }, [
      el('div', { style: 'width:150px;border-top:1px solid #1e293b;margin:0 auto;' }),
      el('div', { style: 'font-size:12px;color:#64748b;margin-top:4px;', text: 'Principal' })
    ])
  ]));

  cert.appendChild(bodyText);

  cert.appendChild(el('div', { style: 'margin-top:30px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;' }, [
    el('span', { text: 'This is a system-generated certificate. Verification can be done using the certificate number.' })
  ]));

  return cert;
}

export function openCertificateModal(student) {
  const body = el('div', { style: 'padding:12px;' });

  const typeSel = el('select', { class: 'select', style: 'width:100%;margin-bottom:12px;' });
  CERTIFICATE_TYPES.forEach(t => typeSel.appendChild(el('option', { value: t.value, text: t.label })));

  const issueDate = el('input', { type: 'date', class: 'input', value: new Date().toISOString().slice(0,10), style: 'width:100%;' });

  const generateBtn = el('button', { class: 'btn btn-primary', text: 'Generate Certificate' });
  const previewContainer = el('div', { style: 'margin-top:16px;overflow:auto;max-height:400px;' });

  body.appendChild(el('div', { style: 'margin-bottom:8px;font-weight:600;', text: 'Certificate Type:' }));
  body.appendChild(typeSel);
  body.appendChild(el('div', { style: 'margin-bottom:8px;font-weight:600;', text: 'Issue Date:' }));
  body.appendChild(issueDate);
  body.appendChild(generateBtn);
  body.appendChild(previewContainer);

  const m = openModal({ title: 'Generate Certificate', body, size: 'large' });

  generateBtn.onclick = () => {
    const cert = generateCertificate(student, typeSel.value, issueDate.value);
    previewContainer.innerHTML = '';
    previewContainer.appendChild(cert);

    const printBtn = el('button', { class: 'btn btn-outline', style: 'margin-top:10px;', text: 'Print Certificate' });
    previewContainer.appendChild(printBtn);
    printBtn.onclick = () => printNode(cert);

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generated';
  };
}
