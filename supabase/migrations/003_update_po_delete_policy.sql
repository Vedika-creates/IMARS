-- Update RLS policy to allow admins to delete purchase orders
-- Run this in your Supabase SQL Editor

-- First, check existing policies
SELECT * FROM pg_policies WHERE tablename = 'purchase_orders';

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete own purchase_orders" ON purchase_orders;

-- Create new delete policy for admins
CREATE POLICY "Admins can delete any purchase_orders" ON purchase_orders
FOR DELETE USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Enable RLS on the table (if not already enabled)
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Optional: Also allow users to delete their own POs
CREATE POLICY "Users can delete own purchase_orders" ON purchase_orders
FOR DELETE USING (
  auth.uid() = created_by
);
