
import { LoomConfig, Transaction, Batch } from '../types';

// Accessing via window globals as defined in index.html
declare var jspdf: any;

/**
 * Helper function to draw the stylized WarpManager logo icon using jsPDF primitives.
 */
const drawLogoIcon = (doc: any, x: number, y: number, size: number) => {
  const scale = size / 100;
  
  // Save current state
  doc.saveGraphicsState?.();

  // Main Dark Circle Badge
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.circle(x + 45 * scale, y + 50 * scale, 40 * scale, 'F');
  
  // Motion Streaks
  doc.setLineWidth(0.5);
  doc.setDrawColor(56, 189, 248); // #38BDF8
  doc.line(x + 55 * scale, y + 35 * scale, x + 90 * scale, y + 28 * scale);
  doc.line(x + 60 * scale, y + 45 * scale, x + 95 * scale, y + 40 * scale);
  doc.line(x + 60 * scale, y + 65 * scale, x + 92 * scale, y + 72 * scale);
  
  doc.setDrawColor(14, 165, 233); // #0EA5E9
  doc.line(x + 62 * scale, y + 55 * scale, x + 85 * scale, y + 55 * scale);

  // Stylized 'W'
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.line(x + 22 * scale, y + 35 * scale, x + 34 * scale, y + 70 * scale);
  doc.line(x + 34 * scale, y + 70 * scale, x + 46 * scale, y + 45 * scale);
  doc.line(x + 46 * scale, y + 45 * scale, x + 58 * scale, y + 70 * scale);
  doc.line(x + 58 * scale, y + 70 * scale, x + 70 * scale, y + 35 * scale);

  // Detail lines on W
  doc.setDrawColor(56, 189, 248);
  doc.line(x + 68 * scale, y + 35 * scale, x + 82 * scale, y + 35 * scale);

  // Restore state
  doc.restoreGraphicsState?.();
};

/**
 * Enhanced Programmatic PDF Generation Service
 * Generates comprehensive, multi-page industrial reports for manufacturing batches.
 * Features automated page breaking, headers on every page, and full material auditing.
 */
export const generateLoomReportPDF = async (
  loomId: string,
  batch: Batch,
  transactions: Transaction[]
) => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  
  // Theme configuration
  const primaryColor = [79, 70, 229]; // Indigo-600
  const secondaryColor = [30, 41, 59]; // Slate-800
  const tertiaryColor = [100, 116, 139]; // Slate-500
  const successColor = [5, 150, 105]; // Emerald-600
  const accentColor = [245, 158, 11]; // Amber-500

  // 1. Data Preparation
  // Filter all transactions linked to this specific batch from the database
  const batchTransactions = transactions
    .filter(t => t.batchNumber === batch.batchNumber && t.loomId === loomId)
    .sort((a, b) => a.timestamp - b.timestamp); // Chronological order for audit log

  // 2. Report Header (Page 1 Only)
  doc.setFillColor(...secondaryColor);
  doc.rect(0, 0, 210, 50, 'F');
  
  // Draw Logo Icon
  drawLogoIcon(doc, 15, 10, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text("WarpManager", 36, 23);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text("INDUSTRIAL CLOUD ERP | BATCH PERFORMANCE AUDIT", 36, 31);

  // Status Badge
  const statusX = 150;
  const statusY = 15;
  const isCompleted = batch.status === 'completed';
  doc.setFillColor(...(isCompleted ? successColor : accentColor));
  doc.roundedRect(statusX, statusY, 45, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(batch.status.toUpperCase(), statusX + 22.5, statusY + 8, { align: 'center' });

  // 3. Batch Metadata Info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`LOOM UNIT: ${loomId}`, 15, 42);
  doc.text(`BATCH NUMBER: #${batch.batchNumber}`, 70, 42);
  doc.text(`REPORT DATE: ${new Date().toLocaleString('en-GB')}`, 130, 42);

  // 4. Production Summary Table
  doc.setTextColor(...secondaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("1. PRODUCTION SUMMARY", 15, 65);

  const prodSummaryData = [
    ["Target Quantity", `${batch.target} Sarees`, "Batch Progress", `${Math.round((batch.produced / batch.target) * 100)}%`],
    ["Produced Total", `${batch.produced} Sarees`, "Remaining Balance", `${batch.remaining} Sarees`],
    ["Batch Start", new Date(batch.startTime).toLocaleString('en-GB'), "Completion Time", batch.endTime ? new Date(batch.endTime).toLocaleString('en-GB') : "IN PROGRESS"]
  ];

  (doc as any).autoTable({
    startY: 70,
    body: prodSummaryData,
    theme: 'plain',
    styles: { cellPadding: 3, fontSize: 10, textColor: secondaryColor },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: tertiaryColor, cellWidth: 40 },
      1: { fontStyle: 'bold', cellWidth: 55 },
      2: { fontStyle: 'bold', textColor: tertiaryColor, cellWidth: 40 },
      3: { fontStyle: 'bold', cellWidth: 55 },
    }
  });

  // 5. Material Inventory Flow Table
  const finalY1 = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(14);
  doc.text("2. RAW MATERIAL INVENTORY FLOW (KG)", 15, finalY1 + 15);
  
  const inventoryHeaders = [["MATERIAL", "OPENING", "RECEIVED (+)", "CONSUMED (-)", "RETURNED (-)", "CLOSING BAL"]];
  const inventoryRows = [
    [
      "CONE YARN", 
      batch.openingCone.toFixed(2),
      batch.receivedCone.toFixed(2), 
      batch.consumedCone.toFixed(2),
      batch.returnedCone.toFixed(2),
      batch.closingCone.toFixed(2)
    ],
    [
      "JARIGAI", 
      batch.openingJarigai.toFixed(2),
      batch.receivedJarigai.toFixed(2), 
      batch.consumedJarigai.toFixed(2), 
      batch.returnedJarigai.toFixed(2),
      batch.closingJarigai.toFixed(2)
    ]
  ];

  (doc as any).autoTable({
    startY: finalY1 + 20,
    head: inventoryHeaders,
    body: inventoryRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], fontStyle: 'bold', halign: 'center' },
    styles: { halign: 'center', fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 35 },
      5: { fontStyle: 'bold', textColor: successColor }
    }
  });

  // 6. Comprehensive Transaction Log (Multi-page)
  const finalY2 = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(14);
  doc.text("3. FULL TRANSACTION AUDIT TRAIL", 15, finalY2 + 15);

  const logHeaders = [["DATE & TIME", "TYPE", "QTY/WT", "UNIT", "REFERENCE NOTES"]];
  const logRows = batchTransactions.map(tx => {
    const isProduction = tx.type === 'PRODUCTION';
    const typeLabel = tx.type.replace('_', ' ');
    const displayValue = isProduction ? tx.value : (tx.value >= 0 ? '+' : '') + tx.value.toFixed(2);
    const unit = isProduction ? 'PCS' : 'KG';
    
    return [
      new Date(tx.timestamp).toLocaleString('en-GB', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      typeLabel,
      displayValue,
      unit,
      tx.note || '--'
    ];
  });

  (doc as any).autoTable({
    startY: finalY2 + 20,
    head: logHeaders,
    body: logRows.length > 0 ? logRows : [["--", "NO DATA", "0.00", "--", "No records found for this batch cycle."]],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { fontStyle: 'bold', cellWidth: 35 },
      2: { fontStyle: 'bold', halign: 'right', cellWidth: 20 },
      3: { cellWidth: 15 },
      4: { fontStyle: 'italic', textColor: tertiaryColor }
    },
    // Auto-page breaking settings
    margin: { top: 20, bottom: 20 },
    showHead: 'everyPage', // Ensure headers appear on every continuation page
    didDrawPage: function(data: any) {
      // Add Footer on every page
      const str = "Page " + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.setTextColor(...tertiaryColor);
      
      // Left side: Page number
      doc.text(str, data.settings.margin.left, pageHeight - 10);
      
      // Right side: Disclaimer and attribution
      doc.text(
        "CONFIDENTIAL INDUSTRIAL REPORT - WarpManager CLOUD ERP", 
        pageSize.width - data.settings.margin.right, 
        pageHeight - 10, 
        { align: 'right' }
      );
      doc.text(
        "Powered by Elankathir Arulmani", 
        pageSize.width - data.settings.margin.right, 
        pageHeight - 6, 
        { align: 'right' }
      );
    }
  });

  // 7. Save and Download
  const filename = `Batch_Report_Loom${loomId}_B${batch.batchNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
