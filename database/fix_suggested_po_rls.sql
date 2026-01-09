-- Fix RLS for suggested POs
-- Allow system-generated suggested POs to be created

-- First, check if RLS is enabled
-- ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow suggested POs (system-generated)
CREATE POLICY "Allow suggested POs" ON purchase_orders
FOR INSERT
WITH CHECK (
  source = 'suggested' AND 
  created_by IS NULL
);

-- Create policy to allow users to see suggested POs
CREATE POLICY "Allow users to view suggested POs" ON purchase_orders
FOR SELECT
USING (
  source = 'suggested' OR 
  created_by = auth.uid()
);

-- Create policy to allow users to update suggested POs (convert to manual)
CREATE POLICY "Allow users to update suggested POs" ON purchase_orders
FOR UPDATE
USING (
  source = 'suggested' OR 
  created_by = auth.uid()
)
WITH CHECK (
  source = 'suggested' OR 
  created_by = auth.uid()
);

-- Alternative: If you want to allow all authenticated users to create suggested POs
-- CREATE POLICY "Allow all authenticated users" ON purchase_orders
-- FOR ALL
-- USING (auth.role() = 'authenticated')
-- WITH CHECK (auth.role() = 'authenticated');
