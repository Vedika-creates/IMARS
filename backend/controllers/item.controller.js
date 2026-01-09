import { db } from "../databaseClient.js";

export const getItems = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM items');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const item = req.body;
    const { name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry } = item;
    
    const [result] = await db.execute(
      `INSERT INTO items (name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry]
    );
    
    res.json({ message: "Item created", data: { id: result.insertId, ...item } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute('SELECT * FROM items WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.body;
    const { name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry } = item;
    
    const [result] = await db.execute(
      `UPDATE items SET 
       name = ?, sku = ?, description = ?, category = ?, unit_of_measure = ?,
       reorder_point = ?, max_stock = ?, requires_batch_tracking = ?, has_expiry = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: "Item updated", data: { id, ...item } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute('DELETE FROM items WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
