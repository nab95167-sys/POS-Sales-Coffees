# ☕ Aura Coffee Shop POS System

A full-stack **Coffee Shop Point of Sale (POS) & Operations Management System** built for high-volume café operations with a Luxury Obsidian & Gold UI, bilingual **English / Khmer** support, native **SQLite (`node:sqlite`)** server-side persistence, and enforced security controls.

---

## 🌟 Key Features

- **Point of Sale (POS) Register**: Touch-friendly menu grid with live category filtering, size/sugar/ice/espresso/addon modifiers, SKU barcode scanning, hold/resume orders, split payments (Cash, Card, ABA KHQR, Bakong, Wing, ACLEDA), promo code redemption, and manager PIN overrides.
- **Kitchen Display System (KDS)**: Real-time kitchen queue backed by server-persisted orders (`Pending` → `Preparing` → `Ready` → `Completed`).
- **Table Floor Plan**: Visual table layout (`Available`, `Occupied`, `Reserved`, `Cleaning`) synced with active POS dine-in tickets.
- **Inventory & Recipes**: Real-time ingredient stock levels with ACID server-side deduction on checkout, low-stock alerts, and stock adjustments.
- **Loyalty & Customer CRM**: VIP member directory, loyalty points accrual/redemption, and purchase history.
- **Staff, Attendance & Granular RBAC**: Staff directory, clock-in/clock-out logs, per-role permission matrix (`ADMIN`, `MANAGER`, `CASHIER`, `BARISTA`), and custom user permission overrides.
- **Finance, Petty Cash & X/Z Shift Reports**: Open/close drawer shifts, cash count reconciliation, petty cash expense tracking, 7-day sales charts, and CSV exports.
- **Thermal Receipt & Cup Labels**: 80mm thermal receipt preview (with KHQR) and 40x30mm drink cup sticker printing.
- **Telegram Alerts & Security Audit Center**: Encrypted backend Telegram notifications and immutable server-side security audit logs.

---

## 🛠️ Technology Stack

### Frontend (`client/`)
- **Framework**: React 18 + TypeScript + Vite 5
- **Styling & UI**: Tailwind CSS + Lucide React + Framer Motion
- **Data & Charts**: TanStack Query + React Router + Recharts + Zod + `qrcode.react`

### Backend (`server/`)
- **Runtime**: Node.js >= 24 (uses built-in native `node:sqlite`) + Express.js + TypeScript
- **Security**: `bcryptjs`, `jsonwebtoken`, `HttpOnly` / `SameSite=Strict` cookies, SHA-256 refresh token rotation, `helmet`, `cors`, `express-rate-limit`, AES-256-GCM secret encryption

### Deployment (`docker-compose.yml`, `client/nginx.conf`)
- **Containerization**: Docker (`node:24-alpine`, `nginx:alpine`) + Docker Compose
- **Persistence**: Mounted SQLite volume (`/app/data/pos.db`)

---

## 📁 Project Structure

```text
coffee-shop-pos/
├── docker-compose.yml
├── README.md
├── SECURITY.md
├── start-pos.bat
├── server/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── config/
│   │   ├── data/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   └── tests/
│       └── securityAndApi.test.mjs
└── client/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        ├── services/
        └── types/
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js >= 24** (required for native `node:sqlite`)

### Windows One-Click Launcher
Double-click or run `start-pos.bat` from the repository root to start both the Express API (`http://localhost:5000`) and Vite UI (`http://localhost:5173`).

### Manual CLI Setup

1. **Backend API & Tests**
   ```bash
   cd server
   npm install
   cp .env.example .env
   npm run build
   npm test
   npm run dev
   ```
   *(On first boot, `server` automatically creates `./data/pos.db`, seeds the catalog/staff/settings, and generates local dev signing secrets if none are set in `.env`.)*

2. **Frontend Client**
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser. (Vite proxies `/api` requests to `http://localhost:5000`.)

---

## 🐳 Docker Deployment

Production mode requires 32+ character cryptographic values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CONFIG_ENCRYPTION_KEY`:

```bash
export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export JWT_REFRESH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
export CONFIG_ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

docker-compose up --build -d
```

Access the application at `http://localhost`.

---

## 👥 Default Seeded Accounts (Fresh Database Only)

Defined in [`server/src/db/seed.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/db/seed.ts) (change or override via `SEED_*` env vars before production use):

| Role | Email | Default Password | Default PIN |
|---|---|---|---|
| **ADMIN** | `admin@coffeepos.com` | `Admin@2026!` | `1234` |
| **MANAGER** | `manager@coffeepos.com` | `Manager@2026!` | `1234` |
| **CASHIER** | `cashier@coffeepos.com` | `Cashier@2026!` | `1111` |
| **BARISTA** | `barista@coffeepos.com` | `Barista@2026!` | `2222` |

---

## 📄 License
MIT License. Built for modern café operations.
