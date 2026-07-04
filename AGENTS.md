# 🏪 7alm — AI Agent Entrypoint

> **7alm** is a production-ready, Arabic-first E-commerce platform built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and Supabase. It powers a high-conversion product landing page funnel and a full-featured admin dashboard.

---

## ⚠️ Critical Rules — Read Before Writing Any Code

1. **Next.js 16 (Turbopack)**: This project uses Next.js 16 with the App Router. APIs, conventions, and file structure may differ from your training data. Check `node_modules/next/dist/docs/` if unsure about any API.
2. **Server vs Client Boundary**: All database operations happen server-side through API routes. Components in `(landing)` use `"use client"` and talk to the backend via RTK Query. Never import Supabase directly in client components.
3. **Arabic RTL**: The landing pages are fully RTL (`dir="rtl"`, `lang="ar"`). Always respect this when adding UI elements.
4. **TypeScript Strict**: The project enforces strict TypeScript. Run `npx tsc --noEmit` before committing.
5. **Feature-First Architecture**: All business logic lives in `src/features/<domain>/`. UI components live in `src/components/`. Never put business logic in components or pages.

---

## 🏗️ Architecture Overview

### Layered Architecture (per domain)

Each feature domain follows a strict 4-layer architecture:

```
┌─────────────────────────────────────────────────┐
│  Pages (App Router)     — Route entry points     │
├─────────────────────────────────────────────────┤
│  Components             — UI rendering only      │
├─────────────────────────────────────────────────┤
│  Features (Hooks/API)   — State & data access    │
│  ├── *.api.ts           — RTK Query endpoints    │
│  ├── *.hooks.ts         — Custom React hooks     │
│  ├── *.service.ts       — Business logic (SSR)   │
│  └── *.repository.ts    — Supabase queries (SSR) │
├─────────────────────────────────────────────────┤
│  Lib                    — Shared infra           │
│  ├── supabase.ts        — Supabase client        │
│  ├── auth.ts            — JWT verification       │
│  ├── orderStateMachine  — State Machine pattern  │
│  └── redux/             — Store config           │
└─────────────────────────────────────────────────┘
```

### Key Principle: Service ↔ Repository Separation

| Layer | Runs On | Purpose | Example |
|---|---|---|---|
| `*.repository.ts` | Server only | Raw Supabase queries. No business logic. | `productRepository.getProductBySlug(slug)` |
| `*.service.ts` | Server only | Business orchestration. Calls repositories. | `orderService.approveOrder(id, provider)` |
| `*.api.ts` | Client only | RTK Query endpoints. Calls API routes via HTTP. | `useGetProductsQuery()` |
| `*.hooks.ts` | Client only | UI-specific logic, form state, modal control. | `useProductsManager()` |

> **Never import a Repository or Service in a client component.** They use the Supabase server client and will crash.

---

## 📁 File Structure

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (ReduxProvider)
│   ├── (landing)/                        # Public storefront (RTL, Arabic)
│   │   ├── layout.tsx                    # Landing layout (Cairo font, dark bg)
│   │   ├── page.tsx                      # Default landing (active product)
│   │   └── [slug]/page.tsx               # Dynamic product landing page
│   ├── (admin)/admin/                    # Protected admin dashboard
│   │   ├── layout.tsx                    # Admin layout (sidebar + auth guard)
│   │   ├── page.tsx                      # Dashboard overview (stats)
│   │   ├── products/
│   │   │   ├── page.tsx                  # Product list + CRUD
│   │   │   └── create/page.tsx           # Dedicated create page
│   │   └── orders/page.tsx               # Order management + state machine
│   └── api/                              # Next.js API routes (server-side)
│       ├── auth/login/route.ts           # Supabase auth (returns JWT)
│       ├── admin/products/route.ts       # GET/POST products (auth required)
│       ├── admin/products/[id]/route.ts  # PUT/DELETE product (auth required)
│       ├── admin/upload/route.ts         # Media upload (local filesystem)
│       ├── orders/route.ts               # GET/POST orders
│       ├── orders/[id]/status/route.ts   # PATCH order status
│       ├── products/active/route.ts      # GET active product (public)
│       ├── products/[slug]/route.ts      # GET product by slug (public)
│       ├── webhooks/shipping/route.ts    # Shipping provider webhooks
│       └── zones/route.ts               # GET zones for checkout form
│
├── components/
│   ├── admin/
│   │   ├── AdminLayoutClient.tsx         # Sidebar + auth persistence
│   │   ├── LoginForm.tsx                 # Admin login form
│   │   ├── OrdersTable.tsx               # Orders table + state machine actions
│   │   ├── ProductsManager.tsx           # Legacy combined manager (use products/ instead)
│   │   └── products/
│   │       ├── ProductList.tsx           # Product table with "Copy Landing Link" action
│   │       └── ProductForm.tsx           # Create/Edit product modal form
│   └── landing/
│       ├── CheckoutForm.tsx              # Order form (accepts optional productId)
│       ├── CheckoutSummary.tsx           # Static product summary (legacy)
│       ├── DynamicCheckoutSummary.tsx     # Dynamic product summary (from DB)
│       ├── Hero.tsx / Features.tsx / Footer.tsx
│       └── ProductShowcase.tsx / ProductDetails.tsx
│
├── features/
│   ├── shared/types.ts                   # All shared TypeScript interfaces
│   ├── auth/
│   │   ├── auth.api.ts                   # RTK Query login endpoint
│   │   ├── auth.hooks.ts                 # useAuth hook
│   │   └── auth.slice.ts                 # Redux slice (token + user state)
│   ├── products/
│   │   ├── products.api.ts               # RTK Query CRUD endpoints
│   │   ├── products.hooks.ts             # useProductsManager hook
│   │   ├── products.service.ts           # Product business logic (SSR)
│   │   └── products.repository.ts        # Supabase queries (SSR)
│   ├── orders/
│   │   ├── orders.api.ts                 # RTK Query endpoints
│   │   ├── orders.hooks.ts               # useOrders hook
│   │   ├── orders.service.ts             # Order orchestration (SSR)
│   │   └── orders.repository.ts          # Supabase queries (SSR)
│   ├── customers/
│   │   ├── customers.service.ts          # Find-or-create customer logic
│   │   └── customers.repository.ts       # Supabase queries
│   ├── geo/
│   │   ├── geo.api.ts / geo.hooks.ts     # Zone dropdown data (client)
│   │   ├── geo.service.ts                # Zone business logic (SSR)
│   │   └── geo.repository.ts             # Supabase queries
│   ├── checkout/
│   │   ├── checkout.hooks.ts             # useCheckoutForm, useIpInfo
│   │   └── checkout-summary.hooks.ts     # useUrgencyBanner, useProductGallery
│   ├── media/
│   │   ├── media.api.ts                  # Upload endpoint
│   │   └── media.hooks.ts               # useMediaUpload hook
│   └── shipping/
│       ├── shipping.interface.ts          # IShippingProvider contract
│       ├── shipping.factory.ts            # Factory Pattern (Bosta, ABS, Mylerz)
│       └── providers/
│           ├── bosta.provider.ts          # Bosta implementation
│           ├── abs.provider.ts            # ABS placeholder
│           └── mylerz.provider.ts         # Mylerz placeholder
│
└── lib/
    ├── supabase.ts                       # Supabase client singleton
    ├── auth.ts                           # verifyAdmin + extractToken (SSR)
    ├── orderStateMachine.ts              # State Machine for order statuses
    └── redux/
        ├── store.ts                      # Redux store config
        ├── hooks.ts                      # useAppDispatch, useAppSelector
        ├── ReduxProvider.tsx             # Client provider wrapper
        └── api/baseQuery.ts              # RTK Query base query with auth
```

---

## 🎯 Design Patterns in Use

### 1. State Machine Pattern (Orders)
- File: `src/lib/orderStateMachine.ts`
- Maps each `OrderStatus` to valid transitions and available actions.
- The `OrdersTable` component reads from this machine to render action buttons.
- **Status flow**: `pending → approved → shipped → delivered` (with `cancelled` and `returned` branching)

### 2. Factory Pattern (Shipping)
- File: `src/features/shipping/shipping.factory.ts`
- Interface: `src/features/shipping/shipping.interface.ts`
- All providers implement `IShippingProvider` (createDelivery, trackDelivery, cancelDelivery, mapStatus).
- To add a new provider:
  1. Create `src/features/shipping/providers/<name>.provider.ts` implementing `IShippingProvider`
  2. Register it in `shipping.factory.ts`
  3. Add the name to `ShippingProviderName` type in `shared/types.ts`

### 3. Repository Pattern (Data Access)
- Every domain has a `*.repository.ts` that is the **only** file that touches Supabase.
- Services call repositories, never Supabase directly.
- This keeps database concerns isolated and testable.

### 4. RTK Query + Tag Invalidation (Client State)
- File: `src/lib/redux/store.ts`
- Each domain has an RTK Query API slice (`productsApi`, `ordersApi`, `geoApi`, etc.).
- Uses `providesTags` / `invalidatesTags` for automatic cache management.
- All API slices use `baseQueryWithAuth` which injects the Bearer token from Redux state.

---

## 🔐 Authentication Flow

1. Admin logs in via `POST /api/auth/login` (email + password → Supabase Auth).
2. Server returns a JWT access token.
3. Token is stored in Redux state (`auth.slice.ts`) and `localStorage`.
4. All admin API routes extract the token via `extractToken()` and verify via `verifyAdmin()`.
5. `verifyAdmin()` checks both JWT validity AND membership in the `admins` Supabase table.
6. `AdminLayoutClient` restores the token from `localStorage` on mount.

---

## 🌐 Dynamic Product Landing Pages

Products have a `slug` field. When an admin creates a product with slug `mobile-case`, the landing page is served at:

```
https://yourdomain.com/mobile-case
```

The `(landing)/[slug]/page.tsx` Server Component:
1. Fetches the product by slug from Supabase
2. Returns `notFound()` if the product doesn't exist or is inactive
3. Renders `DynamicCheckoutSummary` (gallery, price, discount) + `CheckoutForm`
4. Generates dynamic SEO metadata from the product data

The admin's `ProductList` has a **"Copy Link"** button that copies `{origin}/{slug}` to clipboard.

---

## 📦 Database Schema (Supabase)

| Table | Key Fields | Notes |
|---|---|---|
| `products` | id, name, slug, price, compare_at_price, quantity_prices, quantity, stock_status, main_image, gallery[], is_active | `slug` is unique, used for landing page URLs. `quantity_prices` is a JSONB array of `{ min_quantity, price, compare_at_price, label, is_special }` for tiered/bulk pricing (buy 2 = special price, buy 3 = better price). |
| `orders` | id, customer_id, address_id, product_id, quantity, total_price, status, shipping_provider, shipping_tracking_id | Status managed by State Machine |
| `customers` | id, phone, email, full_name | Unique by phone number |
| `addresses` | id, customer_id, zone_id, street_details | |
| `zones` | id, city_id, english_name, arabic_name | |
| `cities` | id, country_id, name | |
| `countries` | id, name | |
| `admins` | id | References Supabase Auth user IDs |

---

## 🧑‍💻 Development Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npx tsc --noEmit # Type check without emitting
```

### Database Migration: quantity_prices column

Run this SQL in Supabase to add the quantity-tier pricing column:

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS quantity_prices JSONB DEFAULT NULL;

-- Example: set tiered pricing for a product
UPDATE products
  SET quantity_prices = '[
    { "min_quantity": 1, "price": 299, "compare_at_price": 499, "label": "قطعة واحدة", "is_special": false },
    { "min_quantity": 2, "price": 275, "compare_at_price": 499, "label": "قطعتين", "is_special": true },
    { "min_quantity": 3, "price": 249, "compare_at_price": 499, "label": "3 قطع", "is_special": true }
  ]'::jsonb
  WHERE slug = 'your-product-slug';
```

### Realtime

The app uses Supabase Realtime for live updates. The client-side hook
`useRealtime(table, options)` subscribes to `postgres_changes` events
(INSERT/UPDATE/DELETE/`*`). It requires these public env vars:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Usage:
```ts
import { useRealtime, useRealtimeRefetch } from "@/features/realtime/realtime.hooks";

// Auto-refetch an RTK Query when a table changes:
const { refetch } = useGetOrdersQuery("all");
useRealtimeRefetch("orders", refetch);

// Or listen to events directly:
const { lastEvent, isConnected } = useRealtime("orders", {
  event: "*",
  onEvent: (payload) => console.log("order changed:", payload),
});
```

You must also enable Realtime on the table in Supabase:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
```

### Environment Variables (`.env.local`)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co   # Client-side realtime (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...               # Client-side realtime (public)
NEXT_PUBLIC_IPINFO_TOKEN=xxx          # Optional, for IP geolocation
DEFAULT_SHIPPING_PROVIDER=bosta       # Default shipping provider
BOSTA_API_KEY=xxx                     # Bosta API credentials
BOSTA_BUSINESS_ID=xxx
```

---

## ✅ Conventions Checklist

Before submitting any change, verify:

- [ ] TypeScript passes: `npx tsc --noEmit`
- [ ] Production build succeeds: `npm run build`
- [ ] No Supabase imports in client components
- [ ] New features follow the 4-layer pattern (Repository → Service → API Route → RTK Query)
- [ ] Shared types are defined in `src/features/shared/types.ts`
- [ ] UI components are thin — logic lives in hooks or services
- [ ] RTL/Arabic direction is preserved in landing page changes
