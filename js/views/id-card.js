// ID Card generation
import { el, SCHOOL, fmtDate, initials } from "../utils.js";
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
    style: 'width:320px;padding:20px;border:2px solid var(--primary);border-radius:12px;background:#fff;font-family:sans-serif;'
  });

  // Header
  const header = el('div', { style: 'text-align:center;border-bottom:2px solid var(--primary);padding-bottom:10px;margin-bottom:12px;' }, [
    el('div', { style: 'font-size:16px;font-weight:800;', text: SCHOOL.name }),
    el('div', { style: 'font-size:11px;color:var(--muted);', text: SCHOOL.address })
  ]);
  card.appendChild(header);

  // Photo
  const photoContainer = el('div', { style: 'display:flex;justify-content:center;margin-bottom:10px;' });
  const avatar = el('div', { class: 'avatar lg', style: 'width:80px;height:80px;' });
  if (person.photoUrl) avatar.appendChild(el('img', { src: person.photoUrl, style: 'width:100%;height:100%;object-fit:cover;' }));
  else avatar.textContent = initials(person.name || '');
  photoContainer.appendChild(avatar);
  card.appendChild(photoContainer);

  // Details
  const details = el('div', { style: 'text-align:center;' });
  details.appendChild(el('div', { style: 'font-size:16px;font-weight:700;', text: person.name || '—' }));

  if (type === 'student') {
    details.appendChild(el('div', { style: 'font-size:13px;', text: `Class ${person.class || '—'} · Section ${person.section || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:13px;', text: `Adm #${person.admissionNumber || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:12px;color:var(--muted);', text: `DOB: ${fmtDate(person.dob)}` }));
  } else {
    details.appendChild(el('div', { style: 'font-size:13px;', text: `${person.designation || '—'} · ${person.department || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:13px;', text: `ID: ${person.teacherId || '—'}` }));
  }

  card.appendChild(details);

  // Footer
  const footer = el('div', { style: 'text-align:center;font-size:10px;color:var(--muted);margin-top:12px;border-top:1px solid var(--border);padding-top:8px;' }, [
    el('span', { text: 'Valid till: Academic Year 2025-26' })
  ]);
  card.appendChild(footer);

  return card;
}

/**
 * Open ID card modal with print/PDF options
 * @param {Object} person - student or teacher object
 * @param {string} type - 'student' or 'teacher'
 */
export function openIDCardModal(person, type) {
  const card = generateIDCard(person, type);
  const body = el('div', { style: 'display:flex;justify-content:center;padding:20px;' });
  body.appendChild(card);

  const printBtn = el('button', { class: 'btn btn-outline', text: 'Print' });
  const closeBtn = el('button', { class: 'btn btn-ghost', text: 'Close' });
  const m = openModal({ title: 'ID Card', body, footer: [closeBtn, printBtn] });
  closeBtn.onclick = () => m.close();
  printBtn.onclick = () => printNode(card);
}
