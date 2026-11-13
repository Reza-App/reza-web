/**
 * CSV export. Cells starting with = + - @ are prefixed with a quote so a
 * spreadsheet never runs them as formulas (CSV injection).
 */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    let text = String(value ?? '');
    const isNumber = /^-?\d+([.,]\d+)?$/.test(text);
    if (!isNumber && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]): void {
  // BOM so Excel reads the accents as UTF-8.
  const blob = new Blob(['﻿', toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
