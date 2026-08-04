// CSV import/export utilities
import { el } from "./utils.js";

/**
 * Convert array of objects to CSV string
 * @param {Array} data - array of objects
 * @param {Array} columns - array of { key, label } or just key strings
 * @returns {string} CSV string
 */
export function arrayToCSV(data, columns) {
  if (!data.length) return '';
  const headers = columns.map(c => typeof c === 'string' ? c : c.label);
  const keys = columns.map(c => typeof c === 'string' ? c : c.key);
  const rows = data.map(item => keys.map(key => {
    let val = item[key];
    if (val === undefined || val === null) val = '';
    val = String(val);
    // Escape double quotes and wrap if contains comma or quote
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      val = '"' + val.replace(/"/g, '""') + '"';
    }
    return val;
  }));
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csvContent;
}

/**
 * Download CSV file
 * @param {string} csv - CSV content
 * @param {string} filename - filename without extension
 */
export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Parse CSV string to array of objects
 * @param {string} csv - CSV content
 * @param {Array} columns - array of column names
 * @returns {Array} array of objects
 */
export function parseCSV(csv, columns) {
  const lines = csv.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    // Map to provided columns if needed
    if (columns && columns.length) {
      const mapped = {};
      columns.forEach(col => {
        mapped[col] = obj[col] || '';
      });
      result.push(mapped);
    } else {
      result.push(obj);
    }
  }
  return result;
}

/**
 * Read CSV file from input
 * @param {File} file - CSV file
 * @returns {Promise<string>} CSV content
 */
export function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
