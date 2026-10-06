# DANIX POS - Inventory, Invoice, Order & Delivery Management System

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-emerald)]()
[![Framework](https://img.shields.io/badge/Stack-React%2018%20%7C%20Vite%206%20%7C%20TypeScript%20%7C%20Tailwind-blue)]()
[![Firebase](https://img.shields.io/badge/Backend-Firebase%20Auth%20%7C%20Cloud%20Firestore-orange)]()

A high-performance, web-based commercial POS, Inventory, Order Fulfillment, Invoicing, and Delivery Management System crafted specifically for **DANIX.LK - Trusted Online Shopping** (Akmeemana, Galle, Sri Lanka).

---

## 🚀 Features

- **Dashboard**: Real-time sales KPIs (Today's Sales, Total Revenue, Pending Orders, Deliveries, Low Stock Alerts), Quick Launchpad, and Live Activity Audit Stream.
- **Product Management**: Full catalog with SKU uniqueness, CODE128 barcode generator (`jsbarcode`), real-time profit margin indicator, category filters, and image upload abstraction.
- **Inventory & Stock Movements**: Complete stock movement ledger (`stock_in`, `sale`, `return`, `adjustment`, `damaged`) with previous/new stock history, atomic stock adjustments, and negative stock prevention.
- **Customer CRM**: Customer directory with Sri Lankan phone validation (`07X XXX XXXX`), purchase history, lifetime value tracking, and one-click WhatsApp chat link.
- **Order Management & POS Terminal**: Fast checkout with barcode scanner input, live stock checks, custom discounts, delivery fee options, and automatic atomic inventory deduction upon confirmation.
- **Atomic Invoice Generation**: Guaranteed unique sequential invoice numbering (`INV-2026-000001`) via atomic Firestore counter transactions.
- **A4 Printable Invoices**: Pixel-perfect printable invoices with Danix LK branding, QR code verification (`qrcode`), bank account transfer details, and print/download options.
- **Delivery Management**: Multi-courier delivery tracking (Domex, Koombiyo, Prompt Xpress, Fardar, Certis Lanka, In-House) with live status pipeline (Pending → Ready → Dispatched → In Transit → Delivered).
- **Delivery Label Printing**: Courier shipping labels formatted for 4x6 inch thermal printers and A4 sticker sheets with barcode, large COD collection box, recipient details, and sender info.
- **Reports & Analytics**: Daily/Weekly/Monthly sales, Inventory valuation, Low stock reports, Courier performance, and Profit & Loss (Revenue - COGS - Expenses = Net Profit) with one-click CSV export.
- **Operational Expenses**: Admin-only ledger for tracking packaging, rent, utilities, courier fees, and marketing.
- **User & Staff Management**: Admin-only control panel for managing staff and admin accounts, activation toggles, and role assignments.
- **Activity Logs**: Immutable system-wide audit trail recording every critical action.
- **Business Settings**: Store profile preconfigured for Danix LK (Galle, Sri Lanka, LKR Rs. currency, invoice prefixes, terms).

---

## 🔐 Role-Based Access Control

| Feature / Module | Super Admin | Counter Staff |
| :--- | :---: | :---: |
| POS & Order Creation | ✅ | ✅ |
| Products (View / Add / Edit) | ✅ | ✅ |
| Product Deletion | ✅ | ❌ |
| Customers & CRM | ✅ | ✅ |
| Invoices & A4 Printing | ✅ | ✅ |
| Deliveries & Label Printing | ✅ | ✅ |
| Stock Movements (View) | ✅ | ✅ |
| Stock Adjustments | ✅ | ✅ (Logged) |
| Financial Reports & P&L | ✅ | ❌ |
| Expenses Management | ✅ | ❌ |
| User & Staff Management | ✅ | ❌ |
| System Activity Logs | ✅ | ❌ |
| Store Business Settings | ✅ | ❌ |

---

## 🛠️ Project Structure

```
Danix POS/
├── public/
│   ├── logo.jpg                 # Official Danix LK Brand Logo
│   └── favicon.ico
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── AppLayout.tsx    # Responsive shell with sidebar & navbar
│   │       ├── Navbar.tsx       # Header with notification alerts & user menu
│   │       └── Sidebar.tsx      # Role-filtered drawer navigation
│   ├── context/
│   │   ├── AuthContext.tsx      # Firebase Auth state & role provider
│   │   └── NotificationContext.tsx # Toast notification system with audio feedback
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── config.ts        # Singleton Firebase initialization & emulators
│   │   │   ├── auth.ts          # Auth helpers (login, logout, password reset)
│   │   │   ├── firestore.ts     # Firestore typed converters & atomic transactions
│   │   │   └── storage.ts       # Product image upload abstraction
│   │   ├── dataService.ts       # Firestore CRUD & LocalStorage fallback service
│   │   ├── dataStore.ts         # Reactive hooks for POS entities
│   │   └── mockData.ts          # Initial seed dataset with Ceylon products
│   ├── pages/
│   │   ├── activity/            # ActivityLogsPage
│   │   ├── auth/                # LoginPage, ForgotPasswordPage
│   │   ├── customers/           # CustomersPage, CustomerModal, CustomerDetailModal
│   │   ├── dashboard/           # DashboardPage with real-time KPIs
│   │   ├── deliveries/          # DeliveriesPage, DeliveryModal, DeliveryLabelModal, PrintableDeliveryLabel
│   │   ├── expenses/            # ExpensesPage, ExpenseModal
│   │   ├── inventory/           # InventoryPage, StockAdjustmentModal
│   │   ├── invoices/            # InvoicesPage, InvoiceViewModal, PrintableInvoice
│   │   ├── orders/              # OrdersPage, CreateOrderPage, OrderDetailModal
│   │   ├── products/            # ProductsPage, ProductModal, BarcodeModal
│   │   ├── reports/             # ReportsPage with CSV export
│   │   ├── settings/            # SettingsPage with Danix prefilled business info
│   │   └── users/               # UsersPage, UserModal
│   ├── types/
│   │   └── index.ts             # Complete TypeScript interfaces
│   ├── App.tsx                  # Main router with authentication & role guards
│   ├── index.css                # Tailwind CSS & @media print styles
│   └── main.tsx                 # React DOM entrypoint
├── .env.example                 # Environment variables template
├── .env                         # Local environment configuration
├── firebase.json                # Firebase configuration & emulator ports
├── firestore.indexes.json       # Composite query indexes
├── firestore.rules              # Strict Firestore Security Rules
├── package.json
├── tailwind.config.js           # Danix brand color tokens (orange & navy)
├── tsconfig.json
└── vite.config.ts
```

---

## ⚡ Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase Environment
Copy `.env.example` to `.env` and fill in your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_USE_FIREBASE_EMULATOR=false
```

*Note: If no Firebase credentials are provided yet, Danix POS automatically operates in **Interactive Simulation Mode** using persistent browser storage, allowing full evaluation without any errors!*

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🔒 Deploying Firebase Security Rules & Indexes

### Deploy Firestore Rules
```bash
npx firebase deploy --only firestore:rules
```

### Deploy Composite Indexes
```bash
npx firebase deploy --only firestore:indexes
```

---

## 🧪 Firebase Emulator Suite (Optional)
To test locally with Firebase Auth and Firestore emulators:
1. Set `VITE_USE_FIREBASE_EMULATOR=true` in `.env`
2. Start the Firebase emulators:
```bash
npx firebase emulators:start
```
- Auth Emulator: `http://localhost:9099`
- Firestore Emulator: `http://localhost:8080`
- Emulator UI: `http://localhost:4000`

---

## 🏢 Business Identity & Defaults
- **Business**: Danix.lk - Trusted Online Shopping
- **Location**: Akmeemana, Galle, Sri Lanka, 80054
- **Hotline**: 076 252 4671
- **Email**: danixlkstore@gmail.com
- **Currency**: LKR / Rs.
- **Invoice Prefix**: `INV-2026-`
- **Default Delivery Fee**: Rs. 350.00
