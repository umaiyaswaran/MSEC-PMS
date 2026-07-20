const ExcelJS = require('exceljs');

const formatCurrency = (amount) => {
  return amount || 0;
};

const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-US') : 'N/A';
};

const generateProcurementReport = async (data) => {
  const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSEC PMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Procurement Report', {
    properties: { tabColor: { argb: '2563EB' } },
  });

  sheet.columns = [
    { header: 'Intent ID', key: 'intentId', width: 18 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Requester', key: 'requester', width: 20 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Estimated Cost', key: 'estimatedCost', width: 18 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Manager Approval', key: 'managerApproval', width: 18 },
    { header: 'Admin Approval', key: 'adminApproval', width: 18 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  (data.intents || data || []).forEach((intent) => {
    sheet.addRow({
      intentId: intent.intentId,
      title: intent.title,
      requester: intent.requester?.name || intent.requesterName || 'N/A',
      department: intent.department?.name || intent.departmentName || 'N/A',
      estimatedCost: formatCurrency(intent.estimatedCost),
      priority: intent.priority,
      status: intent.status,
      managerApproval: intent.managerApproval?.status || 'PENDING',
      adminApproval: intent.adminApproval?.status || 'PENDING',
      createdAt: formatDate(intent.createdAt),
    });
  });

  const currencyCol = sheet.getColumn('estimatedCost');
  currencyCol.numFmt = '$#,##0.00';

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } },
        };
      });
    }
  });

  sheet.autoFilter = { from: 'A1', to: 'J1' };

  return workbook.xlsx.writeBuffer();
};

const generateSupplierReport = async (data) => {
  const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSEC PMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Supplier Report', {
    properties: { tabColor: { argb: '059669' } },
  });

  sheet.columns = [
    { header: 'Company Name', key: 'companyName', width: 25 },
    { header: 'Contact Person', key: 'contactPerson', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'Country', key: 'country', width: 15 },
    { header: 'Tax ID', key: 'taxId', width: 18 },
    { header: 'Rating', key: 'rating', width: 10 },
    { header: 'Active', key: 'isActive', width: 10 },
    { header: 'Total Quotations', key: 'totalQuotations', width: 18 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '059669' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  (data.suppliers || data || []).forEach((supplier) => {
    sheet.addRow({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      city: supplier.address?.city || 'N/A',
      country: supplier.address?.country || 'N/A',
      taxId: supplier.taxId || 'N/A',
      rating: supplier.rating || 0,
      isActive: supplier.isActive ? 'Yes' : 'No',
      totalQuotations: supplier.totalQuotations || 0,
      createdAt: formatDate(supplier.createdAt),
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } },
        };
      });
    }
  });

  sheet.autoFilter = { from: 'A1', to: 'K1' };

  return workbook.xlsx.writeBuffer();
};

const generateInvoiceReport = async (data) => {
  const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSEC PMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Invoice Report', {
    properties: { tabColor: { argb: 'D97706' } },
  });

  sheet.columns = [
    { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
    { header: 'PO Number', key: 'poNumber', width: 18 },
    { header: 'Intent ID', key: 'intentId', width: 18 },
    { header: 'Supplier', key: 'supplier', width: 25 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Tax', key: 'tax', width: 12 },
    { header: 'Total Amount', key: 'totalAmount', width: 18 },
    { header: 'Invoice Date', key: 'invoiceDate', width: 16 },
    { header: 'Due Date', key: 'dueDate', width: 16 },
    { header: 'Payment Status', key: 'paymentStatus', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment Date', key: 'paymentDate', width: 16 },
    { header: 'Verified By', key: 'verifiedBy', width: 18 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D97706' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  (data.invoices || data || []).forEach((invoice) => {
    sheet.addRow({
      invoiceNumber: invoice.invoiceNumber,
      poNumber: invoice.purchaseOrder?.poNumber || 'N/A',
      intentId: invoice.intent?.intentId || 'N/A',
      supplier: invoice.supplier?.companyName || 'N/A',
      amount: formatCurrency(invoice.amount),
      tax: formatCurrency(invoice.tax),
      totalAmount: formatCurrency(invoice.totalAmount),
      invoiceDate: formatDate(invoice.invoiceDate),
      dueDate: formatDate(invoice.dueDate),
      paymentStatus: invoice.paymentStatus || 'UNPAID',
      status: invoice.status || 'PENDING',
      paymentDate: formatDate(invoice.paymentDate),
      verifiedBy: invoice.verifiedBy?.name || 'N/A',
      createdAt: formatDate(invoice.createdAt),
    });
  });

  ['amount', 'tax', 'totalAmount'].forEach((key) => {
    sheet.getColumn(key).numFmt = '$#,##0.00';
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } },
        };
      });
    }
  });

  sheet.autoFilter = { from: 'A1', to: 'N1' };

  return workbook.xlsx.writeBuffer();
};

const generateDeliveryReport = async (data) => {
  const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MSEC PMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Delivery Report', {
    properties: { tabColor: { argb: '7C3AED' } },
  });

  sheet.columns = [
    { header: 'Delivery Number', key: 'deliveryNumber', width: 20 },
    { header: 'PO Number', key: 'poNumber', width: 18 },
    { header: 'Intent ID', key: 'intentId', width: 18 },
    { header: 'Supplier', key: 'supplier', width: 25 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Delivery Date', key: 'deliveryDate', width: 16 },
    { header: 'Received By', key: 'receivedBy', width: 18 },
    { header: 'Inspected By', key: 'inspectedBy', width: 18 },
    { header: 'Condition', key: 'condition', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Remarks', key: 'remarks', width: 25 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7C3AED' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  (data.deliveries || data || []).forEach((delivery) => {
    sheet.addRow({
      deliveryNumber: delivery.deliveryNumber,
      poNumber: delivery.purchaseOrder?.poNumber || 'N/A',
      intentId: delivery.intent?.intentId || 'N/A',
      supplier: delivery.supplier?.companyName || 'N/A',
      type: delivery.type || 'N/A',
      deliveryDate: formatDate(delivery.deliveryDate),
      receivedBy: delivery.receivedBy?.name || 'N/A',
      inspectedBy: delivery.inspectedBy?.name || 'N/A',
      condition: delivery.condition || 'N/A',
      status: delivery.status || 'PENDING',
      remarks: delivery.remarks || 'N/A',
      createdAt: formatDate(delivery.createdAt),
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } },
        };
      });
    }
  });

  sheet.autoFilter = { from: 'A1', to: 'L1' };

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  generateProcurementReport,
  generateSupplierReport,
  generateInvoiceReport,
  generateDeliveryReport,
};
