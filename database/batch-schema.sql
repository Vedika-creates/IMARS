-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add issue_method column to items table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'items' AND column_name = 'issue_method') THEN
        ALTER TABLE items 
        ADD COLUMN issue_method TEXT NOT NULL DEFAULT 'FIFO' 
        CONSTRAINT valid_issue_method CHECK (issue_method IN ('FIFO', 'LIFO'));
    END IF;
END $$;

-- Create inventory_batches table
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  batch_number TEXT NOT NULL,
  expiry_date DATE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0 AND available_quantity <= quantity),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_batch_per_item UNIQUE (item_id, batch_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item_id ON inventory_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date ON inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_available_quantity ON inventory_batches(available_quantity) WHERE available_quantity > 0;

-- Function to get next batch for issuing stock
CREATE OR REPLACE FUNCTION get_next_batch_for_issue(
  p_item_id UUID,
  p_warehouse_id UUID DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1
) RETURNS TABLE (
  batch_id UUID,
  quantity_available INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH batch_candidates AS (
    SELECT 
      ib.id,
      ib.available_quantity,
      ib.expiry_date,
      ROW_NUMBER() OVER (
        PARTITION BY ib.item_id 
        ORDER BY 
          CASE 
            WHEN (SELECT issue_method FROM items WHERE id = ib.item_id) = 'FIFO' 
            THEN ib.received_at
            ELSE -EXTRACT(EPOCH FROM ib.received_at) -- For LIFO, use negative timestamp
          END
      ) as priority
    FROM inventory_batches ib
    WHERE 
      ib.item_id = p_item_id
      AND (p_warehouse_id IS NULL OR ib.warehouse_id = p_warehouse_id)
      AND ib.available_quantity > 0
      AND (ib.expiry_date IS NULL OR ib.expiry_date >= CURRENT_DATE)
  )
  SELECT 
    id,
    available_quantity
  FROM batch_candidates
  WHERE priority = 1
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
