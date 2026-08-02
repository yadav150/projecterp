// PDF utilities — uses jsPDF + html2canvas loaded via CDN in index.html
export async function elementToPdf(node, filename = "document.pdf") {
  if (!window.html2canvas || !window.jspdf) {
    alert("PDF library still loading, please try again.");
    return;
  }
  const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 40;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 20;
  pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 40);
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 20;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 40);
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
    </style>
    </head><body>${node.outerHTML}</body></html>
  `);
  printWin.document.close();
  setTimeout(() => { printWin.focus(); printWin.print(); printWin.close(); }, 400);
}
