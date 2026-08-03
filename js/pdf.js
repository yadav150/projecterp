// PDF utilities — uses jsPDF + html2canvas for PDF download
// Print function is robust and handles complex layouts

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

  // If content fits in one page, add it; else split
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

// ----- Improved Print Function -----
export function printNode(node) {
  // Clone the node deeply to avoid modifying the original
  const clone = node.cloneNode(true);
  
  // Ensure the clone has all styles applied – we need to re-apply any inline styles
  // but cloneNode copies inline styles automatically.

  // Create a print window
  const printWin = window.open("", "print", "width=900,height=700");
  if (!printWin) {
    alert("Please allow popups for this site to print.");
    return;
  }

  // Collect styles from the main document
  let styles = "";
  try {
    // Get all stylesheets from the main document
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
        // Cross-origin stylesheets may throw; ignore them
      }
    }
  } catch (e) {
    console.warn("Could not gather all styles", e);
  }

  // Build the print document
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Print</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          /* Reset and base */
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            margin: 0;
            padding: 10px;
            background: #fff;
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Ensure no overflow hidden */
          .admission-print-form, .receipt {
            max-width: 100% !important;
            overflow: visible !important;
          }
          /* Force grid to 2 columns for admission forms */
          .admission-print-form .info-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 4px 20px !important;
          }
          /* Print-specific page setup */
          @page {
            size: A4;
            margin: 8mm;
          }
          .section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Include all main styles from the app */
          ${styles}
          /* Additional print optimizations */
          .receipt {
            padding: 20px !important;
            border: none !important;
            box-shadow: none !important;
          }
          .receipt-head {
            border-bottom-width: 2px !important;
          }
          .receipt-table th, .receipt-table td {
            border: 1px solid #e5e7eb !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            visibility: visible !important;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `;

  printWin.document.write(htmlContent);
  printWin.document.close();

  // Wait for fonts and rendering to complete
  setTimeout(() => {
    printWin.focus();
    printWin.print();
    // Close after print dialog (optional, may close before user confirms)
    // We'll let the user close manually.
  }, 600);
}
