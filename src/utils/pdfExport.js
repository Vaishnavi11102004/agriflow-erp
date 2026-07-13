import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Builds a standardized AgriFlow ERP PDF report:
 * logo/title header, generated date, filters line, summary block,
 * data table, total record count, and a footer on every page.
 */
export function buildPDFReport({ title, filtersText, summary = [], columns, rows }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont(undefined, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(22, 163, 74);
  doc.text('AgriFlow ERP', 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(title, 14, 27);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 14, 15, { align: 'right' });
  if (filtersText) {
    doc.text(filtersText, pageWidth - 14, 21, { align: 'right' });
  }

  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.6);
  doc.line(14, 31, pageWidth - 14, 31);

  let cursorY = 38;
  if (summary.length) {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Summary', 14, cursorY);
    cursorY += 5;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    summary.forEach(line => {
      doc.text(line, 14, cursorY);
      cursorY += 5;
    });
    cursorY += 2;
  }

  autoTable(doc, {
    startY: cursorY,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : cursorY;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Records: ${rows.length}`, 14, finalY + 8);

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('AgriFlow ERP — System Generated Report', 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }

  return doc;
}

export function downloadPDFReport(opts, filename) {
  const doc = buildPDFReport(opts);
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export default { buildPDFReport, downloadPDFReport };
