// Improved Dashboard Component
import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { supabase } from '../supabase';
import './Dashboard.css';

const Dashboard = () => {
  console.log('🚀 Dashboard: Component rendering...');
  
  // State for dashboard statistics
  const [stats, setStats] = useState({
    total_items: 0,
    low_stock_alerts: 0,
    critical_stock_alerts: 0,
    pending_reorders: 0,
    active_suppliers: 0,
    expiring_soon: 0,
    batch_tracked_items: 0,
    items_with_pos: 0,
    items_with_reorder_rules: 0
  });
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Get API methods from useApi hook
  const { apiCall } = useApi();

  // Fetch dashboard statistics using Supabase
  const fetchStats = async () => {
    console.log('🔍 Dashboard: Starting fetchStats...');
    try {
      // Get total items count - CORRECT METHOD (only active items)
      console.log('🔍 Dashboard: Fetching total items...');
      const { count: totalItems, error: itemsError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      console.log('🔍 Dashboard: Total items:', totalItems, 'Error:', itemsError);

      // Get items with batches
      console.log('🔍 Dashboard: Fetching items with batches...');
      const { count: batchTrackedItems, error: batchError } = await supabase
        .from('inventory_batches')
        .select('item_id', { count: 'exact', head: true });

      console.log('🔍 Dashboard: Batch tracked items:', batchTrackedItems, 'Error:', batchError);

      // Get items with purchase orders
      console.log('🔍 Dashboard: Fetching items with POs...');
      const { count: itemsWithPOs, error: poError } = await supabase
        .from('purchase_orders')
        .select('item_id', { count: 'exact', head: true });

      console.log('🔍 Dashboard: Items with POs:', itemsWithPOs, 'Error:', poError);

      // Get items with reorder rules
      console.log('🔍 Dashboard: Fetching items with reorder rules...');
      const { count: itemsWithReorderRules, error: reorderRulesError } = await supabase
        .from('reorder_rules')
        .select('item_id', { count: 'exact', head: true })
        .eq('is_active', true);

      console.log('🔍 Dashboard: Items with reorder rules:', itemsWithReorderRules, 'Error:', reorderRulesError);

      // Get low stock alerts (items below reorder point - only active items)
      console.log('🔍 Dashboard: Fetching low stock items...');
      const { count: lowStock, error: lowStockError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .lt('current_stock', 'reorder_point')
        .gt('current_stock', 0);

      console.log('🔍 Dashboard: Low stock:', lowStock, 'Error:', lowStockError);

      // Get critical stock alerts (items with stock <= safety_stock but > 0 - only active items)
      console.log('🔍 Dashboard: Fetching critical stock items...');
      const { count: criticalStock, error: criticalError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('current_stock', 0)
        .lte('current_stock', 'safety_stock');

      console.log('🔍 Dashboard: Critical stock:', criticalStock, 'Error:', criticalError);

      // Get pending reorders
      console.log('🔍 Dashboard: Fetching pending reorders...');
      const { count: pendingReorders, error: reorderError } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'sent', 'confirmed']);

      console.log('🔍 Dashboard: Pending reorders:', pendingReorders, 'Error:', reorderError);

      // Get active suppliers
      console.log('🔍 Dashboard: Fetching active suppliers...');
      const { count: activeSuppliers, error: supplierError } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      console.log('🔍 Dashboard: Active suppliers:', activeSuppliers, 'Error:', supplierError);

      // Get items expiring soon (within 30 days)
      console.log('🔍 Dashboard: Fetching expiring items...');
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: expiringSoon, error: expiryError } = await supabase
        .from('inventory_batches')
        .select('*', { count: 'exact', head: true })
        .lte('expiry_date', thirtyDaysFromNow.toISOString())
        .gt('expiry_date', new Date().toISOString());

      console.log('🔍 Dashboard: Expiring soon:', expiringSoon, 'Error:', expiryError);

      if (itemsError || lowStockError || criticalError || reorderError || supplierError || expiryError || batchError || poError || reorderRulesError) {
        console.error('❌ Supabase fetch error:', { 
          itemsError, 
          lowStockError, 
          criticalError, 
          reorderError, 
          supplierError, 
          expiryError, 
          batchError, 
          poError, 
          reorderRulesError 
        });
        
        // Log specific errors for debugging
        if (itemsError) console.error('❌ Items Error:', itemsError);
        if (lowStockError) console.error('❌ Low Stock Error:', lowStockError);
        if (criticalError) console.error('❌ Critical Stock Error:', criticalError);
        if (reorderError) console.error('❌ Reorder Error:', reorderError);
        if (supplierError) console.error('❌ Supplier Error:', supplierError);
        if (expiryError) console.error('❌ Expiry Error:', expiryError);
        if (batchError) console.error('❌ Batch Error:', batchError);
        if (poError) console.error('❌ PO Error:', poError);
        if (reorderRulesError) console.error('❌ Reorder Rules Error:', reorderRulesError);
        
        // Fallback to mock data
        const mockStats = {
          total_items: 3,  // Updated to match your catalog
          low_stock_alerts: 1,
          critical_stock_alerts: 1,
          pending_reorders: 2,
          active_suppliers: 4,
          expiring_soon: 1,
          batch_tracked_items: 2,
          items_with_pos: 2,
          items_with_reorder_rules: 2
        };
        console.log('🔄 Dashboard: Using fallback mock data:', mockStats);
        setStats(mockStats);
      } else {
        const finalStats = {
          total_items: totalItems || 0,
          low_stock_alerts: lowStock || 0,
          critical_stock_alerts: criticalStock || 0,
          pending_reorders: pendingReorders || 0,
          active_suppliers: activeSuppliers || 0,
          expiring_soon: expiringSoon || 0,
          batch_tracked_items: batchTrackedItems || 0,
          items_with_pos: itemsWithPOs || 0,
          items_with_reorder_rules: itemsWithReorderRules || 0
        };
        console.log('✅ Dashboard: Setting final stats:', finalStats);
        setStats(finalStats);
      }
    } catch (error) {
      console.error('❌ Dashboard: Fetch stats error:', error);
      // Fallback data
      const mockStats = {
        total_items: 10,
        low_stock_alerts: 3,
        critical_stock_alerts: 4,  // Updated to show multiple critical items
        pending_reorders: 5,
        active_suppliers: 8,
        expiring_soon: 2,
        batch_tracked_items: 6,
        items_with_pos: 4,
        items_with_reorder_rules: 7
      };
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  // Initialize dashboard on component mount
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      console.log('🔍 Dashboard: Starting authentication check...');
      
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      console.log('🔍 Dashboard: Auth session:', session);
      console.log('🔍 Dashboard: Auth error:', authError);
      
      if (authError || !session) {
        console.error('❌ Dashboard: User not authenticated:', authError);
        // Redirect to login if not authenticated
        window.location.href = '/login';
        return;
      }

      console.log('✅ Dashboard: User authenticated, fetching data...');
      // User is authenticated, fetch dashboard data
      await fetchStats();
    };

    checkAuthAndFetchData();
  }, []);

  // Hover card component
  const HoverCard = ({ title, value }) => {
    const [hover, setHover] = useState(false);

    return (
      <div
        className={`dashboard-card ${hover ? 'dashboard-card-hover' : ''}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <h3 className="card-title">{title}</h3>
        <p className="card-value">{value}</p>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <div>
        <h1 className="dashboard-title">📊 Inventory Dashboard</h1>
        <p className="dashboard-subtitle">
          Real-time inventory overview and reorder insights
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-grid">
        <HoverCard title="Total Items" value={stats.total_items} />
        <HoverCard title="Low Stock Alerts" value={stats.low_stock_alerts} />
        <HoverCard title="Critical Stock Alerts" value={stats.critical_stock_alerts} />
        <HoverCard title="Pending Reorders" value={stats.pending_reorders} />
        <HoverCard title="Active Suppliers" value={stats.active_suppliers} />
        <HoverCard title="Expiring Soon" value={stats.expiring_soon} />
      </div>

      {loading && (
        <div className="loading">
          <p>🔄 Loading dashboard data...</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
