/**
 * Spreadsheet export. Builds a UTF-8 CSV (with BOM so Excel reads Thai and other
 * non-Latin text correctly) and downloads it. Opens in Excel, Numbers and Google Sheets.
 */

const esc = (v) => {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;   // block formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** rows: array of arrays (first row usually the header). */
export function toCsv(rows) {
  return rows.map(r => r.map(esc).join(',')).join('\r\n');
}

export function downloadCsv(filename, rows) {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const stamp = () => new Date().toISOString().slice(0, 10);
