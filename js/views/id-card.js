// ID Card generation
import { el, SCHOOL, fmtDate, initials } from "../utils.js";
import { openModal } from "../ui.js";
import { printNode } from "../pdf.js";

/**
 * Generate ID card HTML for a student or teacher
 * @param {Object} person - student or teacher object
 * @param {string} type - 'student' or 'teacher'
 * @returns {HTMLElement} - printable card element
 */
export function generateIDCard(person, type) {
  const card = el('div', {
    class: 'id-card',
    style: 'width:320px;padding:20px;border:2px solid #dc3545;border-radius:5px;background:#fff;font-family:Inter,sans-serif;margin:0 auto;'
  });

  // Header
  const header = el('div', { style: 'text-align:center;border-bottom:2px solid #dc3545;padding-bottom:10px;margin-bottom:12px;' }, [
    el('div', { style: 'font-size:16px;font-weight:800;color:#1e293b;', text: SCHOOL.name }),
    el('div', { style: 'font-size:11px;color:#64748b;', text: SCHOOL.address })
  ]);
  card.appendChild(header);

  // Photo
  const photoContainer = el('div', { style: 'display:flex;justify-content:center;margin-bottom:10px;' });
  const avatar = el('div', { class: 'avatar lg', style: 'width:80px;height:80px;border-radius:50%;border:2px solid #dc3545;' });
  if (person.photoUrl) avatar.appendChild(el('img', { src: person.photoUrl, style: 'width:100%;height:100%;object-fit:cover;border-radius:50%;' }));
  else avatar.textContent = initials(person.name || '');
  photoContainer.appendChild(avatar);
  card.appendChild(photoContainer);

  // Details
  const details = el('div', { style: 'text-align:center;' });
  details.appendChild(el('div', { style: 'font-size:16px;font-weight:700;color:#1e293b;', text: person.name || '—' }));

  if (type === 'student') {
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `Class ${person.class || '—'} · Section ${person.section || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `Adm #${person.admissionNumber || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:12px;color:#64748b;', text: `DOB: ${fmtDate(person.dob)}` }));
  } else {
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `${person.designation || '—'} · ${person.department || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `ID: ${person.teacherId || '—'}` }));
  }

  card.appendChild(details);

  // Footer
  const footer = el('div', { style: 'text-align:center;font-size:10px;color:#64748b;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px;' }, [
    el('span', { text: 'Valid till: Academic Year 2025-26' })
  ]);
  card.appendChild(footer);

  // QR Code placeholder (simplified)
  const qrContainer = el('div', { style: 'text-align:center;margin-top:8px;' });
  const qrCode = el('div', {
    style: 'display:inline-block;padding:4px;border:1px solid #e2e8f0;border-radius:3px;font-size:10px;color:#64748b;'
  }, [el('span', { text: 'QR' })]);
  qrContainer.appendChild(qrCode);
  card.appendChild(qrContainer);

  return card;
}

/**
 * Open ID card modal with print option
 * @param {Object} person - student or teacher object
 * @param {string} type - 'student' or 'teacher'
 */
export function openIDCardModal(person, type) {
  const card = generateIDCard(person, type);
  const body = el('div', { style: 'display:flex;justify-content:center;padding:20px;' });
  body.appendChild(card);

  const printBtn = el('button', { class: 'btn btn-outline', text: 'Print ID Card' });
  const closeBtn = el('button', { class: 'btn btn-ghost', text: 'Close' });
  const m = openModal({ title: 'ID Card', body, footer: [closeBtn, printBtn], size: 'large' });
  closeBtn.onclick = () => m.close();
  printBtn.onclick = () => printNode(card);
}
