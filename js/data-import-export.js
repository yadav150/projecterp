// Data Import/Export utilities – CSV handling
import { db, PATH, dbRef, push, set, get } from "./firebase.js";
import { createStudent, createTeacher, recordFeePayment, recordSalaryPayment } from "./data.js";
import { toast } from "../ui.js";

/**
 * Convert array of objects to CSV string
 * @param {Array<Array<string>>} rows - 2D array of values
 * @returns {string} CSV formatted string
 */
export function exportToCSV(rows) {
  if (!rows || !rows.length) return "";
  return rows.map(row =>
    row.map(cell => {
      if (typeof cell === "string" && (cell.includes(",") || cell.includes("\"") || cell.includes("\n"))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(",")
  ).join("\n");
}

/**
 * Download a CSV string as a file
 * @param {string} csv - CSV content
 * @param {string} filename - Filename (e.g., "data.csv")
 */
export function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Parse CSV string to 2D array
 * @param {string} csv - CSV content
 * @returns {Array<Array<string>>} Parsed rows
 */
export function parseCSV(csv) {
  const lines = csv.split("\n").filter(line => line.trim() !== "");
  return lines.map(line => {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i+1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          cells.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

/**
 * Import students from CSV data
 * @param {Array<Array<string>>} rows - Parsed CSV rows (first row is header)
 * @param {function} progressCallback - Optional progress callback
 * @returns {Promise<object>} - { success: count, errors: [{row, error}] }
 */
export async function importStudents(rows, progressCallback) {
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const results = { success: 0, errors: [] };

  // Map column indices
  const idx = (name) => {
    const i = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase().trim());
    return i >= 0 ? i : -1;
  };

  const nameIdx = idx("name");
  const genderIdx = idx("gender");
  const dobIdx = idx("dob");
  const classIdx = idx("class");
  const sectionIdx = idx("section");
  const rollIdx = idx("roll number");
  const fatherIdx = idx("father name");
  const motherIdx = idx("mother name");
  const phoneIdx = idx("phone");
  const emailIdx = idx("email");
  const addressIdx = idx("address");
  const statusIdx = idx("status");

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.every(cell => cell.trim() === "")) continue;

    try {
      const studentData = {
        name: nameIdx >= 0 ? row[nameIdx] : "",
        gender: genderIdx >= 0 ? row[genderIdx] : "",
        dob: dobIdx >= 0 ? row[dobIdx] : "",
        class: classIdx >= 0 ? row[classIdx] : "",
        section: sectionIdx >= 0 ? row[sectionIdx] : "",
        rollNumber: rollIdx >= 0 ? row[rollIdx] : "",
        fatherName: fatherIdx >= 0 ? row[fatherIdx] : "",
        motherName: motherIdx >= 0 ? row[motherIdx] : "",
        phone: phoneIdx >= 0 ? row[phoneIdx] : "",
        email: emailIdx >= 0 ? row[emailIdx] : "",
        address: addressIdx >= 0 ? row[addressIdx] : "",
        status: statusIdx >= 0 ? row[statusIdx] : "Active"
      };

      // Basic validation
      if (!studentData.name) throw new Error("Name is required");
      if (!studentData.class) throw new Error("Class is required");

      await createStudent(studentData, null);
      results.success++;
      if (progressCallback) progressCallback(i + 1, dataRows.length);
    } catch (e) {
      results.errors.push({ row: i + 2, error: e.message });
    }
  }
  return results;
}

/**
 * Import teachers from CSV data
 * @param {Array<Array<string>>} rows - Parsed CSV rows
 * @param {function} progressCallback - Optional progress callback
 * @returns {Promise<object>} - { success: count, errors: [{row, error}] }
 */
export async function importTeachers(rows, progressCallback) {
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const results = { success: 0, errors: [] };

  const idx = (name) => {
    const i = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase().trim());
    return i >= 0 ? i : -1;
  };

  const nameIdx = idx("name");
  const genderIdx = idx("gender");
  const qualificationIdx = idx("qualification");
  const experienceIdx = idx("experience");
  const departmentIdx = idx("department");
  const designationIdx = idx("designation");
  const salaryIdx = idx("salary");
  const phoneIdx = idx("phone");
  const emailIdx = idx("email");
  const addressIdx = idx("address");
  const statusIdx = idx("status");

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (row.every(cell => cell.trim() === "")) continue;

    try {
      const teacherData = {
        name: nameIdx >= 0 ? row[nameIdx] : "",
        gender: genderIdx >= 0 ? row[genderIdx] : "",
        qualification: qualificationIdx >= 0 ? row[qualificationIdx] : "",
        experience: experienceIdx >= 0 ? Number(row[experienceIdx]) || 0 : 0,
        department: departmentIdx >= 0 ? row[departmentIdx] : "",
        designation: designationIdx >= 0 ? row[designationIdx] : "",
        salary: salaryIdx >= 0 ? Number(row[salaryIdx]) || 0 : 0,
        phone: phoneIdx >= 0 ? row[phoneIdx] : "",
        email: emailIdx >= 0 ? row[emailIdx] : "",
        address: addressIdx >= 0 ? row[addressIdx] : "",
        status: statusIdx >= 0 ? row[statusIdx] : "Active"
      };

      if (!teacherData.name) throw new Error("Name is required");
      if (!teacherData.department) throw new Error("Department is required");

      await createTeacher(teacherData, null);
      results.success++;
      if (progressCallback) progressCallback(i + 1, dataRows.length);
    } catch (e) {
      results.errors.push({ row: i + 2, error: e.message });
    }
  }
  return results;
}

/**
 * Export all fees to CSV
 * @param {Array} fees - Fee records array
 * @returns {string} CSV string
 */
export function exportFeesToCSV(fees) {
  const rows = [["Receipt #", "Student", "Class", "Fee Type", "Amount", "Paid", "Balance", "Status", "Date"]];
  fees.forEach(f => {
    rows.push([
      f.receiptNumber || "",
      f.studentName || "",
      `${f.class || ""} ${f.section || ""}`.trim(),
      f.feeType || "",
      f.amount || 0,
      (f.amount || 0) - (f.balance || 0),
      f.balance || 0,
      f.status || "",
      f.date || ""
    ]);
  });
  return exportToCSV(rows);
}

/**
 * Export all salaries to CSV
 * @param {Array} salaries - Salary records array
 * @returns {string} CSV string
 */
export function exportSalariesToCSV(salaries) {
  const rows = [["Receipt #", "Teacher", "Designation", "Month", "Year", "Amount", "Status", "Date"]];
  salaries.forEach(s => {
    rows.push([
      s.receiptNumber || "",
      s.teacherName || "",
      s.designation || "",
      s.month || "",
      s.year || "",
      s.amount || 0,
      s.status || "",
      s.date || ""
    ]);
  });
  return exportToCSV(rows);
}
