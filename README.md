# Brightloop – Subscription Management System

A full-stack subscription management platform developed as part of **Odoo x Make-A-Ton 9.0 Hackathon 2026 – Kochi**.

Brightloop enables businesses to manage customers, products, subscription plans, subscription lifecycles, invoices, and payments through a centralized web application. It provides role-based access for administrators, staff, and customers, along with customer self-service capabilities and dashboard analytics.

## Features

### 1. Authentication & User Management
- Customer registration and login.
- Secure password hashing using bcrypt.
- JWT-based authentication.
- Role-based access control for Admin, Staff, and Customer.
- Customer self-service account creation.
- Email-based password recovery using Gmail SMTP.
- Cryptographically generated, hashed, time-limited, single-use password reset tokens.
- Admin account initialization through a dedicated setup script.

### 2. Product Management
- Create, view, update, and deactivate products.
- Store product name, type, sales price, cost price, and notes.
- Manage product variants and price adjustments.
- Restrict product management operations to authorized administrators.

### 3. Subscription Plan Management
- Create and view subscription plans.
- Support daily, weekly, monthly, and yearly billing intervals.
- Configure minimum quantities and availability dates.
- Configure early closure, pause, renewal, and expiry options.
- Associate subscription plans with their respective products.

### 4. Subscription Management
- Create subscriptions for registered customers.
- Customer self-service subscription creation.
- Generate unique subscription numbers.
- Associate subscription plans and products with subscriptions.
- Track subscription lifecycle:
  - Draft
  - Quotation
  - Confirmed
  - Active
  - Paused
  - Closed
- Enforce valid lifecycle transitions.
- Support pausing, resuming, and closing subscriptions.
- Restrict customers to viewing their own subscriptions.

### 5. Invoice Management
- Generate invoices for active subscriptions.
- Automatically calculate billing periods based on subscription intervals.
- Calculate line subtotals, taxes, and invoice totals.
- Store invoice line-item snapshots.
- Generate unique invoice numbers.
- Maintain invoice billing periods and payment due dates.
- Prevent duplicate invoices for the same subscription billing period.
- Support invoice status transitions:
  - Draft
  - Confirmed
  - Paid
  - Cancelled (backend-supported status)
- Automatically advance the subscription's next billing date upon invoice confirmation.
- Restrict customers to viewing their own invoices.

### 6. Payment Management
- Record payments against confirmed invoices.
- Support partial and full payments.
- Support payment methods including UPI, Card, Bank Transfer, and Cash.
- Maintain individual payment transaction records.
- Automatically update invoice outstanding balances.
- Automatically mark invoices as Paid when the full amount is settled.
- Reject invalid payments and overpayments.
- Restrict customers to recording payments against their own invoices.
- Display transaction history with invoice details, payment methods, dates, amounts, and notes.

*Note: Payment recording is implemented as an application-level payment entry workflow. Live payment gateway integration is not included.*

### 7. Dashboard & Analytics
- Role-specific dashboard statistics.
- Active subscription count.
- Total revenue based on recorded payments.
- Outstanding invoice balance.
- Total payment transaction count.
- Customer-specific financial summaries.
- Refreshable dashboard metrics.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt |
| Email | Nodemailer, Gmail SMTP |
| Icons | Lucide React |
| API Testing | Thunder Client |
| Version Control | Git, GitHub |

## Project Structure

```text
brightloop-subscription-management/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── variantController.js
│   │   ├── planController.js
│   │   ├── subscriptionController.js
│   │   ├── invoiceController.js
│   │   ├── paymentController.js
│   │   └── dashboardController.js
│   ├── db/
│   │   ├── schema.sql
│   │   ├── pool.js
│   │   └── createAdmin.js
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   │   └── emailService.js
│   ├── .env
│   ├── app.js
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Plans.jsx
│   │   │   ├── Subscriptions.jsx
│   │   │   ├── Invoices.jsx
│   │   │   └── Payments.jsx
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the application:

- Node.js and npm
- PostgreSQL
- Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd brightloop-subscription-management
```

### 2. Configure PostgreSQL

Enter PostgreSQL using `psql`:

```bash
psql -U postgres
```

It will prompt you to enter your PostgreSQL password.

Create the database:

```sql
CREATE DATABASE brightloop_db;
\q
```

Execute the database schema from the project root:

```bash
psql -U postgres -d brightloop_db -f backend/db/schema.sql
```

The schema initializes the relational database structure, including users, products, variants, taxes, plans, subscriptions, quotation templates, invoices, discounts, payments, and password reset tokens.

### 3. Configure Backend Environment

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` directory:

```env
PORT=5000

DB_USER=postgres
DB_HOST=localhost
DB_NAME=brightloop_db
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_PORT=5432

JWT_SECRET=YOUR_SECURE_RANDOM_SECRET
JWT_EXPIRES_IN=8h

ADMIN_NAME=Administrator
ADMIN_EMAIL=admin@brightloop.com
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_GMAIL_ADDRESS
SMTP_PASS=YOUR_GOOGLE_APP_PASSWORD

FRONTEND_URL=http://localhost:5173
```

**Email Configuration:**

- Enable Google 2-Step Verification.
- Generate a Google App Password.
- Configure the generated App Password as `SMTP_PASS`.
- Never commit your `.env` file or expose application secrets.

### 4. Create the Admin Account

Run the admin initialization script:

```bash
node db/createAdmin.js
```

Use the configured administrator credentials to sign in.

### 5. Start the Backend

From the `backend/` directory:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

### 6. Configure and Start the Frontend

Open another terminal from the project root:

```bash
cd frontend
npm install
npm install react-router-dom lucide-react
npm run dev
```

Open the application:

```text
http://localhost:5173
```

## API Documentation

Base URL: `http://localhost:5000/api`

Protected endpoints require a JWT Bearer token in the Authorization header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register customer |
| POST | `/auth/login` | Authenticate user |
| GET | `/auth/me` | Retrieve current user |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password using token |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | List products |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Deactivate product |

### Product Variants

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products/:productId/variants` | List variants |
| POST | `/products/:productId/variants` | Create variant |
| PUT | `/variants/:id` | Update variant |
| DELETE | `/variants/:id` | Delete variant |

### Subscription Plans

| Method | Endpoint | Description |
|---|---|---|
| GET | `/plans` | List active plans |
| POST | `/plans` | Create subscription plan |

### Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/subscriptions` | List accessible subscriptions |
| GET | `/subscriptions/customers` | List customers |
| POST | `/subscriptions` | Create subscription |
| PATCH | `/subscriptions/:id/status` | Update subscription status |

### Invoices

| Method | Endpoint | Description |
|---|---|---|
| GET | `/invoices` | List accessible invoices |
| GET | `/invoices/:id` | Retrieve invoice details |
| POST | `/invoices/generate/:subscriptionId` | Generate subscription invoice |
| PATCH | `/invoices/:id/status` | Confirm or cancel invoice |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/payments` | Retrieve accessible payment transactions |
| POST | `/payments` | Record invoice payment |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/stats` | Retrieve role-specific dashboard statistics |

## Security & Data Integrity

- Passwords are hashed using bcrypt.
- API endpoints are protected using JWT authentication.
- Role-based authorization restricts privileged operations.
- Customers can access only their own subscriptions, invoices, and payment records.
- Payment ownership is validated before recording transactions.
- Password reset tokens are cryptographically generated and stored as hashes.
- Password reset tokens expire and can only be used once.
- Database transactions protect critical payment and invoice operations.
- Foreign keys, unique constraints, and database checks help maintain data integrity.
- Environment secrets are excluded from version control.

## Database Design

Brightloop uses PostgreSQL with a relational database design.

- Primary keys and foreign keys maintain relationships between entities.
- Unique constraints prevent duplicate records where required.
- Indexes support frequently accessed records.
- Fixed-precision numeric types are used for monetary values.
- Invoice line items preserve billing details at the time of invoice generation.
- Transactions help maintain consistency during invoice confirmation and payment recording.

## Development Status

Brightloop implements the core subscription management workflow, covering authentication, product and plan management, subscription lifecycle management, invoice generation, payment recording, and dashboard analytics.

The application prioritizes functional business workflows, role-based access, data integrity, and a clean user interface.

---

**Developed for Odoo x Make-A-Ton 9.0 – Kochi, 2026.**