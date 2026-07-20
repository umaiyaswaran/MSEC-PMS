const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"MSEC PMS" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };
  const info = await transporter.sendMail(mailOptions);
  return info;
};

const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to MSEC PMS</h2>
      <p>Dear ${user.name},</p>
      <p>Your account has been created successfully. You can now log in and start using the system.</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/login"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Log In
        </a>
      </p>
      <p style="color: #6b7280; margin-top: 30px; font-size: 12px;">
        If you did not create this account, please ignore this email.
      </p>
    </div>
  `;
  return sendEmail({
    to: user.email,
    subject: 'Welcome to MSEC PMS',
    html,
  });
};

const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Password Reset Request</h2>
      <p>Dear ${user.name},</p>
      <p>You requested a password reset. Click the button below to set a new password. This link expires in 10 minutes.</p>
      <p style="margin-top: 20px;">
        <a href="${resetUrl}"
           style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
      </p>
      <p style="color: #6b7280; margin-top: 30px; font-size: 12px;">
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;
  return sendEmail({
    to: user.email,
    subject: 'Password Reset - Procurement System',
    html,
  });
};

const sendApprovalNotification = async (intent, approver) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Approval Required</h2>
      <p>Dear ${approver.name},</p>
      <p>A new procurement intent requires your approval.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Intent ID:</strong> ${intent.intentId}</p>
        <p><strong>Title:</strong> ${intent.title}</p>
        <p><strong>Estimated Cost:</strong> $${intent.estimatedCost?.toLocaleString()}</p>
        <p><strong>Priority:</strong> ${intent.priority}</p>
      </div>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/intents/${intent._id}"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Review Intent
        </a>
      </p>
    </div>
  `;
  return sendEmail({
    to: approver.email,
    subject: `Approval Required - ${intent.intentId}`,
    html,
  });
};

const sendRejectionNotification = async (intent, rejector, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Intent Rejected</h2>
      <p>Dear Requester,</p>
      <p>Your procurement intent <strong>${intent.intentId}</strong> has been rejected.</p>
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626;">
        <p><strong>Intent ID:</strong> ${intent.intentId}</p>
        <p><strong>Title:</strong> ${intent.title}</p>
        <p><strong>Rejected by:</strong> ${rejector.name}</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
      </div>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/intents/${intent._id}"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Details
        </a>
      </p>
    </div>
  `;
  return sendEmail({
    to: intent.requester?.email,
    subject: `Intent Rejected - ${intent.intentId}`,
    html,
  });
};

const sendQuotationReminder = async (manager, intent) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d97706;">Quotation Reminder</h2>
      <p>Dear ${manager.name},</p>
      <p>This is a reminder that quotation responses are pending for the following procurement intent.</p>
      <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #d97706;">
        <p><strong>Intent ID:</strong> ${intent.intentId}</p>
        <p><strong>Title:</strong> ${intent.title}</p>
        <p><strong>Estimated Cost:</strong> $${intent.estimatedCost?.toLocaleString()}</p>
        <p><strong>Priority:</strong> ${intent.priority}</p>
      </div>
      <p>Please review and follow up on outstanding quotations at your earliest convenience.</p>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/intents/${intent._id}/quotations"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Quotations
        </a>
      </p>
    </div>
  `;
  return sendEmail({
    to: manager.email,
    subject: `Quotation Reminder - ${intent.intentId}`,
    html,
  });
};

const sendPOCreatedNotification = async (intent, recipient) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Purchase Order Created</h2>
      <p>Dear ${recipient.name},</p>
      <p>A purchase order has been created for the following procurement intent.</p>
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb;">
        <p><strong>Intent ID:</strong> ${intent.intentId}</p>
        <p><strong>Title:</strong> ${intent.title}</p>
        <p><strong>Estimated Cost:</strong> $${intent.estimatedCost?.toLocaleString()}</p>
      </div>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/intents/${intent._id}"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Purchase Order
        </a>
      </p>
    </div>
  `;
  return sendEmail({
    to: recipient.email,
    subject: `Purchase Order Created - ${intent.intentId}`,
    html,
  });
};

const sendDeliveryUpdate = async (intent, status) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Delivery Update</h2>
      <p>Dear User,</p>
      <p>There has been an update to the delivery for procurement intent <strong>${intent.intentId}</strong>.</p>
      <div style="background-color: #f5f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #7c3aed;">
        <p><strong>Intent ID:</strong> ${intent.intentId}</p>
        <p><strong>Title:</strong> ${intent.title}</p>
        <p><strong>Status:</strong> ${status}</p>
      </div>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/intents/${intent._id}/delivery"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Delivery
        </a>
      </p>
    </div>
  `;
  return sendEmail({
    to: intent.requester?.email,
    subject: `Delivery Update - ${intent.intentId}`,
    html,
  });
};

const sendInvoiceNotification = async (invoice, recipient) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Invoice Received</h2>
      <p>Dear ${recipient.name},</p>
      <p>An invoice has been submitted for the following purchase order.</p>
      <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #059669;">
        <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Amount:</strong> $${invoice.totalAmount?.toLocaleString()}</p>
        <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
      </div>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/invoices/${invoice._id}"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View Invoice
        </a>
      </p>
    </div>
  `;
  return sendEmail({
    to: recipient.email,
    subject: `Invoice Received - ${invoice.invoiceNumber}`,
    html,
  });
};

const sendSamplePOToAdmin = async (po, intent, adminUser, pdfPath) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Sample Purchase Order - Review Required</h2>
      <p>Dear ${adminUser.name},</p>
      <p>A new Sample Purchase Order has been generated and requires your review. Please find the PDF attached.</p>
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb;">
        <p><strong>PO Number:</strong> ${po.poNumber}</p>
        <p><strong>Intent ID:</strong> ${intent.intentId}</p>
        <p><strong>Intent Title:</strong> ${intent.title}</p>
        <p><strong>Supplier:</strong> ${po.supplier?.companyName || 'N/A'}</p>
        <p><strong>Total Amount:</strong> $${po.totalAmount?.toLocaleString()}</p>
        <p><strong>Status:</strong> ${po.status}</p>
      </div>
      <p>Please review the attached Sample PO and approve or reject it.</p>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL}/admin/purchase-orders/${po._id}/approve"
           style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Review Purchase Order
        </a>
      </p>
      <p style="color: #6b7280; margin-top: 30px; font-size: 12px;">
        This is an automated notification from MSEC PMS.
      </p>
    </div>
  `;

  const transporter = createTransporter();
  const mailOptions = {
    from: `"MSEC PMS" <${process.env.EMAIL_USER}>`,
    to: adminUser.email,
    subject: `Sample PO ${po.poNumber} - Review Required`,
    html,
    attachments: pdfPath ? [{
      filename: `Sample-PO-${po.poNumber}.pdf`,
      path: pdfPath,
    }] : [],
  };
  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = {
  sendEmail,
  createTransporter,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendApprovalNotification,
  sendRejectionNotification,
  sendQuotationReminder,
  sendPOCreatedNotification,
  sendDeliveryUpdate,
  sendInvoiceNotification,
  sendSamplePOToAdmin,
};
