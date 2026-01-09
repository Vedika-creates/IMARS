// Setup Controller - Create database tables
import { db } from '../db.js';

const createTables = async (req, res) => {
  try {
    console.log('Creating database tables...');

    // Drop existing tables to start fresh
    await db.query('DROP TABLE IF EXISTS stock_batches');
    await db.query('DROP TABLE IF EXISTS purchase_orders');
    await db.query('DROP TABLE IF EXISTS suppliers');
    await db.query('DROP TABLE IF EXISTS items');

    // Create items table
    await db.query(`
      CREATE TABLE items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        unit_of_measure VARCHAR(20) NOT NULL,
        current_stock DECIMAL(15,2) DEFAULT 0,
        reorder_point DECIMAL(15,2) DEFAULT 0,
        safety_stock DECIMAL(15,2) DEFAULT 0,
        max_stock DECIMAL(15,2),
        lead_time_days INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create suppliers table
    await db.query(`
      CREATE TABLE suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create purchase_orders table
    await db.query(`
      CREATE TABLE purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id INT,
        status ENUM('draft', 'sent', 'confirmed', 'completed', 'cancelled') DEFAULT 'draft',
        total_amount DECIMAL(15,2) DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create stock_batches table
    await db.query(`
      CREATE TABLE stock_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        batch_number VARCHAR(100),
        quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
        expiry_date DATE,
        unit_cost DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert sample data
    await db.query(`
      INSERT INTO items (sku, name, category, unit_of_measure, current_stock, reorder_point, safety_stock) VALUES
      ('LAP001', 'Laptop Dell XPS', 'Electronics', 'units', 5, 10, 2),
      ('MOU001', 'Wireless Mouse', 'Electronics', 'units', 25, 15, 5),
      ('KEY001', 'Mechanical Keyboard', 'Electronics', 'units', 0, 8, 3),
      ('MON001', 'Monitor 27 inch', 'Electronics', 'units', 12, 10, 4),
      ('CAB001', 'Network Cable', 'Accessories', 'units', 50, 20, 10)
    `);

    await db.query(`
      INSERT INTO suppliers (name, contact_person, email, phone) VALUES
      ('Tech Supplies Inc', 'John Doe', 'john@techsupplies.com', '555-0101'),
      ('Office Solutions', 'Jane Smith', 'jane@officesolutions.com', '555-0102'),
      ('Hardware Pro', 'Bob Johnson', 'bob@hardwarepro.com', '555-0103')
    `);

    await db.query(`
      INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount) VALUES
      ('PO-2024-001', 1, 'draft', 1500.00),
      ('PO-2024-002', 2, 'sent', 800.00),
      ('PO-2024-003', 3, 'draft', 2200.00)
    `);

    console.log('Tables created and sample data inserted successfully');
    res.json({ success: true, message: 'Database tables created successfully' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  createTables
};
