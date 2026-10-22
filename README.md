<div align="center">

# 🛠️ Srikrishna Seva Niketan — Admin Panel

**The back-office dashboard** for Srikrishna Seva Niketan — manage website
content, operational requests, and the full **multi-location Staff Management**
system from one elegant, role-aware workspace.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

</div>

---

## 📖 Overview

A single-page React admin app that talks to the
[Backend API](https://github.com/ulmind-com/Srikrishna-Seva-Niketan-Backend).
Every screen is **permission-gated** and operational data is **branch-scoped**:
a branch manager sees only their location, a super-admin controls everything.

### ✨ Features

- 🔐 **Auth + RBAC** — JWT login, nav & actions gated by effective permissions.
- 🏢 **Staff Management (multi-location)**
  - **Branches** — offices/locations.
  - **Staff Register** — nurses/aayas/attendants with photo, signature & ID proof + **printable ID cards**.
  - **Customers** — home / nursing-home / hospital clients.
  - **Assignments** — staff↔customer daily shifts (notifies on assign).
  - **Payments & Expenses** — income/expense tracking.
  - **Reports** — Profit & Loss, Distribution, Customer Payments, Daily vacancy.
- 📝 **Website content** — services, categories, blogs, videos, testimonials, FAQs, equipment, careers, about page, SEO.
- 📥 **Requests** — bookings, rentals, applications, contact & IC enquiries.
- 👥 **System** — users (with branch assignment), roles, notifications, activity logs.

---

## 🧱 Tech stack

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix primitives)
- **TanStack Query** (server state) + **React Router** (routing)
- **React Hook Form** (forms) + **Axios** (HTTP)

### 🧩 Config-driven CRUD

Most list/detail screens are **declarative**. A resource is described once in
`src/config/resources/<name>.config.tsx` (columns, form fields, filters,
permission key) and rendered by the shared `ResourceView`. Adding a CRUD module
is usually: **one config file + one route + one nav entry** — no bespoke page.

---

## 🚀 Quick start

> **Prerequisites:** Node 18+ and the backend API running (locally or deployed).

```bash
# 1. Clone
git clone https://github.com/ulmind-com/Srikrishna-Seva-Niketan-Admin.git
cd Srikrishna-Seva-Niketan-Admin

# 2. Environment (NEVER commit .env)
cp .env.example .env
#    → set VITE_API_BASE_URL to your backend (include /api/v1)

# 3. Install & run (http://localhost:5173)
npm install
npm run dev
```

Log in with the backend's bootstrap super-admin (`FIRST_ADMIN_EMAIL` /
`FIRST_ADMIN_PASSWORD`), or any user created under **Users**.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (HMR) on :5173 |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b --noEmit` |

---

## 🔑 Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend base URL **including** `/api/v1` (e.g. `http://localhost:8000/api/v1`) |
| `VITE_APP_NAME` | App name shown in the UI |

See [`.env.example`](.env.example). **Never commit `.env`.**

---

## 🗂️ Project structure

```
src/
├── config/
│   ├── navigation.ts            # Sidebar sections & permission gating
│   └── resources/*.config.tsx   # Declarative CRUD module definitions
├── components/
│   ├── resource/                # ResourceView / ResourceForm (config engine)
│   ├── ui/                      # shadcn/ui primitives
│   ├── layout/ · common/        # App shell & shared widgets
├── contexts/                    # Auth & Theme providers (hasPermission lives here)
├── hooks/                       # useCrud, useNotifications, …
├── pages/                       # Custom pages (reports, ID card, dashboard, …)
├── services/                    # API client, endpoints, per-resource services
├── routes/                      # Route table + ProtectedRoute
└── types/                       # Shared TS models mirroring the backend
```

---

## 🚢 Deployment

Static SPA — build with `npm run build` and serve `dist/` from any static host
(Vercel/Netlify/Render). Set `VITE_API_BASE_URL` at build time. A `vercel.json`
is included for SPA routing fallbacks.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). CI (lint + typecheck + build) runs on
every push/PR — [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

> ⚠️ **Never commit secrets or `.env`.** Only `.env.example` is tracked.

---

<div align="center">
<sub>© Srikrishna Seva Niketan · built & maintained by <b>ulmind</b>. All rights reserved.</sub>
</div>
