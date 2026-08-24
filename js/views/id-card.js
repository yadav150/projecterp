// ID Card generation
import { el, SCHOOL, fmtDate, initials } from "../utils.js";
import { openModal } from "../ui.js";
import { printNode } from "../pdf.js";

/**
 * Generate an ID card HTML element for a student or teacher
 * @param {Object} person - Person data (student or teacher)
 * @param {string} type - 'student' or 'teacher'
 * @returns {HTMLElement} ID card DOM node
 */
export function generateIDCard(person, type) {
  // Clean fallback for person
  const p = person || {};
  const name = p.name || '—';

  const card = el('div', {
    class: 'id-card',
    style: 'width:320px;padding:20px;border:2px solid #dc3545;border-radius:5px;background:#fff;font-family:Inter,sans-serif;margin:0 auto;'
  });

  // School header
  const header = el('div', {
    style: 'text-align:center;border-bottom:2px solid #dc3545;padding-bottom:10px;margin-bottom:12px;'
  }, [
    el('div', { style: 'font-size:16px;font-weight:800;color:#1e293b;', text: SCHOOL.name || 'School Name' }),
    el('div', { style: 'font-size:11px;color:#64748b;', text: SCHOOL.address || '' })
  ]);
  card.appendChild(header);

  // Photo / Avatar
  const photoContainer = el('div', { style: 'display:flex;justify-content:center;margin-bottom:10px;' });
  const avatar = el('div', {
    class: 'avatar lg',
    style: 'width:80px;height:80px;border-radius:50%;border:2px solid #dc3545;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:600;color:#1e293b;background:#f1f5f9;'
  });
  if (p.photoUrl) {
    avatar.appendChild(el('img', {
      src: p.photoUrl,
      style: 'width:100%;height:100%;object-fit:cover;border-radius:50%;',
      alt: name
    }));
  } else {
    avatar.textContent = initials(name);
  }
  photoContainer.appendChild(avatar);
  card.appendChild(photoContainer);

  // Details
  const details = el('div', { style: 'text-align:center;' });
  details.appendChild(el('div', { style: 'font-size:16px;font-weight:700;color:#1e293b;', text: name }));

  if (type === 'student') {
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `Class ${p.class || '—'} · Section ${p.section || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `Adm #${p.admissionNumber || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:12px;color:#64748b;', text: `DOB: ${fmtDate(p.dob)}` }));
  } else {
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `${p.designation || '—'} · ${p.department || '—'}` }));
    details.appendChild(el('div', { style: 'font-size:13px;color:#334155;', text: `ID: ${p.teacherId || '—'}` }));
  }
  card.appendChild(details);

  // Footer
  const footer = el('div', {
    style: 'text-align:center;font-size:10px;color:#64748b;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:8px;'
  }, [
    el('span', { text: 'Valid till: Academic Year 2025-26' })
  ]);
  card.appendChild(footer);

  // QR placeholder
  const qrContainer = el('div', { style: 'text-align:center;margin-top:8px;' });
  const qrCode = el('div', {
    style: 'display:inline-block;padding:4px;border:1px solid #e2e8f0;border-radius:3px;font-size:10px;color:#64748b;'
  }, [el('span', { text: 'QR' })]);
  qrContainer.appendChild(qrCode);
  card.appendChild(qrContainer);

  return card;
}

/**
 * Open a modal with the generated ID card and print button
 * @param {Object} person - Person data
 * @param {string} type - 'student' or 'teacher'
 */
export function openIDCardModal(person, type) {
  const card = generateIDCard(person, type);
  const body = el('div', { style: 'display:flex;justify-content:center;padding:20px;' });
  body.appendChild(card);

  const printBtn = el('button', { class: 'btn btn-outline', text: 'Print ID Card' });
  const closeBtn = el('button', { class: 'btn btn-ghost', text: 'Close' });
  const m = openModal({
    title: 'ID Card',
    body,
    footer: [closeBtn, printBtn],
    size: 'large'
  });

  closeBtn.onclick = () => m.close();
  printBtn.onclick = () => {
    printNode(card);
  };
}
