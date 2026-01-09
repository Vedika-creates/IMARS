-- Add city and country columns to warehouses table
ALTER TABLE warehouses ADD COLUMN city TEXT;
ALTER TABLE warehouses ADD COLUMN country TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouses_city ON warehouses(city);
CREATE INDEX IF NOT EXISTS idx_warehouses_country ON warehouses(country);
