// PDF utilities — generates a true digital PDF with selectable text
export async function elementToPdf(node, filename = "document.pdf") {
  if (!window.html2canvas || !window.jspdf) {
    alert("PDF library still loading, please try again.");
    return;
  }
  if (!node.isConnected) {
    document.body.appendChild(node);
  }
  const canvas = await window.html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: node.scrollWidth,
    height: node.scrollHeight,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight
  });
  const textNodes = getTextNodes(node);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const scale = maxWidth / imgWidth;
  const scaledHeight = imgHeight * scale;
  const totalHeight = scaledHeight;
  const pageContentHeight = maxHeight;
  const numPages = Math.max(1, Math.ceil(totalHeight / pageContentHeight));
  for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    if (pageIndex > 0) pdf.addPage();
    const offsetY = pageIndex * (pageContentHeight / scale);
    const cropHeight = Math.min(imgHeight - offsetY, pageContentHeight / scale);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = imgWidth;
    pageCanvas.height = cropHeight;
    const ctx = pageCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, offsetY, imgWidth, cropHeight, 0, 0, imgWidth, cropHeight);
    const imgData = pageCanvas.toDataURL("image/png");
    const pageImgWidth = maxWidth;
    const pageImgHeight = (cropHeight / imgWidth) * maxWidth;
    pdf.addImage(imgData, "PNG", margin, margin, pageImgWidth, pageImgHeight);
    const pageStartY = offsetY;
    const pageEndY = offsetY + cropHeight;
    const pageTextNodes = textNodes.filter(tn => {
      const rect = tn.rect;
      const centerY = rect.top + rect.height / 2;
      return centerY >= pageStartY && centerY <= pageEndY;
    });
    pdf.setTextRenderingMode(3);
    pdf.setFont("helvetica", "normal");
    for (const tn of pageTextNodes) {
      const rect = tn.rect;
      const x = margin + (rect.left / imgWidth) * maxWidth;
      const y = margin + ((rect.top - offsetY) / imgWidth) * maxWidth + (rect.height / imgWidth) * maxWidth;
      const fontSize = (rect.height / imgWidth) * maxWidth * 0.7;
      pdf.setFontSize(Math.max(fontSize, 6));
      pdf.text(tn.text, x, y);
    }
  }
  pdf.save(filename);
}

function getTextNodes(container) {
  const result = [];
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    { acceptNode: function(node) {
        const text = node.textContent.trim();
        if (text.length === 0) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  const containerRect = container.getBoundingClientRect();
  let node;
  while ((node = walker.nextNode())) {
    const range = document.createRange();
    range.selectNode(node);
    const rects = range.getClientRects();
    for (let rect of rects) {
      const relative = {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height
      };
      result.push({ text: node.textContent.trim(), rect: relative });
    }
  }
  return result;
}

/**
 * Enhanced print function with professional receipt styling
 * Includes seal, signature, and stamp for school receipts
 */
export function printNode(node) {
  // If node is a receipt, add professional styling
  const isReceipt = node.classList?.contains('receipt') || node.querySelector?.('.receipt');
  
  const printWin = window.open("", "print", "width=900,height=700");
  const styles = Array.from(document.styleSheets).map(s => {
    try { return Array.from(s.cssRules).map(r => r.cssText).join("\n"); } catch { return ""; }
  }).join("\n");

  // Professional receipt styles
  const receiptStyles = isReceipt ? `
    /* Professional Receipt Styling */
    .receipt {
      font-family: 'Inter', 'Arial', sans-serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 35px;
      background: #ffffff;
      border-radius: 4px;
    }
    .receipt-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .receipt-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .receipt-brand .logo {
      width: 50px;
      height: 50px;
      background: #dc3545;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 24px;
      flex-shrink: 0;
    }
    .receipt-brand .logo svg {
      width: 30px;
      height: 30px;
    }
    .school-name {
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.5px;
    }
    .school-meta {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .receipt-tag {
      text-align: right;
      flex-shrink: 0;
    }
    .receipt-tag h3 {
      font-size: 18px;
      font-weight: 700;
      color: #dc3545;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .r-num {
      font-size: 13px;
      color: #475569;
      font-weight: 500;
    }
    .receipt-section {
      margin-bottom: 16px;
    }
    .receipt-section h4 {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .receipt-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      font-size: 13px;
    }
    .receipt-info-grid > div {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px dashed #f1f5f9;
    }
    .receipt-info-grid .k {
      color: #64748b;
      font-weight: 500;
    }
    .receipt-info-grid .v {
      color: #1e293b;
      font-weight: 600;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 12px 0;
    }
    .receipt-table th {
      background: #f8fafc;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
    }
    .receipt-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .receipt-table .total-row {
      font-weight: 700;
      border-top: 2px solid #1e293b;
    }
    .receipt-table .total-row td {
      border-bottom: none;
    }
    .receipt-foot {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 2px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .receipt-foot .note {
      font-size: 11px;
      color: #94a3b8;
      max-width: 60%;
      line-height: 1.4;
    }
    /* Signature & Seal Section */
    .receipt-foot .seal-sign {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .receipt-foot .seal-container {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 6px;
    }
    .receipt-foot .signature-area {
      text-align: center;
    }
    .receipt-foot .signature-area .line {
      width: 140px;
      border-top: 1.5px solid #1e293b;
      margin: 0 auto 4px auto;
    }
    .receipt-foot .signature-area .label {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .receipt-foot .seal {
      width: 70px;
      height: 70px;
      border: 3px solid #dc3545;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #dc3545;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.3;
      flex-shrink: 0;
      background: #fffaf5;
    }
    .receipt-foot .seal .seal-text {
      font-size: 9px;
      letter-spacing: 0.5px;
    }
    .receipt-foot .seal .seal-star {
      font-size: 14px;
      margin-bottom: 2px;
    }
    .receipt-foot .stamp {
      font-size: 10px;
      color: #dc3545;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 2px solid #dc3545;
      padding: 3px 10px;
      border-radius: 3px;
      transform: rotate(-8deg);
      opacity: 0.9;
    }
    @media print {
      .receipt {
        padding: 30px 25px;
      }
      .receipt-foot .seal {
        border-color: #dc3545 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-foot .stamp {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  ` : '';

  printWin.document.write(`
    <html><head><title>Print</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>${styles}
      body { margin: 0; padding: 20px; background:#f1f5f9; font-family: 'Inter', sans-serif; }
      @page { size: A4; margin: 10mm; }
      @media print {
        body { background: #fff; padding: 0; }
        .no-print { display: none !important; }
      }
      ${receiptStyles}
    </style>
    </head><body>${node.outerHTML}</body></html>
  `);
  
  printWin.document.close();
  setTimeout(() => { 
    printWin.focus(); 
    printWin.print(); 
    printWin.close(); 
  }, 500);
}
