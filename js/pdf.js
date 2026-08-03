// PDF utilities — uses jsPDF + html2canvas loaded via CDN in index.html
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

  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const scaleRatio = maxWidth / imgWidth;
  const scaledHeight = imgHeight * scaleRatio;

  const totalPages = Math.max(1, Math.ceil(scaledHeight / maxHeight));

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();

    const offsetY = i * (maxHeight / scaleRatio);
    const cropHeight = Math.min(imgHeight - offsetY, maxHeight / scaleRatio);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = imgWidth;
    pageCanvas.height = cropHeight;
    const ctx = pageCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, offsetY, imgWidth, cropHeight, 0, 0, imgWidth, cropHeight);

    const pageImgData = pageCanvas.toDataURL("image/png");
    const pageImgWidth = maxWidth;
    const pageImgHeight = (cropHeight / imgWidth) * maxWidth;
    pdf.addImage(pageImgData, "PNG", margin, margin, pageImgWidth, pageImgHeight);
  }

  pdf.save(filename);
}

export function printNode(node) {
  const printWin = window.open("", "print", "width=900,height=700");
  const styles = Array.from(document.styleSheets).map(s => {
    try { return Array.from(s.cssRules).map(r => r.cssText).join("\n"); } catch { return ""; }
  }).join("\n");
  printWin.document.write(`
    <html><head><title>Print</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>${styles}
      body { margin: 0; padding: 20px; background:#fff; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      @page { size: A4; margin: 15mm; }
      .section { break-inside: avoid; }
    </style>
    </head><body>${node.outerHTML}</body></html>
  `);
  printWin.document.close();
  setTimeout(() => { printWin.focus(); printWin.print(); printWin.close(); }, 400);
}
