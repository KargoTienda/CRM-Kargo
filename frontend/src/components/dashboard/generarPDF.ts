import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DatosInforme {
  mes: string;
  año: number;
  facturadoAFIP: number;
  facturadoReal: number;
  ingresosBrutos: number;
  costos: number;
  ganancia: number;
  pagoCris: number;
  gananciaKargo: number;
  sueldoCU: number;
  ventas: number;
  canceladas: number;
  devoluciones: number;
  productos: Array<{
    nombre: string;
    unidades: number;
    facturado: number;
    ingresos: number;
    ganancia: number;
    costoCris: number;
  }>;
  mesAnterior?: {
    facturado: number;
    ganancia: number;
  };
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
const fmtPorc = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

// Colores Kargo
const NAVY = [0, 64, 133] as [number, number, number];
const LIGHT_BLUE = [169, 194, 217] as [number, number, number];
const ORANGE = [211, 84, 0] as [number, number, number];
const DARK = [58, 58, 58] as [number, number, number];
const CREAM = [247, 246, 241] as [number, number, number];
const GREEN = [5, 150, 105] as [number, number, number];
const RED = [220, 38, 38] as [number, number, number];

export function generarPDFInversor(datos: DatosInforme) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  // ── Header navy ──────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 38, 'F');

  // Logo K (simulado con texto)
  doc.setFillColor(255, 255, 255);
  doc.setTextColor(0, 64, 133);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('K', 14, 20);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('KARGO', 22, 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...LIGHT_BLUE);
  doc.text('CRM', 22, 25);

  // Título y fecha
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Informe mensual — ${datos.mes} ${datos.año}`, W / 2, 18, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...LIGHT_BLUE);
  doc.text('Resumen financiero para el inversor', W / 2, 26, { align: 'center' });
  doc.text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, W - 14, 26, { align: 'right' });

  y = 48;

  // ── Sección: Facturado ────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('FACTURACIÓN', 14, y);
  y += 5;

  // Card facturado AFIP
  doc.setFillColor(...CREAM);
  doc.roundedRect(14, y, (W - 28) / 2 - 3, 22, 2, 2, 'F');
  doc.setFillColor(...NAVY);
  doc.roundedRect(14, y, (W - 28) / 2 - 3, 5, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('FACTURADO AFIP (incl. devol. y cancel.)', 17, y + 3.5);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(fmt(datos.facturadoAFIP), 17, y + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Total incl. devoluciones y canceladas', 17, y + 19);

  // Card facturado real
  const x2 = 14 + (W - 28) / 2 + 3;
  doc.setFillColor(...CREAM);
  doc.roundedRect(x2, y, (W - 28) / 2 - 3, 22, 2, 2, 'F');
  doc.setFillColor(...ORANGE);
  doc.roundedRect(x2, y, (W - 28) / 2 - 3, 5, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('FACTURADO REAL (solo ventas completadas)', x2 + 3, y + 3.5);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(fmt(datos.facturadoReal), x2 + 3, y + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${datos.ventas} ventas · ${datos.canceladas} cancel. · ${datos.devoluciones} devol.`, x2 + 3, y + 19);

  y += 28;

  // ── Sección: Resumen financiero ───────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('RESUMEN FINANCIERO', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Concepto', 'Importe', '% sobre ingresos brutos']],
    body: [
      ['Ingresos brutos (después de ML)', fmt(datos.ingresosBrutos), '100%'],
      ['Costos (materiales)', fmt(datos.costos), fmtPorc(datos.costos, datos.ingresosBrutos)],
      ['Ganancia del negocio', fmt(datos.ganancia), fmtPorc(datos.ganancia, datos.ingresosBrutos)],
      ['', '', ''],
      ['PAGO INVERSOR (costos + 50% ganancia)', fmt(datos.pagoCris), fmtPorc(datos.pagoCris, datos.ingresosBrutos)],
      ['Ganancia Kargo (50% ganancia)', fmt(datos.gananciaKargo), fmtPorc(datos.gananciaKargo, datos.ingresosBrutos)],
      ['Sueldo por socio (5% ganancia)', fmt(datos.sueldoCU), fmtPorc(datos.sueldoCU, datos.ingresosBrutos)],
    ],
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 249, 246] },
    willDrawCell: (data: any) => {
      if (data.row.index === 4 && data.section === 'body') {
        data.cell.styles.fillColor = [255, 240, 220];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = ORANGE;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Sección: Detalle por producto ─────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('DETALLE POR PRODUCTO', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Producto', 'Uds.', 'Facturado', 'Ingresos', 'Ganancia', 'Pago a Cris']],
    body: datos.productos.map(p => [
      p.nombre,
      p.unidades.toString(),
      fmt(p.facturado),
      fmt(p.ingresos),
      fmt(p.ganancia),
      fmt(p.costoCris),
    ]),
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 249, 246] },
    columnStyles: { 0: { cellWidth: 55 } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Comparativa mes anterior ──────────────────────────
  if (datos.mesAnterior) {
    const crecFact = Math.round(((datos.facturadoReal - datos.mesAnterior.facturado) / datos.mesAnterior.facturado) * 100);
    const crecGan = Math.round(((datos.ganancia - datos.mesAnterior.ganancia) / datos.mesAnterior.ganancia) * 100);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('COMPARATIVA CON MES ANTERIOR', 14, y);
    y += 5;

    doc.setFillColor(...CREAM);
    doc.roundedRect(14, y, W - 28, 16, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(`Facturado real: ${fmt(datos.mesAnterior.facturado)} → ${fmt(datos.facturadoReal)}`, 18, y + 6);
    const colorFact = crecFact >= 0 ? GREEN : RED;
    doc.setTextColor(...colorFact);
    doc.setFont('helvetica', 'bold');
    doc.text(`${crecFact >= 0 ? '▲' : '▼'} ${Math.abs(crecFact)}%`, 100, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(`Ganancia: ${fmt(datos.mesAnterior.ganancia)} → ${fmt(datos.ganancia)}`, 18, y + 12);
    const colorGan = crecGan >= 0 ? GREEN : RED;
    doc.setTextColor(...colorGan);
    doc.setFont('helvetica', 'bold');
    doc.text(`${crecGan >= 0 ? '▲' : '▼'} ${Math.abs(crecGan)}%`, 100, y + 12);

    y += 22;
  }

  // ── Footer ────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, doc.internal.pageSize.getHeight() - 12, W, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('KARGO CRM — Informe Confidencial', 14, doc.internal.pageSize.getHeight() - 5);
    doc.setTextColor(...LIGHT_BLUE);
    doc.text(`Página ${i} de ${pageCount}`, W - 14, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
  }

  doc.save(`Kargo_Informe_${datos.mes}_${datos.año}.pdf`);
}
