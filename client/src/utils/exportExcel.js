import * as XLSX from 'xlsx';

/**
 * @param {object[]} data - Array of row objects
 * @param {Array<{key: string, header: string, width?: number, format?: (v:any) => any}>} columns
 * @param {string} filename - without .xlsx extension
 * @param {string} [sheetName]
 */
export function exportToExcel(data, columns, filename, sheetName = 'Daten') {
  const rows = [
    columns.map(c => c.header),
    ...data.map(row =>
      columns.map(c => {
        const val = row[c.key];
        return c.format ? c.format(val) : (val ?? '');
      })
    )
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width || 18 }));

  // Bold header row
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell) cell.s = { font: { bold: true } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function formatDate(val) {
  if (!val) return '';
  return new Date(val).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(val) {
  if (!val) return '';
  return new Date(val).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function yesNo(val) {
  return val ? 'Ja' : 'Nein';
}
