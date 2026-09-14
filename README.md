# DTS GYM — Frontend Setup Guide
## React 18 + Redux + Tailwind CSS v3

---

## 1. Prerequisites
- Node.js 18+
- npm 9+
- .NET backend running at `https://localhost:44305`

---

## 2. Install & Run

```bash
# Extract the zip, then:
cd dts-gym-frontend

# Install dependencies (React, Redux, Tailwind, etc.)
npm install

# Start development server
npm start
```

App opens at → **http://localhost:3000**

---

## 3. Build for Production

```bash
npm run build
```

Output goes to `/build` folder — deploy to any static host (Nginx, IIS, Vercel, etc.)

---

## 4. Backend URL

Edit `src/constants.js` to match your backend:

```js
export const API_BASE_URL = 'https://localhost:44305';  // ← change if needed
```

---

## 5. Tech Stack

| Layer         | Tech                          |
|---------------|-------------------------------|
| UI Framework  | React 18                      |
| State         | Redux 5 + Redux Thunk 3       |
| Routing       | React Router DOM 6            |
| Styling       | **Tailwind CSS 3** (no plain CSS files) |
| HTTP          | Axios                         |
| Auth          | JWT via localStorage + X-User-Id header |
| Fonts         | Bebas Neue · DM Sans · Space Mono (Google Fonts) |

---

## 6. Folder Structure

```
src/
├── assets/
│   └── global.css          ← Tailwind directives + CSS variables (dark/light)
├── actions/
│   └── index.js            ← All Redux thunk actions
├── reducers/
│   └── index.js            ← Root reducer (auth, ui, 15 entity slices)
├── services/
│   └── api.js              ← All Axios API calls
├── utils/
│   └── index.js            ← formatDate, formatCurrency, sumBy, etc.
├── constants.js            ← API_BASE_URL, ROLES, ACTIONS
├── store.js                ← Redux store
├── App.js                  ← Routes + role-based protection
├── index.js                ← Entry point
│
├── components/
│   ├── Modal.jsx           ← Reusable modal dialog
│   ├── Badge.jsx           ← Status badge (active/inactive/pending)
│   ├── Toast.jsx           ← Toast notification container
│   ├── DataTable.jsx       ← Generic sortable data table
│   └── admin/
│       ├── AdminLayout.jsx ← App shell (Sidebar + Topbar + Outlet)
│       ├── Sidebar.jsx     ← Role-aware navigation sidebar
│       └── Topbar.jsx      ← Header with theme toggle + user info
│
└── pages/
    ├── Login.jsx           ← Email + password login (JWT)
    ├── Dashboard.jsx       ← Admin dashboard (stats, sessions, quick actions)
    ├── MemberDashboard.jsx ← Member view (my schedule, subscription, attendance)
    ├── TrainerDashboard.jsx← Trainer view (sessions, members, timeslots)
    ├── Members.jsx         ← Full CRUD + card/table view
    ├── Trainers.jsx        ← Full CRUD + card/table view
    ├── Users.jsx           ← User management with role filter
    ├── Plans.jsx           ← Membership plan cards (Silver/Gold/Platinum/VIP)
    ├── Subscriptions.jsx   ← Subscription management
    ├── Payments.jsx        ← Cash/Card payment modal + receipt generator
    ├── Schedules.jsx       ← Session booking + status management
    ├── Timeslots.jsx       ← Time slot configuration
    ├── Assignments.jsx     ← Trainer ↔ Member assignments
    ├── Workouts.jsx        ← Non-equipment exercise entries
    ├── RFID.jsx            ← RFID tap simulator + card registration
    ├── Equipment.jsx       ← Equipment CRUD + live floor tracking
    └── Reports.jsx         ← Dynamic reports with CSV export
```

---

## 7. User Roles & Access

| Role    | ID | Access |
|---------|----|--------|
| Admin   | 1  | Full access — all pages, all CRUD |
| Trainer | 2  | Dashboard, Timeslots, Schedules, Workouts, Equipment live |
| Member  | 3  | Dashboard (own data), Schedules, Workouts, Equipment live |

**Test credentials** (from `gym_management_test_data.sql`):
- Admin:   `sara.admin@gym.com` / `Password@123`
- Trainer: `amal@gym.com` / `Password@123`
- Member:  `dinesh@gmail.com` / `Password@123`

---

## 8. Dark / Light Mode

- Toggle button in the **top-right Topbar** (sun/moon icon)
- Preference saved to `localStorage` as `dts_theme`
- All colors driven by CSS variables in `global.css`:
  - Dark: `--gym-bg: #0a0a0c`, accent `#e8ff47` (yellow-green)
  - Light: `--gym-bg: #f0f2f5`, accent `#2563eb` (blue)

---

## 9. RFID Live Tracking Flow

1. Member arrives → taps RFID at entrance → **Attendance** recorded
2. Member goes to equipment → taps RFID at machine → **EquipmentUsageLog** starts
3. Admin/Trainer see live status in **Equipment → Live Floor** tab (auto-refreshes every 30s)
4. Member leaves equipment → second tap → log closes with duration

---

## 10. Reports & CSV Export

Go to **Reports** page → select report type → apply filters → click **Export CSV**.

Report types: Members · Trainers · Users · Attendance · Subscriptions · Payments

All support:
- Full-text search across all fields
- Date range filter (from / to)
- Print (browser print dialog)
- CSV download

---

*DTS GYM Management System — v3.0 | Built with React + Redux + Tailwind CSS*
