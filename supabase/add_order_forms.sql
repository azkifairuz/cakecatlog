-- Migration: Add order_forms table for generated purchase forms
CREATE TABLE IF NOT EXISTS public.order_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    description TEXT,
    banner_text TEXT,
    preset_options JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    views_count INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_forms_slug_idx ON public.order_forms(slug);
CREATE INDEX IF NOT EXISTS order_forms_active_idx ON public.order_forms(is_active);
CREATE INDEX IF NOT EXISTS order_forms_product_id_idx ON public.order_forms(product_id);

-- Enable RLS
ALTER TABLE public.order_forms ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active forms
CREATE POLICY "Public read active order forms"
    ON public.order_forms
    FOR SELECT
    USING (true);

-- Allow authenticated users (admin) full access
CREATE POLICY "Admin full access order forms"
    ON public.order_forms
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
