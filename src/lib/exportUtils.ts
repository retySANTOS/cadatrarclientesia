import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  align?: 'left' | 'right';
  format?: (value: any) => string;
}

interface ExportOptions {
  title: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  fileName: string;
  totals?: Record<string, string>;
}

export function exportToPDF({ title, columns, data, fileName, totals }: ExportOptions) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

  const head = [columns.map(c => c.header)];
  const body = data.map(row =>
    columns.map(c => c.format ? c.format(row[c.key]) : String(row[c.key] ?? ''))
  );

  if (totals) {
    body.push(columns.map(c => totals[c.key] ?? ''));
  }

  autoTable(doc, {
    startY: 34,
    head,
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 95] },
    foot: totals ? [columns.map(c => totals[c.key] ?? '')] : undefined,
  });

  doc.save(`${fileName}.pdf`);
}

export function exportToExcel({ title, columns, data, fileName, totals }: ExportOptions) {
  const rows = data.map(row =>
    Object.fromEntries(columns.map(c => [c.header, c.format ? c.format(row[c.key]) : row[c.key] ?? '']))
  );

  if (totals) {
    rows.push(Object.fromEntries(columns.map(c => [c.header, totals[c.key] ?? ''])));
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
