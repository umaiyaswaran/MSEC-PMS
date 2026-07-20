const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'pdfs');

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

const formatCurrency = (amount) => {
  return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
};

const generatePurchaseOrderPDF = async (po) => {
  ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, `PO-${po.poNumber}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text('MSEC PMS', { align: 'center' });
    doc.fontSize(14).text('PURCHASE ORDER', { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text(`PO Number: ${po.poNumber}`, { align: 'right' });
    doc.text(`Date: ${formatDate(po.createdAt)}`, { align: 'right' });
    doc.text(`Status: ${po.status}`, { align: 'right' });
    doc.text(`Type: ${po.type || 'SAMPLE'}`, { align: 'right' });
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
    doc.text('Order Details');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Intent Reference: ${po.intent?.intentId || 'N/A'}`);
    if (po.intent?.title) doc.text(`Intent Title: ${po.intent.title}`);
    doc.text(`Supplier: ${po.supplier?.companyName || 'N/A'}`);
    if (po.supplier?.contactPerson) doc.text(`Contact Person: ${po.supplier.contactPerson}`);
    if (po.supplier?.email) doc.text(`Supplier Email: ${po.supplier.email}`);
    if (po.supplier?.phone) doc.text(`Supplier Phone: ${po.supplier.phone}`);
    doc.text(`Payment Terms: ${po.paymentTerms || 'N/A'}`);
    doc.text(`Delivery Date: ${formatDate(po.deliveryDate)}`);
    doc.moveDown(1);

    if (po.deliveryAddress) {
      doc.fontSize(12).font('Helvetica-Bold').text('Delivery Address');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      const addr = po.deliveryAddress;
      const addrParts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
      doc.text(addrParts.join(', ') || 'N/A');
      doc.moveDown(1);
    }

    doc.fontSize(12).font('Helvetica-Bold').text('Items');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const colWidths = [200, 60, 100, 100];
    const headers = ['Item', 'Qty', 'Unit Price', 'Total'];

    doc.fontSize(10).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
      xPos += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(10);
    let yPos = tableTop + 25;
    (po.items || []).forEach((item) => {
      xPos = 50;
      doc.text(item.name || '', xPos, yPos, { width: colWidths[0], align: 'left' });
      doc.text(String(item.quantity || 0), xPos + colWidths[0], yPos, { width: colWidths[1], align: 'right' });
      doc.text(formatCurrency(item.unitPrice), xPos + colWidths[0] + colWidths[1], yPos, { width: colWidths[2], align: 'right' });
      doc.text(formatCurrency(item.totalPrice || (item.quantity * item.unitPrice)), xPos + colWidths[0] + colWidths[1] + colWidths[2], yPos, { width: colWidths[3], align: 'right' });
      yPos += 20;
    });

    doc.moveTo(50, yPos).lineTo(540, yPos).stroke();
    yPos += 15;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Subtotal:', 350, yPos, { width: 100, align: 'right' });
    doc.text(formatCurrency(po.totalAmount), 450, yPos, { width: 90, align: 'right' });
    yPos += 18;
    doc.text('Tax:', 350, yPos, { width: 100, align: 'right' });
    doc.text(formatCurrency(po.tax), 450, yPos, { width: 90, align: 'right' });
    yPos += 18;
    doc.fontSize(12).text('Grand Total:', 350, yPos, { width: 100, align: 'right' });
    doc.text(formatCurrency(po.grandTotal), 450, yPos, { width: 90, align: 'right' });
    yPos += 25;

    if (po.specialInstructions) {
      doc.fontSize(12).font('Helvetica-Bold').text('Special Instructions');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(po.specialInstructions);
      doc.moveDown(1);
    }

    doc.fontSize(12).font('Helvetica-Bold').text('Terms and Conditions');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    doc.text('1. This Purchase Order is subject to the supplier\'s acceptance and confirmation.');
    doc.text('2. All items must be delivered in accordance with the specifications and quantities listed above.');
    doc.text('3. Payment will be made within the agreed payment terms upon receipt of a valid invoice.');
    doc.text('4. Any discrepancies in delivery must be reported within 48 hours of receipt.');
    doc.text('5. The supplier is responsible for ensuring all items meet quality standards.');
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Authorized Signature (Procurement Officer)', 50, doc.y, { width: 200 });
    doc.text('Accepted by (Supplier)', 320, doc.y - 15, { width: 200 });
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(9);
    doc.text('Signature: ________________________', 50, doc.y, { width: 200 });
    doc.text('Signature: ________________________', 320, doc.y - 12, { width: 200 });
    doc.text('Date: ____________________________', 50, doc.y + 5, { width: 200 });
    doc.text('Date: ____________________________', 320, doc.y - 7, { width: 200 });

    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text('Generated by MSEC PMS', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

const generateIntentPDF = async (intent) => {
  ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, `Intent-${intent.intentId}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(24).font('Helvetica-Bold').text('PROCUREMENT INTENT REQUEST', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text(`Intent ID: ${intent.intentId}`, { align: 'right' });
    doc.text(`Date: ${formatDate(intent.createdAt)}`, { align: 'right' });
    doc.text(`Status: ${intent.status}`, { align: 'right' });
    doc.text(`Priority: ${intent.priority}`, { align: 'right' });
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
    doc.text('General Information');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Title: ${intent.title}`);
    doc.text(`Description: ${intent.description}`);
    doc.text(`Requester: ${intent.requester?.name || 'N/A'}`);
    doc.text(`Department: ${intent.department?.name || 'N/A'}`);
    doc.text(`Estimated Cost: ${formatCurrency(intent.estimatedCost)}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Items Requested');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const colWidths = [150, 180, 60, 80, 70];
    const headers = ['Name', 'Description', 'Qty', 'Unit', 'Est. Price'];

    doc.fontSize(10).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
      xPos += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(10);
    let yPos = tableTop + 25;
    (intent.items || []).forEach((item) => {
      xPos = 50;
      doc.text(item.name || '', xPos, yPos, { width: colWidths[0], align: 'left' });
      doc.text(item.description || '', xPos + colWidths[0], yPos, { width: colWidths[1], align: 'left' });
      doc.text(String(item.quantity || 0), xPos + colWidths[0] + colWidths[1], yPos, { width: colWidths[2], align: 'right' });
      doc.text(item.unit || '', xPos + colWidths[0] + colWidths[1] + colWidths[2], yPos, { width: colWidths[3], align: 'right' });
      doc.text(formatCurrency(item.estimatedUnitPrice), xPos + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, { width: colWidths[4], align: 'right' });
      yPos += 20;
    });

    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('Approval Status');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Manager Approval: ${intent.managerApproval?.status || 'PENDING'}`);
    if (intent.managerApproval?.remarks) doc.text(`  Remarks: ${intent.managerApproval.remarks}`);
    doc.text(`Admin Approval: ${intent.adminApproval?.status || 'PENDING'}`);
    if (intent.adminApproval?.remarks) doc.text(`  Remarks: ${intent.adminApproval.remarks}`);

    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text('Generated by MSEC PMS', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

const generateDeliveryReportPDF = async (delivery) => {
  ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, `Delivery-${delivery.deliveryNumber}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(24).font('Helvetica-Bold').text('DELIVERY REPORT', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text(`Delivery Number: ${delivery.deliveryNumber}`, { align: 'right' });
    doc.text(`Date: ${formatDate(delivery.createdAt)}`, { align: 'right' });
    doc.text(`Status: ${delivery.status}`, { align: 'right' });
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
    doc.text('Delivery Details');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Intent Reference: ${delivery.intent?.intentId || 'N/A'}`);
    doc.text(`Purchase Order: ${delivery.purchaseOrder?.poNumber || 'N/A'}`);
    doc.text(`Supplier: ${delivery.supplier?.companyName || 'N/A'}`);
    doc.text(`Delivery Type: ${delivery.type || 'N/A'}`);
    doc.text(`Delivery Date: ${formatDate(delivery.deliveryDate)}`);
    doc.text(`Received By: ${delivery.receivedBy?.name || 'N/A'}`);
    doc.text(`Inspected By: ${delivery.inspectedBy?.name || 'N/A'}`);
    doc.text(`Condition: ${delivery.condition || 'N/A'}`);
    doc.text(`Remarks: ${delivery.remarks || 'N/A'}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Items');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const colWidths = [150, 100, 100, 100, 90];
    const headers = ['Item', 'Ordered', 'Delivered', 'Status', 'Notes'];

    doc.fontSize(10).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
      xPos += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

    doc.font('Helvetica').fontSize(10);
    let yPos = tableTop + 25;
    (delivery.items || []).forEach((item) => {
      xPos = 50;
      doc.text(item.name || '', xPos, yPos, { width: colWidths[0], align: 'left' });
      doc.text(String(item.orderedQuantity || 0), xPos + colWidths[0], yPos, { width: colWidths[1], align: 'right' });
      doc.text(String(item.deliveredQuantity || 0), xPos + colWidths[0] + colWidths[1], yPos, { width: colWidths[2], align: 'right' });
      doc.text(item.status || '', xPos + colWidths[0] + colWidths[1] + colWidths[2], yPos, { width: colWidths[3], align: 'right' });
      doc.text(item.notes || '', xPos + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, { width: colWidths[4], align: 'right' });
      yPos += 20;
    });

    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text('Generated by MSEC PMS', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

const generateInvoicePDF = async (invoice) => {
  ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, `Invoice-${invoice.invoiceNumber}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, { align: 'right' });
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, { align: 'right' });
    doc.text(`Status: ${invoice.status}`, { align: 'right' });
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
    doc.text('Invoice Details');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Supplier: ${invoice.supplier?.companyName || 'N/A'}`);
    doc.text(`Purchase Order: ${invoice.purchaseOrder?.poNumber || 'N/A'}`);
    doc.text(`Intent Reference: ${invoice.intent?.intentId || 'N/A'}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Payment Summary');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    const summaryTop = doc.y;
    doc.text('Amount:', 350, summaryTop, { width: 100, align: 'right' });
    doc.text(formatCurrency(invoice.amount), 450, summaryTop, { width: 90, align: 'right' });
    doc.text('Tax:', 350, summaryTop + 18, { width: 100, align: 'right' });
    doc.text(formatCurrency(invoice.tax), 450, summaryTop + 18, { width: 90, align: 'right' });
    doc.moveTo(350, summaryTop + 40).lineTo(540, summaryTop + 40).stroke();
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', 350, summaryTop + 50, { width: 100, align: 'right' });
    doc.text(formatCurrency(invoice.totalAmount), 450, summaryTop + 50, { width: 90, align: 'right' });

    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Status');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Payment Status: ${invoice.paymentStatus || 'UNPAID'}`);
    doc.text(`Payment Method: ${invoice.paymentMethod || 'N/A'}`);
    doc.text(`Payment Reference: ${invoice.paymentReference || 'N/A'}`);
    doc.text(`Payment Date: ${formatDate(invoice.paymentDate)}`);

    if (invoice.verifiedBy) {
      doc.moveDown(0.5);
      doc.text(`Verified By: ${invoice.verifiedBy?.name || 'N/A'}`);
      doc.text(`Verified At: ${formatDate(invoice.verifiedAt)}`);
    }

    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text('Generated by MSEC PMS', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

module.exports = {
  generatePurchaseOrderPDF,
  generateIntentPDF,
  generateDeliveryReportPDF,
  generateInvoicePDF,
};
