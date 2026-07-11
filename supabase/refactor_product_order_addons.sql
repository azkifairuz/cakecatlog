CREATE TABLE IF NOT EXISTS global_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    additional_price NUMERIC DEFAULT 0 NOT NULL,
    is_dark_color BOOLEAN DEFAULT false,
    dark_color_surcharge NUMERIC DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_addons (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES global_addons(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    PRIMARY KEY (product_id, addon_id)
);

ALTER TABLE product_addons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customized_options JSONB;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS customized_options JSONB;

CREATE INDEX IF NOT EXISTS global_addons_category_idx ON global_addons(category);
CREATE INDEX IF NOT EXISTS global_addons_active_idx ON global_addons(is_active);
CREATE INDEX IF NOT EXISTS product_addons_product_id_idx ON product_addons(product_id);
