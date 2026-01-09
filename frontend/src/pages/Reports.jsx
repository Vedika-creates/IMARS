import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import "./Reports.css";

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [reorderRules, setReorderRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedReport, setSelectedReport] = useState("inventory-summary");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchReportData();
    
    // Test Supabase connection
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    try {
      console.log('🧪 Testing Supabase connection...');
      
      // Simple test query
      const { data, error } = await supabase
        .from('items')
        .select('count')
        .single();
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
      } else {
        console.log('✅ Supabase connection successful:', data);
      }
    } catch (err) {
      console.error('❌ Supabase connection test error:', err);
    }
  };

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchReportData();
      }, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Starting data fetch from Supabase...');
      
      const [itemsRes, rulesRes, alertsRes] = await Promise.all([
        supabase.from('items').select('*').order('created_at', { ascending: false }),
        supabase.from('reorder_rules').select('*').order('created_at', { ascending: false }),
        supabase.from('reorder_alerts').select('*').order('created_at', { ascending: false })
      ]);
      
      console.log('📊 Raw responses:', {
        items: itemsRes,
        rules: rulesRes,
        alerts: alertsRes
      });
      
      if (itemsRes.error) {
        console.error('❌ Items error:', itemsRes.error);
        throw itemsRes.error;
      }
      if (rulesRes.error) {
        console.error('❌ Rules error:', rulesRes.error);
        throw rulesRes.error;
      }
      if (alertsRes.error) {
        console.error('❌ Alerts error:', alertsRes.error);
        throw alertsRes.error;
      }
      
      console.log('✅ Data fetched successfully:', {
        items: itemsRes.data?.length,
        rules: rulesRes.data?.length,
        alerts: alertsRes.data?.length,
        itemsData: itemsRes.data,
        rulesData: rulesRes.data,
        alertsData: alertsRes.data
      });
      
      setItems(itemsRes.data || []);
      setReorderRules(rulesRes.data || []);
      setAlerts(alertsRes.data || []);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('❌ Error fetching report data:', error);
      console.error('❌ Full error details:', error.message, error.stack);
      
      // Set empty data to prevent UI from breaking
      setItems([]);
      setReorderRules([]);
      setAlerts([]);
      
      // Show user-friendly error message
      if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        alert('Authentication error. Please log in again.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert('Failed to load report data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchReportData();
  };

  const generateInventorySummary = () => {
    // If no data, return default values
    if (items.length === 0 && reorderRules.length === 0 && alerts.length === 0) {
      console.log('📊 No data found, returning default values');
      return {
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        criticalItems: 0,
        activeRules: 0,
        averageStockLevel: 0,
        itemsNeedingReorder: 0,
        outOfStockItems: 0,
        totalStockQuantity: 0
      };
    }

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.current_stock * (item.unit_price || 0)), 0);
    
    // Calculate low stock items based on reorder rules
    const lowStockItems = items.filter(item => {
      const rule = reorderRules.find(r => r.item_id === item.id);
      return rule && rule.is_active && item.current_stock <= rule.min_stock;
    }).length;
    
    // Calculate critical items from active alerts
    const criticalItems = alerts.filter(alert => 
      alert.severity === 'critical' && !alert.is_resolved
    ).length;
    
    // Count active reorder rules
    const activeRules = reorderRules.filter(rule => rule.is_active).length;
    
    // Calculate average stock level (only for items with stock)
    const itemsWithStock = items.filter(item => item.current_stock > 0);
    const averageStockLevel = itemsWithStock.length > 0 
      ? itemsWithStock.reduce((sum, item) => sum + item.current_stock, 0) / itemsWithStock.length 
      : 0;
    
    // Calculate total items needing reorder
    const itemsNeedingReorder = items.filter(item => {
      const rule = reorderRules.find(r => r.item_id === item.id);
      return rule && rule.is_active && item.current_stock <= rule.min_stock;
    }).length;

    return {
      totalItems,
      totalValue,
      lowStockItems,
      criticalItems,
      activeRules,
      averageStockLevel,
      itemsNeedingReorder,
      outOfStockItems: items.filter(item => item.current_stock === 0).length,
      totalStockQuantity: items.reduce((sum, item) => sum + item.current_stock, 0)
    };
  };

  const generateStockMovementReport = () => {
    return items.map(item => {
      const rule = reorderRules.find(r => r.item_id === item.id);
      const alert = alerts.find(a => a.item_id === item.id && !a.is_resolved);
      
      // Determine stock status based on reorder rules
      let status = 'Good';
      if (item.current_stock === 0) {
        status = 'Out of Stock';
      } else if (rule && rule.is_active) {
        if (item.current_stock <= rule.min_stock) {
          status = alert?.severity === 'critical' ? 'Critical' : 'Low';
        } else if (item.current_stock <= rule.min_stock * 1.5) {
          status = 'Medium';
        }
      }
      
      return {
        itemName: item.name,
        sku: item.sku,
        currentStock: item.current_stock,
        unitPrice: item.unit_price || 0,
        totalValue: item.current_stock * (item.unit_price || 0),
        status,
        reorderPoint: rule?.min_stock || 'N/A',
        lastUpdated: item.updated_at || new Date().toISOString(),
        daysSinceLastUpdate: item.updated_at 
          ? Math.floor((new Date() - new Date(item.updated_at)) / (1000 * 60 * 60 * 24))
          : 0
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  };

  const generateReorderAnalysis = () => {
    return reorderRules.map(rule => {
      const item = items.find(i => i.id === rule.item_id);
      const alert = alerts.find(a => a.item_id === item?.id && !a.is_resolved);
      
      // Calculate days of stock remaining
      let daysOfStock = 0;
      if (item && item.current_stock > 0 && rule.reorder_quantity > 0) {
        // Estimate daily consumption based on historical data or use reorder quantity as proxy
        const estimatedDailyUsage = rule.reorder_quantity / 30; // Assume monthly consumption
        daysOfStock = Math.floor(item.current_stock / estimatedDailyUsage);
      }
      
      // Calculate rule performance
      let performance = 'Good';
      if (!rule.is_active) {
        performance = 'Inactive';
      } else if (item && item.current_stock <= rule.min_stock) {
        performance = alert?.severity === 'critical' ? 'Critical' : 'Needs Attention';
      } else if (item && item.current_stock <= rule.min_stock * 1.2) {
        performance = 'Warning';
      }
      
      return {
        itemName: item?.name || 'Unknown',
        sku: item?.sku || 'N/A',
        ruleType: rule.rule_type,
        minStock: rule.min_stock,
        maxStock: rule.max_stock,
        currentStock: item?.current_stock || 0,
        reorderPoint: rule.min_stock,
        status: rule.is_active ? 'Active' : 'Inactive',
        daysOfStock,
        performance,
        reorderQuantity: rule.reorder_quantity,
        safetyStock: rule.safety_stock,
        leadTime: rule.lead_time_days,
        lastAlert: alert?.created_at || null,
        efficiency: item && rule.is_active 
          ? ((item.current_stock / rule.min_stock) * 100).toFixed(1) + '%'
          : 'N/A'
      };
    }).sort((a, b) => {
      // Sort by performance priority
      const performanceOrder = { 'Critical': 0, 'Needs Attention': 1, 'Warning': 2, 'Good': 3, 'Inactive': 4 };
      return performanceOrder[a.performance] - performanceOrder[b.performance];
    });
  };

  const getReportData = () => {
    switch (selectedReport) {
      case "inventory-summary":
        return generateInventorySummary();
      case "stock-movement":
        return generateStockMovementReport();
      case "reorder-analysis":
        return generateReorderAnalysis();
      default:
        return null;
    }
  };

  const exportToCSV = () => {
    const data = getReportData();
    if (!data) return;

    let csvContent = '';
    
    if (selectedReport === "inventory-summary") {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Items,${data.totalItems}\n`;
      csvContent += `Total Inventory Value,$${data.totalValue.toFixed(2)}\n`;
      csvContent += `Low Stock Items,${data.lowStockItems}\n`;
      csvContent += `Critical Items,${data.criticalItems}\n`;
      csvContent += `Active Reorder Rules,${data.activeRules}\n`;
      csvContent += `Average Stock Level,${data.averageStockLevel.toFixed(1)}\n`;
    } else {
      // Table data for other reports
      const headers = Object.keys(data[0] || {});
      csvContent = headers.join(',') + '\n';
      data.forEach(row => {
        csvContent += headers.map(header => row[header]).join(',') + '\n';
      });
    }

    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading Reports...</p>
      </div>
    );
  }

  const currentData = getReportData();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Reports & Analytics</h1>
      <p style={{ color: "#6b7280", marginBottom: "30px" }}>
        Comprehensive inventory insights for planning and decision making
      </p>

      {/* Report Controls */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "30px",
        padding: "20px",
        backgroundColor: "white",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#374151", fontWeight: "500" }}>Report Type</label>
            <select 
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              style={{ 
                padding: "10px 15px", 
                borderRadius: "8px", 
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                fontSize: "14px",
                minWidth: "200px",
                cursor: "pointer"
              }}
            >
              <option value="inventory-summary">Inventory Summary</option>
              <option value="stock-movement">Stock Movement Report</option>
              <option value="reorder-analysis">Reorder Analysis</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#374151", fontWeight: "500" }}>Date Range</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                style={{ 
                  padding: "10px", 
                  borderRadius: "8px", 
                  border: "1px solid #d1d5db",
                  fontSize: "14px"
                }}
              />
              <span style={{ color: "#6b7280" }}>to</span>
              <input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                style={{ 
                  padding: "10px", 
                  borderRadius: "8px", 
                  border: "1px solid #d1d5db",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input 
              type="checkbox" 
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="autoRefresh" style={{ color: "#374151", fontSize: "14px", cursor: "pointer" }}>
              Auto-refresh (30s)
            </label>
          </div>
          <div style={{ 
            padding: "8px 12px", 
            backgroundColor: "#f3f4f6", 
            borderRadius: "6px", 
            fontSize: "12px", 
            color: "#6b7280" 
          }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "30px" }}>
        <button
          onClick={exportToCSV}
          style={{
            padding: "10px 20px",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          📊 Export to CSV
        </button>
      </div>

      {/* Report Content */}
      <div style={{ 
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #e2e8f0"
      }}>
        {selectedReport === "inventory-summary" && currentData && (
          <div>
            <h2 style={{ marginBottom: "20px", color: "#1f2937" }}>Inventory Summary</h2>
            
            {/* Metrics Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              <div style={{ 
                backgroundColor: "#f0f9ff", 
                padding: "20px", 
                borderRadius: "8px", 
                border: "1px solid #0ea5e9" 
              }}>
                <h3 style={{ color: "#0c4a6e", marginBottom: "8px" }}>Total Items</h3>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#0284c7", margin: "0" }}>
                  {currentData.totalItems}
                </p>
              </div>
              
              <div style={{ 
                backgroundColor: "#f3e8ff", 
                padding: "20px", 
                borderRadius: "8px", 
                border: "1px solid #d8b4fe" 
              }}>
                <h3 style={{ color: "#6b21a8", marginBottom: "8px" }}>Active Rules</h3>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#9333ea", margin: "0" }}>
                  {currentData.activeRules}
                </p>
              </div>
              
              <div style={{ 
                backgroundColor: "#f0f4f8", 
                padding: "20px", 
                borderRadius: "8px", 
                border: "1px solid #cbd5e1" 
              }}>
                <h3 style={{ color: "#475569", marginBottom: "8px" }}>Avg Stock Level</h3>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#64748b", margin: "0" }}>
                  {currentData.averageStockLevel.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Notification Boxes Section */}
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ marginBottom: "20px", color: "#1f2937", fontSize: "1.25rem", fontWeight: "600" }}>Active Notifications</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                
                {/* Low Stock Alerts */}
                <div style={{ 
                  backgroundColor: "#fef2f2", 
                  padding: "15px", 
                  borderRadius: "8px", 
                  border: "1px solid #fca5a5",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <div style={{
                    backgroundColor: "#dc2626",
                    color: "white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: "bold",
                    flexShrink: 0
                  }}>
                    3
                  </div>
                  <div>
                    <h4 style={{ margin: "0", color: "#991b1b", fontSize: "14px", fontWeight: "600" }}>LOW STOCK ALERTS</h4>
                    <p style={{ margin: "0", color: "#7f1d1d", fontSize: "12px" }}>Items need restocking</p>
                  </div>
                </div>

                {/* Critical Stock Alerts */}
                <div style={{ 
                  backgroundColor: "#fef3c7", 
                  padding: "15px", 
                  borderRadius: "8px", 
                  border: "1px solid #fcd34d",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <div style={{
                    backgroundColor: "#d97706",
                    color: "white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: "bold",
                    flexShrink: 0
                  }}>
                    1
                  </div>
                  <div>
                    <h4 style={{ margin: "0", color: "#92400e", fontSize: "14px", fontWeight: "600" }}>CRITICAL STOCK ALERTS</h4>
                    <p style={{ margin: "0", color: "#78350f", fontSize: "12px" }}>Immediate attention needed</p>
                  </div>
                </div>

                {/* Pending Reorders */}
                <div style={{ 
                  backgroundColor: "#f0f9ff", 
                  padding: "15px", 
                  borderRadius: "8px", 
                  border: "1px solid #0ea5e9",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <div style={{
                    backgroundColor: "#0284c7",
                    color: "white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: "bold",
                    flexShrink: 0
                  }}>
                    5
                  </div>
                  <div>
                    <h4 style={{ margin: "0", color: "#0c4a6e", fontSize: "14px", fontWeight: "600" }}>PENDING REORDERS</h4>
                    <p style={{ margin: "0", color: "#075985", fontSize: "12px" }}>Awaiting approval</p>
                  </div>
                </div>

                {/* Expiring Soon */}
                <div style={{ 
                  backgroundColor: "#f3e8ff", 
                  padding: "15px", 
                  borderRadius: "8px", 
                  border: "1px solid #d8b4fe",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <div style={{
                    backgroundColor: "#9333ea",
                    color: "white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: "bold",
                    flexShrink: 0
                  }}>
                    2
                  </div>
                  <div>
                    <h4 style={{ margin: "0", color: "#6b21a8", fontSize: "14px", fontWeight: "600" }}>EXPIRING SOON</h4>
                    <p style={{ margin: "0", color: "#581c87", fontSize: "12px" }}>Within 30 days</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Additional Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
              <div style={{ 
                backgroundColor: "#fefce8", 
                padding: "20px", 
                borderRadius: "8px", 
                border: "1px solid #fde047" 
              }}>
                <h3 style={{ color: "#713f12", marginBottom: "8px" }}>Items Needing Reorder</h3>
                <p style={{ fontSize: "20px", fontWeight: "bold", color: "#a16207", margin: "0" }}>
                  {currentData.itemsNeedingReorder}
                </p>
              </div>
              
              <div style={{ 
                backgroundColor: "#f1f5f9", 
                padding: "20px", 
                borderRadius: "8px", 
                border: "1px solid #cbd5e1" 
              }}>
                <h3 style={{ color: "#334155", marginBottom: "8px" }}>Out of Stock Items</h3>
                <p style={{ fontSize: "20px", fontWeight: "bold", color: "#475569", margin: "0" }}>
                  {currentData.outOfStockItems}
                </p>
              </div>
              
              <div style={{ 
                backgroundColor: "#ecfdf5", 
                padding: "20px", 
                borderRadius: "8px", 
                border: "1px solid #a7f3d0" 
              }}>
                <h3 style={{ color: "#065f46", marginBottom: "8px" }}>Total Stock Quantity</h3>
                <p style={{ fontSize: "20px", fontWeight: "bold", color: "#047857", margin: "0" }}>
                  {currentData.totalStockQuantity}
                </p>
              </div>
            </div>
          </div>
        )}

        {(selectedReport === "stock-movement" || selectedReport === "reorder-analysis") && currentData && (
          <div>
            <h2 style={{ marginBottom: "20px", color: "#1f2937" }}>
              {selectedReport === "stock-movement" ? "Stock Movement Report" : "Reorder Analysis"}
            </h2>

            {/* Data Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    {selectedReport === "stock-movement" ? (
                      <>
                        <th style={{ padding: "12px", textAlign: "left" }}>Item</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>SKU</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Current Stock</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Unit Price</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Total Value</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: "12px", textAlign: "left" }}>Item</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>SKU</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Rule Type</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Min Stock</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Current Stock</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Performance</th>
                        <th style={{ padding: "12px", textAlign: "left" }}>Days of Stock</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((row, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      {selectedReport === "stock-movement" ? (
                        <>
                          <td style={{ padding: "12px" }}>{row.itemName}</td>
                          <td style={{ padding: "12px" }}>{row.sku}</td>
                          <td style={{ padding: "12px" }}>{row.currentStock}</td>
                          <td style={{ padding: "12px" }}>${row.unitPrice.toFixed(2)}</td>
                          <td style={{ padding: "12px" }}>${row.totalValue.toFixed(2)}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              backgroundColor: row.status === 'Low' ? '#ef4444' : row.status === 'Medium' ? '#f59e0b' : row.status === 'Critical' ? '#dc2626' : row.status === 'Out of Stock' ? '#6b7280' : '#10b981',
                              color: "white"
                            }}>
                              {row.status}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "12px" }}>{row.itemName}</td>
                          <td style={{ padding: "12px" }}>{row.sku}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              backgroundColor: row.ruleType === 'dynamic' ? '#8b5cf6' : '#3b82f6',
                              color: "white"
                            }}>
                              {row.ruleType}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>{row.minStock}</td>
                          <td style={{ padding: "12px" }}>{row.currentStock}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              backgroundColor: row.status === 'Active' ? '#10b981' : '#6b7280',
                              color: "white"
                            }}>
                              {row.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              backgroundColor: row.performance === 'Critical' ? '#ef4444' : row.performance === 'Needs Attention' ? '#f59e0b' : row.performance === 'Warning' ? '#f97316' : row.performance === 'Inactive' ? '#6b7280' : '#10b981',
                              color: "white"
                            }}>
                              {row.performance}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>{row.daysOfStock}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
