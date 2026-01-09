-- Enable RLS on inventory_batches table
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view inventory_batches" ON inventory_batches;
DROP POLICY IF EXISTS "Users can insert inventory_batches" ON inventory_batches;
DROP POLICY IF EXISTS "Users can update inventory_batches" ON inventory_batches;
DROP POLICY IF EXISTS "Users can delete inventory_batches" ON inventory_batches;

-- Create RLS policies for inventory_batches
CREATE POLICY "Users can view inventory_batches" ON inventory_batches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert inventory_batches" ON inventory_batches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update inventory_batches" ON inventory_batches
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete inventory_batches" ON inventory_batches
  FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON inventory_batches TO authenticated;
GRANT SELECT ON inventory_batches TO anon;

-- Grant usage on the function
GRANT EXECUTE ON FUNCTION get_next_batch_for_issue TO authenticated;
