-- Create RPC function to get low stock items
-- This function returns items where current_stock <= reorder_point
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  current_stock INTEGER,
  reorder_point INTEGER,
  unit_of_measure TEXT,
  preferred_supplier_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.sku,
    i.name,
    i.current_stock,
    i.reorder_point,
    i.unit_of_measure,
    i.preferred_supplier_id
  FROM items i
  WHERE 
    i.current_stock <= i.reorder_point
    AND i.current_stock > 0  -- Only items with some stock, not completely out of stock
    AND i.reorder_point > 0  -- Only items that have a reorder point set
  ORDER BY 
    (i.reorder_point - i.current_stock) DESC;  -- Items with largest deficit first
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_low_stock_items() TO authenticated;
