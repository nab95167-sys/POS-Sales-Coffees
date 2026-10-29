# ☕ Coffee Shop Point of Sale (POS) System

A modern, responsive, and production-ready Coffee Shop Point of Sale (POS) System built for high-volume café operations, featuring a warm aesthetic inspired by Starbucks & Blue Bottle Coffee.

![Coffee Shop POS](https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80)

---

## 🌟 Key Features

- **Point of Sale (POS)**: Fast touch UI, category sidebar, variant picker (Small/Medium/Large), extra toppings, hold/resume orders, split bill, coupons, multiple payment options (Cash, Card, ABA KHQR, Bakong, Wing, ACLEDA).
- **Kitchen Display System (KDS)**: Live order stream with live timers and status management (`Pending` → `Preparing` → `Ready` → `Completed`).
- **Table Management**: Visual café floor plan, live table statuses (Available, Occupied, Reserved), move and merge tables.
- **Inventory & Waste Control**: Real-time stock tracking for raw ingredients, purchase orders, stock adjustments, and low stock warnings.
- **Loyalty & Customer CRM**: Tiered memberships, points accrual & redemption, birthday discounts, complete order history.
- **Employee & Shift Management**: Staff directory, role-based permissions (Admin, Manager, Cashier, Barista), shift logs.
- **Analytics & Reports**: Sales dashboards, Profit & Loss summaries, top-selling items, export to PDF, Excel, and CSV.
- **Receipt Engine**: Thermal receipt preview with logo, ABA KHQR code integration, and dual Khmer/English language support.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Glassmorphism & Coffee Color System (`#6F4E37`, `#F5F5DC`, `#C68E17`, `#3E2723`)
- **State & Data**: TanStack Query + React Context
- **UI & Motion**: Framer Motion + Lucide React + Recharts
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js + Express.js + TypeScript
- **Database & ORM**: PostgreSQL + Prisma ORM
- **Security**: JWT Dual-Token Authentication, Argon2/Bcrypt password hashing, Role-Based Access Control (RBAC), Rate limiting.

### Deployment & Ops
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx Reverse Proxy

---

## 📁 Project Structure

```
coffee-shop-pos/
├── docker-compose.yml
├── README.md
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── kds/
    │   │   ├── pos/
    │   │   ├── tables/
    │   │   └── ui/
    │   ├── context/
    │   ├── pages/
    │   ├── services/
    │   ├── types/
    │   ├── App.tsx
    │   ├── index.css
    │   └── main.tsx
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js >= 18
- PostgreSQL database (or Docker)

### 1. Backend Setup
```bash
cd server
npm install
cp .env.example .env    
npx prisma db push
npx prisma db seed
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

---

## 🐳 Docker Deployment

To launch the full stack environment (PostgreSQL + API + Client UI) in containers:

```bash
docker-compose up --build -d
```

Access the POS application at `http://localhost:80` (or `http://localhost:5173`).

---

## 👥 Demo Staff Credentials
    
| Role | Email | Password |
|---|---|---|
| **Admin** | admin@coffeepos.com | Admin123! |
| **Manager** | manager@coffeepos.com | Manager123! |
| **Cashier** | cashier@coffeepos.com | Cashier123! |
| **Barista** | barista@coffeepos.com | Barista123! |

---

## 📄 License
MIT License. Built for modern café operations.
