-- GRN (Goods Receipt Note) Schema
-- Migration: 005_grn_schema.sql

-- GRN Main Table
CREATE TABLE grn (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT,
    received_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    grn_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status grn_status DEFAULT 'draft',
    total_items INTEGER DEFAULT 0,
    total_quantity_received INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GRN Items Table - for individual items in GRN
CREATE TABLE grn_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID REFERENCES grn(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES po_items(id) ON DELETE RESTRICT,
    item_id UUID REFERENCES items(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER NOT NULL,
    quantity_accepted INTEGER DEFAULT 0,
    quantity_rejected INTEGER DEFAULT 0,
    rejection_reason TEXT,
    unit_cost DECIMAL(10,2),
    expiry_date DATE,
    batch_number VARCHAR(100),
    lot_number VARCHAR(100),
    manufacturing_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GRN Quality Check Table
CREATE TABLE grn_quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_item_id UUID REFERENCES grn_items(id) ON DELETE CASCADE,
    checked_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    check_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quality_status VARCHAR(20) DEFAULT 'pending', -- pending, passed, failed, conditional
    check_parameters JSONB, -- Store various quality check parameters
    check_results JSONB, -- Store quality check results
    defects_found TEXT,
    action_taken VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_grn_grn_number ON grn(grn_number);
CREATE INDEX idx_grn_po_id ON grn(po_id);
CREATE INDEX idx_grn_supplier_id ON grn(supplier_id);
CREATE INDEX idx_grn_warehouse_id ON grn(warehouse_id);
CREATE INDEX idx_grn_status ON grn(status);
CREATE INDEX idx_grn_date ON grn(grn_date);

CREATE INDEX idx_grn_items_grn_id ON grn_items(grn_id);
CREATE INDEX idx_grn_items_item_id ON grn_items(item_id);
CREATE INDEX idx_grn_items_batch_id ON grn_items(batch_id);
CREATE INDEX idx_grn_items_po_item_id ON grn_items(po_item_id);

CREATE INDEX idx_grn_quality_checks_grn_item_id ON grn_quality_checks(grn_item_id);
CREATE INDEX idx_grn_quality_checks_status ON grn_quality_checks(quality_status);

-- Create trigger for updating grn totals
CREATE OR REPLACE FUNCTION update_grn_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE grn SET 
        total_items = (SELECT COUNT(*) FROM grn_items WHERE grn_id = NEW.grn_id),
        total_quantity_received = (SELECT SUM(quantity_received) FROM grn_items WHERE grn_id = NEW.grn_id),
        updated_at = NOW()
    WHERE id = NEW.grn_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grn_totals
    AFTER INSERT OR UPDATE OR DELETE ON grn_items
    FOR EACH ROW EXECUTE FUNCTION update_grn_totals();

-- Create trigger for auto-generating GRN number
CREATE OR REPLACE FUNCTION generate_grn_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.grn_number IS NULL THEN
        NEW.grn_number := 'GRN-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                         LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || '-' ||
                         LPAD(NEXTVAL('grn_sequence')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for GRN numbers
CREATE SEQUENCE IF NOT EXISTS grn_sequence START 1;

CREATE TRIGGER trigger_generate_grn_number
    BEFORE INSERT ON grn
    FOR EACH ROW EXECUTE FUNCTION generate_grn_number();

-- RLS Policies
ALTER TABLE grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_quality_checks ENABLE ROW LEVEL SECURITY;

-- GRN RLS Policies
CREATE POLICY "Users can view GRNs for their warehouse" ON grn
    FOR SELECT USING (
        warehouse_id IN (
            SELECT id FROM warehouses WHERE id IN (
                SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Warehouse staff can insert GRNs" ON grn
    FOR INSERT WITH CHECK (
        warehouse_id IN (
            SELECT id FROM warehouses WHERE id IN (
                SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
            )
        ) AND
        received_by = auth.uid()
    );

CREATE POLICY "Warehouse staff can update GRNs" ON grn
    FOR UPDATE USING (
        warehouse_id IN (
            SELECT id FROM warehouses WHERE id IN (
                SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
            )
        )
    );

-- GRN Items RLS Policies
CREATE POLICY "Users can view GRN items for their warehouse" ON grn_items
    FOR SELECT USING (
        grn_id IN (
            SELECT id FROM grn WHERE warehouse_id IN (
                SELECT id FROM warehouses WHERE id IN (
                    SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Warehouse staff can insert GRN items" ON grn_items
    FOR INSERT WITH CHECK (
        grn_id IN (
            SELECT id FROM grn WHERE warehouse_id IN (
                SELECT id FROM warehouses WHERE id IN (
                    SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Warehouse staff can update GRN items" ON grn_items
    FOR UPDATE USING (
        grn_id IN (
            SELECT id FROM grn WHERE warehouse_id IN (
                SELECT id FROM warehouses WHERE id IN (
                    SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
                )
            )
        )
    );

-- GRN Quality Checks RLS Policies
CREATE POLICY "Users can view GRN quality checks for their warehouse" ON grn_quality_checks
    FOR SELECT USING (
        grn_item_id IN (
            SELECT id FROM grn_items WHERE grn_id IN (
                SELECT id FROM grn WHERE warehouse_id IN (
                    SELECT id FROM warehouses WHERE id IN (
                        SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "Warehouse staff can insert GRN quality checks" ON grn_quality_checks
    FOR INSERT WITH CHECK (
        grn_item_id IN (
            SELECT id FROM grn_items WHERE grn_id IN (
                SELECT id FROM grn WHERE warehouse_id IN (
                    SELECT id FROM warehouses WHERE id IN (
                        SELECT warehouse_id FROM user_warehouses WHERE user_id = auth.uid()
                    )
                )
            )
        ) AND
        checked_by = auth.uid()
    );

-- Update function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grn_updated_at
    BEFORE UPDATE ON grn
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grn_items_updated_at
    BEFORE UPDATE ON grn_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
