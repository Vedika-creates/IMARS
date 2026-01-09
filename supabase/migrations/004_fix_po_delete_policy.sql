-- Update existing RLS policy for PO deletion
-- Run this in your Supabase SQL Editor

-- First, drop the existing policy
DROP POLICY IF EXISTS "Admins can delete any purchase_orders" ON purchase_orders;

-- Also drop the user policy if it exists
DROP POLICY IF EXISTS "Users can delete own purchase_orders" ON purchase_orders;

-- Create a more permissive policy for all authenticated users
CREATE POLICY "Authenticated users can delete purchase_orders" ON purchase_orders
FOR DELETE USING (
  auth.role() = 'authenticated'
);

-- Check the updated policies
SELECT * FROM pg_policies WHERE tablename = 'purchase_orders';
