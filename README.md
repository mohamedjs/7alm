# 7alm E-commerce Platform

7alm is a modern, responsive E-commerce platform built with Next.js (App Router), Tailwind CSS, and Supabase. It features a complete Customer Landing Page and an advanced Admin Dashboard.

## Features
- **Layered Architecture**: Organized by domain features (`/features/orders`, `/features/customers`, `/features/products`).
- **Admin Dashboard**: Full CRUD management for products, order processing, and a dynamic State Machine for order statuses.
- **Secure Authentication**: Protected API routes using Supabase JWT tokens.
- **Responsive Design**: Mobile-first design implementation with modern Tailwind styling.

## Tech Stack
- Framework: Next.js 15+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Database/Auth: Supabase
- State Management: React Hooks & Custom State Machine

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Setup `.env.local` with your Supabase credentials
4. Run the development server: `npm run dev`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
