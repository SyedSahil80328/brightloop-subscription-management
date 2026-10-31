# Brightloop – Subscription Management System

A full-stack subscription management platform built as part of **Odoo x Make-A-Ton 9.0 Hackathon 2026**.

Brightloop helps businesses manage customers, products, subscription plans, subscription lifecycles, and password recovery through a centralized web application.

## Features

### Authentication & User Management
- Customer registration and login.
- Secure password hashing using bcrypt.
- JWT-based authentication.
- Role-based access control for Admin, Staff, and Customer.
- Customers can manage their own subscriptions.
- Email-based password recovery using Gmail SMTP.
- Secure, time-limited, single-use password reset tokens.

### Product Management
- Create, view, update, and deactivate products.
- Store product name, type, sales price, cost price, and notes.
- Manage product variants and price adjustments.

### Subscription Plan Management
- Create and view subscription plans.
- Support daily, weekly, monthly, and yearly billing intervals.
- Configure minimum quantities and availability dates.
- Configure early closure, pause, renewal, and expiry options.

### Subscription Management
- Create subscriptions for registered customers.
- Customer self-service subscription creation.
- Automatically associate subscription plans with their products.
- Generate unique subscription numbers.
- Track subscription status:
  - Draft
  - Quotation
  - Confirmed
  - Active
  - Paused
  - Closed
- Enforce valid lifecycle transitions.
- Restrict customers to viewing their own subscriptions.

### Upcoming / Remaining Features
- Quotation template management.
- Automated invoice generation and billing.
- Invoice confirmation, cancellation, and payment tracking.
- Discount management.
- Dashboard analytics and revenue summaries.
- Advanced subscription renewal handling.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt |
| Email | Nodemailer, Gmail SMTP |
| API Testing | Thunder Client |
| Version Control | Git, GitHub |

## Project Structure

```text
brightloop-subscription-management/
│
├── backend/
│   ├── config/
│   ├── controllers/
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

Enter into psql (if installed):

```terminal
psql -U postgres
```

It'll prompt you to enter password, enter it and press enter.

Create a database:

```sql
CREATE DATABASE brightloop_db;
\q
```

Execute the database schema:

```bash
psql -U postgres -d brightloop_db -f backend/db/schema.sql
```

The schema includes the core tables for users, products, variants, plans, subscriptions, quotations, invoices, discounts, and payments, including password reset tokens.

### 3. Configure Backend Environment

Navigate to the backend:

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
- Use the App Password for `SMTP_PASS`.
- Never commit your `.env` file.

### 4. Create the Admin Account

Run the admin creation script:

```bash
node db/createAdmin.js
```

Use the configured admin credentials to sign in.

### 5. Start the Backend

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

### 6. Configure and Start the Frontend

Open another terminal:

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

## API Endpoints

Base URL: `http://localhost:5000/api`

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
| GET | `/plans` | List plans |
| POST | `/plans` | Create plan |

### Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/subscriptions` | List accessible subscriptions |
| GET | `/subscriptions/customers` | List customers |
| POST | `/subscriptions` | Create subscription |
| PATCH | `/subscriptions/:id/status` | Update subscription status |

Protected endpoints require a JWT Bearer token in the Authorization header.

## Security Considerations

- Passwords are hashed using bcrypt.
- API access is protected using JWT authentication.
- Role-based authorization restricts privileged operations.
- Customers can access only their own subscriptions.
- Password reset tokens are cryptographically generated and stored as hashes.
- Password reset links expire and can only be used once.
- Environment secrets are excluded from version control.

## Database Design

Brightloop uses PostgreSQL with relational tables, primary keys, foreign keys, constraints, and indexes.

Money-related fields use fixed-precision numeric types to avoid floating-point storage inaccuracies.

## Development Status

The application is being developed incrementally, prioritizing functional business workflows, data integrity, security, and a clean user interface.

---

**Developed for Odoo x Make-A-Ton 9.0 – Kochi, 2026.**