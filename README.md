# Procurement Intent Request System

A web-based procurement management application designed to automate and simplify the purchasing process within an organization.

## Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS, React Router, Recharts
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas (Mongoose)
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer + Cloudinary
- **Email:** Nodemailer
- **Reports:** PDFKit, ExcelJS

## Features

- Role-based access control (User, Manager, Admin)
- Intent request creation and tracking
- Manager approval workflow
- Quotation collection and comparison
- Purchase Order generation (Sample & Original)
- Delivery tracking (Partial & Full)
- Invoice management and payment tracking
- Comprehensive reporting with export (PDF, Excel, CSV)
- Real-time notifications
- Audit logging
- Dark/Light theme

## Project Structure

```
procurement-intent-request-system/
├── client/          # React Frontend (Vite)
├── server/          # Express.js Backend
├── docs/            # Documentation
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB Atlas account
- Cloudinary account (for file uploads)
- Gmail or SMTP server (for emails)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install all dependencies
npm run install-all

# Or install separately
cd server && npm install
cd ../client && npm install
```

3. Configure environment variables:

```bash
# Edit server/.env with your credentials
```

### Running the Application

```bash
# Run both server and client
npm run dev

# Run server only
cd server && npm run dev

# Run client only
cd client && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Default Admin Credentials

After first run, create an admin user via the API or register through the UI and update the role in MongoDB.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/intents | Create intent |
| GET | /api/intents | List intents |
| PUT | /api/intents/:id/submit | Submit for approval |
| POST | /api/quotations | Upload quotation |
| PUT | /api/quotations/:id/select | Select supplier |
| POST | /api/purchase-orders | Create PO |
| PUT | /api/purchase-orders/:id/approve | Approve PO |
| POST | /api/deliveries | Create delivery |
| POST | /api/invoices | Upload invoice |
| GET | /api/reports/procurement | Procurement report |
| GET | /api/dashboard/admin | Admin dashboard |

## Workflow

1. **User** creates an Intent Request
2. **Manager** reviews and approves/rejects
3. **Manager** collects quotations from suppliers
4. **Manager** compares quotations and selects supplier
5. **Manager** generates Sample PO
6. **Admin** approves PO → Original PO generated
7. **Admin** tracks deliveries (partial/full)
8. **Admin** uploads invoices and tracks payments
9. **System** generates reports and analytics

## License

MIT
