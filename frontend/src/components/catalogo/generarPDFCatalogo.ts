import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Producto } from './types';

const NAVY  = [0, 64, 133]   as [number, number, number];
const LIGHT = [169, 194, 217] as [number, number, number];
const DARK  = [58, 58, 58]    as [number, number, number];
const CREAM = [247, 246, 241] as [number, number, number];
const GREEN = [5, 150, 105]   as [number, number, number];
const AMBER = [217, 119, 6]   as [number, number, number];
const RED   = [220, 38, 38]   as [number, number, number];

function stockColor(n: number): [number, number, number] {
  if (n === 0) return RED;
  if (n <= 5)  return AMBER;
  return GREEN;
}

export function generarPDFCatalogo(productos: Producto[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // ── Header ─────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KARGO', 14, 17);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...LIGHT);
  doc.text('CRM', 14, 23);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen de Stock — Catálogo completo', W / 2, 17, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...LIGHT);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, W / 2, 24, { align: 'center' });

  let y = 44;

  // ── Resumen global ──────────────────────────────────────
  const totalDeposito = productos.reduce((s, p) => s + p.colores.reduce((cs, c) => cs + c.stockDeposito, 0), 0);
  const totalSede     = productos.reduce((s, p) => s + p.colores.reduce((cs, c) => cs + c.stockSede, 0), 0);
  const totalUnidades = totalDeposito + totalSede;
  const sinStock      = productos.filter(p => p.colores.every(c => c.stockDeposito + c.stockSede === 0)).length;

  const colW = (W - 28) / 4;
  const resumen = [
    { label: 'Total unidades', valor: totalUnidades.toString(), color: NAVY },
    { label: 'En depósito',    valor: totalDeposito.toString(), color: GREEN },
    { label: 'En sede',        valor: totalSede.toString(),     color: [2, 132, 199] as [number, number, number] },
    { label: 'Sin stock',      valor: sinStock.toString(),      color: RED },
  ];

  resumen.forEach((r, i) => {
    const x = 14 + i * (colW + 2);
    doc.setFillColor(...CREAM);
    doc.roundedRect(x, y, colW, 16, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(r.label.toUpperCase(), x + 3, y + 5);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...r.color);
    doc.text(r.valor, x + 3, y + 13);
  });

  y += 22;

  // ── Tabla por producto ─────────────────────────────────
  const rows: any[] = [];

  for (const p of productos) {
    const totalP = p.colores.reduce((s, c) => s + c.stockDeposito + c.stockSede, 0);

    if (p.colores.length === 1) {
      const c = p.colores[0];
      const total = c.stockDeposito + c.stockSede;
      rows.push([
        `${p.nombre}\n${p.sku}`,
        p.categoria,
        c.color,
        c.sku || p.sku,
        c.stockDeposito.toString(),
        c.stockSede.toString(),
        total.toString(),
      ]);
    } else {
      // Primera fila: nombre del producto (sin color)
      rows.push([
        { content: `${p.nombre}\n${p.sku}`, rowSpan: p.colores.length, styles: { fontStyle: 'bold' } },
        { content: p.categoria, rowSpan: p.colores.length },
        p.colores[0].color,
        p.colores[0].sku || '',
        p.colores[0].stockDeposito.toString(),
        p.colores[0].stockSede.toString(),
        (p.colores[0].stockDeposito + p.colores[0].stockSede).toString(),
      ]);
      // Filas adicionales por color
      for (let i = 1; i < p.colores.length; i++) {
        const c = p.colores[i];
        rows.push([
          c.color,
          c.sku || '',
          c.stockDeposito.toString(),
          c.stockSede.toString(),
          (c.stockDeposito + c.stockSede).toString(),
        ]);
      }
    }

    // Fila de subtotal si hay múltiples colores
    if (p.colores.length > 1) {
      const dep = p.colores.reduce((s, c) => s + c.stockDeposito, 0);
      const sed = p.colores.reduce((s, c) => s + c.stockSede, 0);
      rows.push([
        { content: 'SUBTOTAL', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 245, 255], textColor: NAVY } },
        { content: dep.toString(), styles: { fontStyle: 'bold', fillColor: [240, 245, 255], textColor: NAVY } },
        { content: sed.toString(), styles: { fontStyle: 'bold', fillColor: [240, 245, 255], textColor: NAVY } },
        { content: totalP.toString(), styles: { fontStyle: 'bold', fillColor: [240, 245, 255], textColor: NAVY } },
      ]);
    }
  }

  // Fila de total general
  const depTotal = productos.reduce((s, p) => s + p.colores.reduce((cs, c) => cs + c.stockDeposito, 0), 0);
  const sedTotal = productos.reduce((s, p) => s + p.colores.reduce((cs, c) => cs + c.stockSede, 0), 0);
  rows.push([
    { content: 'TOTAL GENERAL', colSpan: 4, styles: { fontStyle: 'bold', fillColor: NAVY, textColor: [255, 255, 255] } },
    { content: depTotal.toString(), styles: { fontStyle: 'bold', fillColor: NAVY, textColor: [255, 255, 255] } },
    { content: sedTotal.toString(), styles: { fontStyle: 'bold', fillColor: NAVY, textColor: [255, 255, 255] } },
    { content: (depTotal + sedTotal).toString(), styles: { fontStyle: 'bold', fillColor: NAVY, textColor: [255, 255, 255] } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Producto / SKU', 'Categoría', 'Color', 'SKU Color', 'Depósito', 'Sede', 'Total']],
    body: rows,
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: [252, 251, 248] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
    },
    willDrawCell: (data: any) => {
      // Colorear la columna Total según stock
      if (data.section === 'body' && data.column.index === 6) {
        const val = parseInt(data.cell.text[0] || '0');
        if (!isNaN(val) && data.cell.styles.fillColor !== NAVY) {
          data.cell.styles.textColor = stockColor(val);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ── Footer ─────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, doc.internal.pageSize.getHeight() - 10, W, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('KARGO CRM — Stock Catálogo', 14, doc.internal.pageSize.getHeight() - 3.5);
    doc.setTextColor(...LIGHT);
    doc.text(`Página ${i} de ${pageCount}`, W - 14, doc.internal.pageSize.getHeight() - 3.5, { align: 'right' });
  }

  doc.save(`Kargo_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
}
