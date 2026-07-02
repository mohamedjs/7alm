-- ============================================================
-- 7alm Database Schema — Supabase PostgreSQL
-- Run this in Supabase SQL Editor
-- ============================================================

-- 0. Create Products Table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    compare_at_price NUMERIC(10, 2),
    sku TEXT UNIQUE,
    qrcode TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock')),
    main_image TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Create Geography Tables
CREATE TABLE public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country_id, name)
);

CREATE TABLE public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE,
    english_name TEXT NOT NULL,
    arabic_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(city_id, english_name)
);

-- 2. Create Customer & Address Tables
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE RESTRICT,
    street_details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    address_id UUID REFERENCES public.addresses(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    platform_source TEXT,
    ip_address TEXT,
    ip_country TEXT,
    ip_city TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'cancelled', 'returned')),
    shipping_provider TEXT,
    shipping_tracking_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Admins Table (linked to Supabase Auth)
CREATE TABLE public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admins"
ON public.admins FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed: Country
INSERT INTO public.countries (name) VALUES ('Egypt');

-- Seed: City (Cairo under Egypt)
INSERT INTO public.cities (country_id, name)
SELECT id, 'Cairo' FROM public.countries WHERE name = 'Egypt';

-- Seed: Zones (Cairo zones)
DO $$
DECLARE
    cairo_id UUID;
BEGIN
    SELECT id INTO cairo_id FROM public.cities WHERE name = 'Cairo';

    INSERT INTO public.zones (city_id, english_name, arabic_name) VALUES
        (cairo_id, 'Maadi', 'المعادي'),
        (cairo_id, 'Nasr City', 'مدينة نصر'),
        (cairo_id, 'Heliopolis', 'مصر الجديدة'),
        (cairo_id, 'Dokki', 'الدقي'),
        (cairo_id, 'Mohandessin', 'المهندسين'),
        (cairo_id, 'Zamalek', 'الزمالك'),
        (cairo_id, 'Downtown', 'وسط البلد'),
        (cairo_id, 'Shubra', 'شبرا'),
        (cairo_id, 'Ain Shams', 'عين شمس'),
        (cairo_id, 'New Cairo', 'القاهرة الجديدة'),
        (cairo_id, '6th of October', 'السادس من أكتوبر'),
        (cairo_id, 'Sheikh Zayed', 'الشيخ زايد'),
        (cairo_id, 'Giza', 'الجيزة'),
        (cairo_id, 'Haram', 'الهرم'),
        (cairo_id, 'Faisal', 'فيصل');
END $$;

-- Seed: Sample Product
INSERT INTO public.products (name, slug, description, price, compare_at_price, sku, quantity, stock_status, main_image, gallery)
VALUES (
    'منتج حلم',
    '7alm-product',
    'وصف المنتج - منتج حلم الأصلي بأعلى جودة',
    350.00,
    500.00,
    '7ALM-001',
    100,
    'in_stock',
    '/images/product-main.jpg',
    '["\/images\/product-1.jpg", "\/images\/product-2.jpg", "\/images\/product-3.jpg"]'::jsonb
);
