// Dashboard Controller
import { db } from '../db.js';

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    console.log('Attempting to fetch dashboard stats...');
    
    // Test database connection first
    try {
      const [testResult] = await db.query('SELECT 1 as test');
      console.log('Database connection test:', testResult);
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }

    // Check if items table exists
    try {
      const [tableCheck] = await db.query('SHOW TABLES LIKE "items"');
      console.log('Items table exists:', tableCheck.length > 0);
      
      if (tableCheck.length === 0) {
        console.log('Items table does not exist, returning mock data');
        return res.json({ 
          success: true, 
          data: {
            total_items: 0,
            low_stock_alerts: 0,
            critical_stock_alerts: 0,
            pending_reorders: 0,
            active_suppliers: 0,
            expiring_soon: 0
          }
        });
      }
    } catch (tableError) {
      console.error('Table check failed:', tableError);
    }

    // Get total items count
    const [itemsResult] = await db.query(
      'SELECT COUNT(*) as total_items FROM items WHERE is_active = true'
    );
    console.log('Items result:', itemsResult);

    // Get low stock alerts (items below reorder point)
    const [lowStockResult] = await db.query(
      'SELECT COUNT(*) as low_stock_alerts FROM items WHERE current_stock <= reorder_point AND current_stock > 0 AND is_active = true'
    );

    // Get critical stock alerts (items out of stock)
    const [criticalStockResult] = await db.query(
      'SELECT COUNT(*) as critical_stock_alerts FROM items WHERE current_stock = 0 AND is_active = true'
    );

    // Get pending reorders
    const [pendingReordersResult] = await db.query(
      'SELECT COUNT(*) as pending_reorders FROM purchase_orders WHERE status = "draft"'
    );

    // Get active suppliers
    const [activeSuppliersResult] = await db.query(
      'SELECT COUNT(*) as active_suppliers FROM suppliers WHERE is_active = true'
    );

    // Get items expiring soon (items with expiry dates within 30 days)
    const [expiringSoonResult] = await db.query(
      'SELECT COUNT(*) as expiring_soon FROM stock_batches WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date > CURDATE()'
    );

    const stats = {
      total_items: itemsResult[0]?.total_items || 0,
      low_stock_alerts: lowStockResult[0]?.low_stock_alerts || 0,
      critical_stock_alerts: criticalStockResult[0]?.critical_stock_alerts || 0,
      pending_reorders: pendingReordersResult[0]?.pending_reorders || 0,
      active_suppliers: activeSuppliersResult[0]?.active_suppliers || 0,
      expiring_soon: expiringSoonResult[0]?.expiring_soon || 0
    };

    console.log('Final stats:', stats);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
  }
};

// Get recent alerts
const getRecentAlerts = async (req, res) => {
  try {
    // Get items that need attention
    const [alerts] = await db.query(`
      SELECT 
        id,
        name as item_name,
        CASE 
          WHEN current_stock = 0 THEN 'critical'
          WHEN current_stock <= reorder_point THEN 'low'
          ELSE 'info'
        END as type,
        CASE 
          WHEN current_stock = 0 THEN CONCAT(name, ' is out of stock')
          WHEN current_stock <= reorder_point THEN CONCAT(name, ' is below reorder point')
          ELSE CONCAT(name, ' stock level is normal')
        END as message,
        created_at
      FROM items 
      WHERE (current_stock <= reorder_point OR current_stock = 0) AND is_active = true
      ORDER BY 
        CASE 
          WHEN current_stock = 0 THEN 1
          WHEN current_stock <= reorder_point THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT 10
    `);

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Recent alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent alerts' });
  }
};

export default {
  getDashboardStats,
  getRecentAlerts
};
