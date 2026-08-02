// PDF utilities — uses jsPDF + html2canvas loaded via CDN in index.html
export async function elementToPdf(node, filename = "document.pdf") {
  if (!window.html2canvas || !window.jspdf) {
    alert("PDF library still loading, please try again.");
    return;
  }

  // Ensure the node is in the DOM and visible
  if (!node.isConnected) {
    document.body.appendChild(node);
  }

  // Capture the node with high quality
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

  // A4 dimensions in mm
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Margins: 15mm each side
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  // Calculate image dimensions to fit within margins
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = imgWidth / imgHeight;

  let finalWidth = maxWidth;
  let finalHeight = finalWidth / ratio;

  // If the image is too tall, fit height and adjust width
  if (finalHeight > maxHeight) {
    finalHeight = maxHeight;
    finalWidth = finalHeight * ratio;
  }

  // Center the image horizontally (optional)
  const xOffset = (pageWidth - finalWidth) / 2;
  const yOffset = margin;

  // Add first page
  pdf.addImage(imgData, "PNG", xOffset, yOffset, finalWidth, finalHeight);

  // If content exceeds one page, split into multiple pages
  const totalHeight = imgHeight * (finalWidth / imgWidth); // actual height in mm
  let remainingHeight = totalHeight - (maxHeight);

  let currentY = yOffset + finalHeight; // after first page

  // We need to crop the canvas vertically for subsequent pages
  // Simplest: we add the same image but with negative y position
  // using jsPDF's addImage with y negative? Actually we need to create a new canvas for each page
  // Instead, we'll use a loop with a virtual crop.

  // Alternative: re-capture the node with a scroll offset – not ideal.
  // Better: use html2canvas to capture whole node, then split the image.

  // We'll use a different approach: if the image is too tall, we'll scale it to fit one page.
  // But the user likely wants all content, so we'll scale to fit width and if height > pageHeight, we'll split.

  // Since we already scaled to fit within maxWidth and maxHeight, if the image is still taller than maxHeight,
  // we need to split. However, we already set finalHeight to fit within maxHeight if it was too tall.
  // That means we are scaling the entire image to fit one page. This may make text small.

  // To keep text readable, we should not scale down to fit one page if content is large.
  // Better: keep the image at original resolution and scroll/crop.

  // Let's use a simpler approach: if the image height is too large, we'll scale to fit width (maxWidth)
  // and then split into multiple pages using the same image but with y offset.

  // Redo the logic:

  // Recalculate without fitting to page height initially.
  const scaledWidth = maxWidth;
  const scaledHeight = scaledWidth / ratio;

  // Now, if scaledHeight > maxHeight, we need multiple pages.
  // We'll add the image in chunks.

  // We'll use the original canvas and crop it page by page.
  // But html2canvas gives us a full canvas, we can use drawImage with source cropping.

  // However, jsPDF's addImage accepts image data, not canvas.
  // We can create a temporary canvas for each page and draw the source crop.

  // Let's do that.

  const srcCanvas = canvas;
  const srcWidth = srcCanvas.width;
  const srcHeight = srcCanvas.height;

  const pagePixelsHeight = srcHeight * (maxHeight / scaledHeight);

  let offsetY = 0;
  let pageCount = 0;

  while (offsetY < srcHeight) {
    if (pageCount > 0) {
      pdf.addPage();
    }

    const cropHeight = Math.min(pagePixelsHeight, srcHeight - offsetY);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = srcWidth;
    tempCanvas.height = cropHeight;
    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(srcCanvas, 0, offsetY, srcWidth, cropHeight, 0, 0, srcWidth, cropHeight);

    const imgDataPage = tempCanvas.toDataURL("image/png");
    const pageImgWidth = maxWidth;
    const pageImgHeight = (cropHeight / srcWidth) * maxWidth;

    pdf.addImage(imgDataPage, "PNG", xOffset, yOffset, pageImgWidth, pageImgHeight);

    offsetY += cropHeight;
    pageCount++;
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
