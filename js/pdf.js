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

export function printNode(node) {
  const printWin = window.open("", "print", "width=900,height=700");
  const styles = Array.from(document.styleSheets).map(s => {
    try { return Array.from(s.cssRules).map(r => r.cssText).join("\n"); } catch { return ""; }
  }).join("\n");
  printWin.document.write(`
    <html><head><title>Print</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>${styles}
      body { margin: 0; padding: 20px; background:#fff; font-family: 'Inter', sans-serif; }
      @page { size: A4; margin: 15mm; }
      .section { break-inside: avoid; }
    </style>
    </head><body>${node.outerHTML}</body></html>
  `);
  printWin.document.close();
  setTimeout(() => { printWin.focus(); printWin.print(); printWin.close(); }, 400);
}
