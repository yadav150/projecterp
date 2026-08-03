// PDF utilities — uses jsPDF + html2canvas loaded via CDN in index.html

// ---------- PDF Download (Hybrid: image + multi‑page) ----------
export async function elementToPdf(node, filename = "document.pdf") {
  if (!window.html2canvas || !window.jspdf) {
    alert("PDF library still loading, please try again.");
    return;
  }

  // Ensure the node is in the DOM for accurate capture
  if (!node.isConnected) {
    document.body.appendChild(node);
  }

  // Capture the node as a high‑resolution image
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
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const scaleRatio = maxWidth / imgWidth;
  const scaledHeight = imgHeight * scaleRatio;

  // If content fits in one page, add it; else split across pages
  const totalPages = Math.max(1, Math.ceil(scaledHeight / maxHeight));

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();

    const offsetY = i * (maxHeight / scaleRatio);
    const cropHeight = Math.min(imgHeight - offsetY, maxHeight / scaleRatio);

    // Crop the canvas for this page
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

// ---------- Print (Opens a new window with the node and triggers print) ----------
export function printNode(node) {
  const printWin = window.open("", "print", "width=900,height=700");
  if (!printWin) {
    alert("Please allow popups for this site to print.");
    return;
  }

  // Collect styles from the main document
  let styles = "";
  try {
    const sheets = document.styleSheets;
    for (let sheet of sheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let rule of rules) {
            styles += rule.cssText + "\n";
          }
        }
      } catch (e) {
        // Cross‑origin stylesheets may throw – skip them
      }
    }
  } catch (e) {
    console.warn("Could not gather all styles", e);
  }

  // Build the print document with the cloned node
  const clone = node.cloneNode(true);
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Print</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          /* Reset and base */
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            margin: 0;
            padding: 10px;
            background: #fff;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 8mm;
          }
          .section { break-inside: avoid; page-break-inside: avoid; }
          .print-area { visibility: visible !important; }
          .no-print { display: none !important; }

          /* Include all app styles */
          ${styles}
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);

  printWin.document.close();

  // Allow fonts and layout to render before printing
  setTimeout(() => {
    printWin.focus();
    printWin.print();
    // The user closes the window manually after printing.
  }, 600);
}
