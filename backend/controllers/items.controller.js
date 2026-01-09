import { db } from "../db.js";

export const getItems = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM items ORDER BY created_at DESC');
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
};

export const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM items WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.message
    });
  }
};

export const createItem = async (req, res) => {
  try {
    const { name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry } = req.body;
    
    const [result] = await db.execute(
      `INSERT INTO items (name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry]
    );
    
    const [newItem] = await db.execute('SELECT * FROM items WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: newItem[0]
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item',
      error: error.message
    });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry } = req.body;
    
    const [result] = await db.execute(
      `UPDATE items SET 
       name = ?, sku = ?, description = ?, category = ?, unit_of_measure = ?,
       reorder_point = ?, max_stock = ?, requires_batch_tracking = ?, has_expiry = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, sku, description, category, unit_of_measure, reorder_point, max_stock, requires_batch_tracking, has_expiry, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const [updatedItem] = await db.execute('SELECT * FROM items WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      data: updatedItem[0]
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error.message
    });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.execute('DELETE FROM items WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error.message
    });
  }
};
