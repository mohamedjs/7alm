# 🏪 7alm — Modern Arabic E-commerce Platform

<div align="center">

**7alm** (حلم) is a production-grade, Arabic-first E-commerce platform featuring a high-conversion product landing page funnel and a fully-featured admin dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)

</div>

---

## ✨ Features

### 🛍️ Customer-Facing Landing Pages
- **Dynamic Product Pages** — Each product gets a unique landing page at `/{product-slug}`
- **RTL Arabic Design** — Fully right-to-left layout with Cairo font family
- **Urgency Engine** — Countdown timer + live viewer simulation for conversion optimization
- **Product Gallery** — Image gallery with thumbnail navigation
- **Cash-on-Delivery Checkout** — Streamlined order form with zone-based address selection
- **Mobile-First Responsive** — Optimized for all screen sizes

### 🔧 Admin Dashboard
- **Product Management** — Full CRUD with media upload (images + videos)
- **Order Processing** — State Machine-powered order status management
- **Copy Landing Link** — One-click link generation for product-specific landing pages
- **Dashboard Analytics** — Revenue, pending orders, and approved orders overview
- **Protected Routes** — JWT-based authentication with Supabase

### 🏗️ Architecture Highlights
- **Domain-Driven Design** — Feature-based module organization
- **Repository Pattern** — Isolated data access layer
- **Factory Pattern** — Pluggable shipping provider system (Bosta, ABS, Mylerz)
- **State Machine Pattern** — Deterministic order status transitions
- **RTK Query** — Automatic cache management with tag-based invalidation

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- [Supabase](https://supabase.com/) project

### Installation

```bash
# Clone the repository
git clone https://github.com/mohamedjs/7alm.git
cd 7alm

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with the following:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_IPINFO_TOKEN=your-ipinfo-token
DEFAULT_SHIPPING_PROVIDER=bosta
BOSTA_API_KEY=your-bosta-key
BOSTA_BUSINESS_ID=your-bosta-business-id
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard.

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (landing)/                # Public storefront (RTL, Arabic)
│   │   ├── page.tsx              # Default landing (active product)
│   │   └── [slug]/page.tsx       # Dynamic product landing
│   ├── (admin)/admin/            # Protected admin dashboard
│   │   ├── page.tsx              # Stats overview
│   │   ├── products/             # Product management
│   │   └── orders/               # Order management
│   └── api/                      # Server-side API routes
│
├── components/                   # UI components (presentation only)
│   ├── admin/                    # Admin dashboard components
│   │   └── products/             # ProductList, ProductForm
│   └── landing/                  # Landing page components
│
├── features/                     # Domain-driven feature modules
│   ├── products/                 # Product CRUD (api, hooks, service, repository)
│   ├── orders/                   # Order processing
│   ├── customers/                # Customer management
│   ├── shipping/                 # Shipping factory + providers
│   ├── checkout/                 # Checkout form hooks
│   ├── geo/                      # Zones & geography
│   ├── auth/                     # Authentication
│   └── shared/types.ts           # All shared TypeScript interfaces
│
└── lib/                          # Shared infrastructure
    ├── supabase.ts               # Supabase client
    ├── auth.ts                   # JWT verification
    ├── orderStateMachine.ts      # Order state machine
    └── redux/                    # Redux store & RTK Query config
```

### Architecture Layers

Each feature domain follows a strict layered architecture:

| Layer | File Suffix | Runs On | Purpose |
|---|---|---|---|
| Repository | `*.repository.ts` | Server | Raw Supabase queries |
| Service | `*.service.ts` | Server | Business logic orchestration |
| API | `*.api.ts` | Client | RTK Query endpoint definitions |
| Hooks | `*.hooks.ts` | Client | React hooks for UI logic |

---

## 🎯 Design Patterns

### State Machine (Orders)
Order status transitions are governed by a deterministic state machine:

```
pending → approved → shipped → delivered
  ↓                    ↓          ↓
cancelled           returned   returned
```

### Factory Pattern (Shipping)
Shipping providers are plug-and-play via `IShippingProvider` interface:

```typescript
const provider = shippingFactory.getProvider('bosta');
const result = await provider.createDelivery(input);
```

### Dynamic Landing Pages
Each product generates a unique landing page via its `slug`:
- Admin creates product with slug `mobile-case`
- Landing page is served at `yourdomain.com/mobile-case`
- Server Component fetches product data and renders checkout funnel

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `products` | Product catalog (name, slug, price, gallery, stock) |
| `orders` | Order records with status tracking |
| `customers` | Customer profiles (unique by phone) |
| `addresses` | Delivery addresses linked to zones |
| `zones` | Delivery zones with Arabic/English names |
| `cities` | Cities linked to countries |
| `countries` | Country list |
| `admins` | Admin user IDs (references Supabase Auth) |

---

## 🔐 Authentication

- Admin login via Supabase Auth (email + password)
- JWT tokens stored in Redux state + `localStorage`
- All admin API routes verify tokens via `verifyAdmin()`
- Token is injected automatically by RTK Query's `baseQueryWithAuth`

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** | React framework (App Router, Turbopack) |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Supabase** | Database + Auth |
| **Redux Toolkit (RTK Query)** | Client-side state & API calls |
| **Bosta / ABS / Mylerz** | Shipping integrations |

---

## 📝 AI Agent Documentation

This project includes comprehensive documentation for AI coding agents:

- **[AGENTS.md](./AGENTS.md)** — Full architecture, file structure, design patterns, and conventions
- **[CLAUDE.md](./CLAUDE.md)** — Claude-specific quick reference and instructions

These files ensure any AI agent can understand and contribute to this codebase following established patterns.

---

## 📄 License

This project is proprietary software. All rights reserved.
