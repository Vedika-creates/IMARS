-- Fix RLS Policies for Reports
-- Run this in Supabase SQL Editor to fix the 403 errors

-- First, enable RLS on the tables that need it
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view items" ON items;
DROP POLICY IF EXISTS "Users can view reorder_rules" ON reorder_rules;
DROP POLICY IF EXISTS "Users can view reorder_alerts" ON reorder_alerts;

-- Create proper RLS policies for the Reports functionality

-- Items table - Allow authenticated users to read items
CREATE POLICY "Authenticated users can view items" ON items
FOR SELECT USING (auth.role() = 'authenticated');

-- Reorder Rules table - Allow authenticated users to read
CREATE POLICY "Authenticated users can view reorder_rules" ON reorder_rules
FOR SELECT USING (auth.role() = 'authenticated');

-- Reorder Alerts table - Allow authenticated users to read
CREATE POLICY "Authenticated users can view reorder_alerts" ON reorder_alerts
FOR SELECT USING (auth.role() = 'authenticated');

-- Success message
SELECT 'Reports RLS policies fixed successfully!' as message;
