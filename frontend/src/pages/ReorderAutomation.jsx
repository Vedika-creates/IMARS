import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import "./Reorder.css";

const ReorderAutomation = () => {
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reorderRules, setReorderRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("manage-rules");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(false);

  // Rule form state for creating/editing rules
  const [ruleForm, setRuleForm] = useState({
    item_id: "",
    warehouse_id: "",
    rule_type: "min_max",
    min_stock: "",
    max_stock: "",
    safety_stock: "",
    lead_time_days: "",
    reorder_quantity: "",
    demand_forecast_days: "",
    service_level_percent: "",
    is_active: true,
    auto_create_po: false,
    preferred_supplier_id: ""
  });
  const [editingRule, setEditingRule] = useState(null);
  const [showRuleForm, setShowRuleForm] = useState(false);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch all necessary data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchItems(),
      fetchAlerts(),
      fetchReorderRules()
    ]);
    setLoading(false);
  };

  /* ================= FETCH DATA ================= */
  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          suppliers(name, contact_person, phone, email)
        `)
        .order('name');
      
      if (error) {
        console.error('Fetch items error:', error);
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error('Items fetch error:', err);
      setItems([]);
    }
  };

  const fetchAlerts = async () => {
    try {
      console.log('🔍 Fetching alerts...');
      const { data, error } = await supabase
        .from('reorder_alerts')
        .select(`
          *,
          items(name, sku, unit_of_measure)
        `)
        .eq('is_resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });
      
      console.log('📊 Alerts query result:', { data, error });
      
      if (error) {
        console.error('Fetch alerts error:', error);
        setAlerts([]);
      } else {
        console.log(`✅ Found ${data?.length || 0} alerts`);
        setAlerts(data || []);
      }
    } catch (err) {
      console.error('Alerts fetch error:', err);
      setAlerts([]);
    }
  };

  const fetchReorderRules = async () => {
    try {
      const { data, error } = await supabase
        .from('reorder_rules')
        .select(`
          *,
          items(name, sku),
          warehouses(name)
        `)
        .eq('is_active', true)  // ✅ IMPORTANT: Only show active rules
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Fetch reorder rules error:', error);
        setReorderRules([]);
      } else {
        setReorderRules(data || []);
      }
    } catch (err) {
      console.error('Reorder rules fetch error:', err);
      setReorderRules([]);
    }
  };

  /* ================= REORDER RULES ENGINE ================= */
  const calculateReorderQuantity = (item, rule) => {
    // Dynamic reorder based on consumption history
    if (rule.rule_type === 'dynamic') {
      // Calculate based on average daily usage and lead time
      const avgDailyUsage = rule.demand_forecast_days || 1;
      const leadTime = rule.lead_time_days || 7;
      const safetyStock = rule.safety_stock || 0;
      
      // Reorder quantity = (avg daily usage × lead time) + safety stock - current stock
      const reorderQty = (avgDailyUsage * leadTime) + safetyStock - item.current_stock;
      return Math.max(rule.min_stock || 1, reorderQty);
    }
    
    // Min-max rule
    if (rule.rule_type === 'min_max') {
      return rule.reorder_quantity || (rule.max_stock - item.current_stock);
    }
    
    return rule.reorder_quantity || 10;
  };

  const evaluateReorderRules = async () => {
    if (!autoReorderEnabled) return;

    console.log('🔍 Evaluating reorder rules...');
    let newAlerts = 0;
    
    // Fetch fresh items data to ensure we have current active items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, sku, current_stock')
      .eq('is_active', true);

    if (itemsError) {
      console.error('❌ Fetch items error:', itemsError);
      setReorderRules([]);
      return;
    }

    console.log('📊 Fresh items data for evaluation:', items);

    for (const rule of reorderRules) {
      const item = items.find(i => i.id === rule.item_id);
      if (!item) {
        console.log('⚠️ Item not found for rule:', rule.item_id);
        continue;
      }

      const shouldReorder = item.current_stock <= rule.min_stock;
      
      if (shouldReorder) {
        const reorderQuantity = calculateReorderQuantity(item, rule);
        const severity = item.current_stock <= (rule.min_stock / 2) ? 'critical' : 'warning';
        
        // Create alert
        await createReorderAlert(item, rule, reorderQuantity, severity);
        newAlerts++;
        
        // Send email for critical alerts (DISABLED - email_logs table doesn't exist)
        // if (severity === 'critical' && emailNotifications) {
        //   await sendCriticalStockEmail(item, rule, reorderQuantity);
        // }
      }
    }
    
    console.log(`✅ Reorder evaluation complete. Created ${newAlerts} new alerts.`);
    await fetchAllData();
  };

  /* ================= CONSUMPTION HISTORY ================= */
  const calculateConsumptionHistory = async (itemId, days = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('stock_transactions')
        .select('quantity, created_at')
        .eq('item_id', itemId)
        .eq('transaction_type', 'out')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', new Date().toISOString());

      if (error || !data) return 0;

      const totalConsumption = data.reduce((sum, transaction) => sum + Math.abs(transaction.quantity), 0);
      return Math.round(totalConsumption / days); // Average daily consumption
    } catch (err) {
      console.error('Calculate consumption history error:', err);
      return 0;
    }
  };

  /* ================= ALERT MANAGEMENT ================= */
  const createReorderAlert = async (item, rule, reorderQuantity, severity) => {
    try {
      // Check if alert already exists for this item
      const { data: existingAlert } = await supabase
        .from('reorder_alerts')
        .select('id')
        .eq('item_id', item.id)
        .eq('is_resolved', false)
        .single();

      if (existingAlert) return; // Alert already exists

      const { data, error } = await supabase
        .from('reorder_alerts')
        .insert({
          item_id: item.id,
          current_stock: item.current_stock,
          reorder_point: rule.min_stock,
          suggested_qty: reorderQuantity,
          severity: severity,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('Create reorder alert error:', error);
      } else {
        console.log(`✅ Created ${severity} alert for ${item.name}`);
      }
    } catch (err) {
      console.error('Create reorder alert error:', err);
    }
  };

  /* ================= REORDER RULES CRUD ================= */
  const handleCreateRule = async () => {
    try {
      // Validate required fields
      if (!ruleForm.item_id || !ruleForm.min_stock || !ruleForm.reorder_quantity) {
        alert('Please fill in all required fields');
        return;
      }

      // Convert and validate numbers
      const reorderPoint = Number(ruleForm.min_stock);
      const reorderQuantity = Number(ruleForm.reorder_quantity);
      
      // Validate numeric values
      if (Number.isNaN(reorderPoint) || Number.isNaN(reorderQuantity)) {
        alert('Invalid numeric values for min stock or reorder quantity');
        return;
      }

      // Step 1: Verify what we are inserting
      console.log("Creating reorder rule with:", {
        item_id: ruleForm.item_id,
        reorder_point: reorderPoint,
        reorder_quantity: reorderQuantity,
        rule_type: ruleForm.rule_type
      });

      const { data, error } = await supabase
        .from('reorder_rules')
        .insert({
          item_id: ruleForm.item_id,
          reorder_point: reorderPoint, // Fixed: Use reorder_point instead of min_stock
          warehouse_id: ruleForm.warehouse_id || null,
          rule_type: ruleForm.rule_type,
          max_stock: ruleForm.max_stock ? parseInt(ruleForm.max_stock) : null,
          safety_stock: ruleForm.safety_stock ? parseInt(ruleForm.safety_stock) : 0,
          lead_time_days: parseInt(ruleForm.lead_time_days) || 7,
          reorder_quantity: reorderQuantity,
          demand_forecast_days: ruleForm.demand_forecast_days ? parseInt(ruleForm.demand_forecast_days) : 30,
          service_level_percent: ruleForm.service_level_percent ? parseFloat(ruleForm.service_level_percent) : 95,
          is_active: ruleForm.is_active,
          auto_create_po: ruleForm.auto_create_po,
          preferred_supplier_id: ruleForm.preferred_supplier_id || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Create rule error:', error);
        alert('Failed to create rule: ' + error.message);
      } else {
        console.log('✅ Rule created successfully:', data);
        await fetchReorderRules();
        resetRuleForm();
        alert('Reorder rule created successfully!');
      }
    } catch (err) {
      console.error('Create rule error:', err);
      alert('Failed to create rule');
    }
  };

  const handleUpdateRule = async (ruleId) => {
    try {
      const { data, error } = await supabase
        .from('reorder_rules')
        .update({
          item_id: ruleForm.item_id,
          warehouse_id: ruleForm.warehouse_id || null,
          rule_type: ruleForm.rule_type,
          reorder_point: parseInt(ruleForm.min_stock), // Changed from min_stock to reorder_point
          max_stock: ruleForm.max_stock ? parseInt(ruleForm.max_stock) : null,
          safety_stock: ruleForm.safety_stock ? parseInt(ruleForm.safety_stock) : 0,
          lead_time_days: parseInt(ruleForm.lead_time_days) || 7,
          reorder_quantity: parseInt(ruleForm.reorder_quantity),
          demand_forecast_days: ruleForm.demand_forecast_days ? parseInt(ruleForm.demand_forecast_days) : 30,
          service_level_percent: ruleForm.service_level_percent ? parseFloat(ruleForm.service_level_percent) : 95,
          is_active: ruleForm.is_active,
          auto_create_po: ruleForm.auto_create_po,
          preferred_supplier_id: ruleForm.preferred_supplier_id || null,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select()
        .single();

      if (error) {
        console.error('Update rule error:', error);
        alert('Failed to update rule: ' + error.message);
      } else {
        console.log('✅ Rule updated successfully:', data);
        await fetchReorderRules();
        resetRuleForm();
        setEditingRule(null);
        alert('Reorder rule updated successfully!');
      }
    } catch (err) {
      console.error('Update rule error:', err);
      alert('Failed to update rule');
    }
  };

  const handleToggleRuleStatus = async (ruleId, currentStatus) => {
    console.log('🔄 Toggle rule status button clicked for rule:', ruleId, 'from:', currentStatus, 'to:', !currentStatus);
    
    if (!confirm(`Are you sure you want to ${!currentStatus ? 'enable' : 'disable'} this reorder rule? This will ${currentStatus ? 'enable' : 'disable'} automated reorder checks.`)) {
      console.log('❌ User cancelled rule status toggle');
      return;
    }

    try {
      console.log('🔄 Attempting to toggle rule status:', ruleId, 'from:', currentStatus, 'to:', !currentStatus);
      
      const { error } = await supabase
        .from('reorder_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) {
        console.error('Toggle rule status error:', error);
        alert('Failed to toggle rule status');
      } else {
        await fetchReorderRules();
      }
    } catch (err) {
      console.error('Toggle rule status error:', err);
      alert('Failed to toggle rule status');
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      item_id: "",
      warehouse_id: "",
      rule_type: "min_max",
      min_stock: "",
      max_stock: "",
      safety_stock: "",
      lead_time_days: "",
      reorder_quantity: "",
      demand_forecast_days: "",
      service_level_percent: "",
      is_active: true,
      auto_create_po: false,
      preferred_supplier_id: ""
    });
    setEditingRule(null);
  };

  const loadRuleForEdit = (rule) => {
    setRuleForm({
      item_id: rule.item_id,
      warehouse_id: rule.warehouse_id || "",
      rule_type: rule.rule_type,
      min_stock: rule.min_stock?.toString() || "",
      max_stock: rule.max_stock?.toString() || "",
      safety_stock: rule.safety_stock?.toString() || "",
      lead_time_days: rule.lead_time_days?.toString() || "",
      reorder_quantity: rule.reorder_quantity?.toString() || "",
      demand_forecast_days: rule.demand_forecast_days?.toString() || "",
      service_level_percent: rule.service_level_percent?.toString() || "",
      is_active: rule.is_active,
      auto_create_po: rule.auto_create_po || false,
      preferred_supplier_id: rule.preferred_supplier_id || ""
    });
    setEditingRule(rule);
  };

  /* ================= TEST FUNCTIONS ================= */
  const createTestAlerts = async () => {
    try {
      console.log('🧪 Creating test alerts...');
      
      // Create sample alerts for testing
      const testAlerts = [
        {
          item_id: items[0]?.id || 'test-item-1',
          current_stock: 2,
          reorder_point: 10,
          suggested_qty: 20,
          severity: 'critical',
          status: 'active',
          is_resolved: false
        },
        {
          item_id: items[1]?.id || 'test-item-2', 
          current_stock: 8,
          reorder_point: 15,
          suggested_qty: 15,
          severity: 'warning',
          status: 'active',
          is_resolved: false
        }
      ];

      for (const alertData of testAlerts) {
        const { data, error } = await supabase
          .from('reorder_alerts')
          .insert(alertData)
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to create test alert:', error);
        } else {
          console.log('✅ Test alert created:', data);
        }
      }

      // Refresh alerts
      await fetchAlerts();
      alert('Test alerts created successfully!');
      
    } catch (err) {
      console.error('❌ Error creating test alerts:', err);
      alert('Failed to create test alerts');
    }
  };

  /* ================= EMAIL NOTIFICATIONS ================= */
  const sendCriticalStockEmail = async (item, rule, reorderQuantity) => {
    if (!emailNotifications) return;

    try {
      // This would integrate with your email service (EmailJS, Resend, SendGrid, etc.)
      const emailData = {
        to: user?.email || 'inventory-manager@company.com',
        subject: `🚨 Critical Stock Alert - ${item.name}`,
        template: 'critical-stock-alert',
        data: {
          itemName: item.name,
          itemSku: item.sku,
          currentStock: item.current_stock,
          reorderPoint: rule.min_stock,
          reorderQuantity: reorderQuantity,
          supplierName: item.suppliers?.name || 'Not assigned',
          timestamp: new Date().toLocaleString()
        }
      };

      console.log('📧 Critical stock email data:', emailData);
      // Integration with email service would go here
      // Example: await emailjs.send('service_id', 'template_id', emailData);
      
      // Store email log
      await supabase.from('email_logs').insert({
        to_email: emailData.to,
        subject: emailData.subject,
        context: JSON.stringify(emailData.data)
      });
      
    } catch (err) {
      console.error('Send critical stock email error:', err);
    }
  };

  /* ================= DASHBOARD WIDGETS ================= */
  const getDashboardStats = () => {
    const criticalItems = alerts.filter(a => a.severity === 'critical').length;
    const lowStockItems = alerts.filter(a => a.severity === 'warning').length;
    const activeRules = reorderRules.filter(r => r.is_active).length;
    const itemsNeedingReorder = items.filter(item => {
      const rule = reorderRules.find(r => r.item_id === item.id);
      return rule && item.current_stock <= rule.min_stock;
    }).length;

    return {
      criticalItems,
      lowStockItems,
      activeRules,
      itemsNeedingReorder,
      totalAlerts: alerts.length
    };
  };

  /* ================= UI HELPERS ================= */
  const getAlertSeverityClass = (severity) => {
    if (severity === 'critical') return 'alert-critical';
    if (severity === 'warning') return 'alert-warning';
    return 'alert-info';
  };

  const getRuleTypeLabel = (ruleType) => {
    switch (ruleType) {
      case 'min_max': return 'Min-Max';
      case 'dynamic': return 'Dynamic';
      default: return 'Standard';
    }
  };

  if (loading) return <p>Loading Reorder Automation System...</p>;

  const stats = getDashboardStats();

  return (
    <div className="reorder-automation-container">
      <div>
        <h1>Reorder Automation & Alerts</h1>
        <p className="reorder-subtitle">
          Intelligent inventory monitoring with reorder rules and automated alerts
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav" style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px'
      }}>
        <button 
          className={`tab-button ${activeTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveTab("rules")}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === "rules" ? '#3b82f6' : '#f3f4f6',
            color: activeTab === "rules" ? 'white' : '#374151',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reorder Rules
        </button>
        <button 
          className={`tab-button ${activeTab === "manage-rules" ? "active" : ""}`}
          onClick={() => setActiveTab("manage-rules")}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === "manage-rules" ? '#3b82f6' : '#f3f4f6',
            color: activeTab === "manage-rules" ? 'white' : '#374151',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Manage Rules
        </button>
      </div>

      {/* Reorder Rules Tab Content */}
      {activeTab === "rules" && (
        <div>
          <h2>Reorder Rules Configuration</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Create new reorder rules for automated inventory management
          </p>
          
          {/* Add New Rule Button */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowRuleForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>+</span> Create New Reorder Rule
            </button>
          </div>

          {/* Rule Form */}
          {showRuleForm && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
                {editingRule ? 'Edit Reorder Rule' : 'Create New Reorder Rule'}
              </h3>
　　 　 　 　 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Item Selection */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                    Item *
                  </label>
                  <select
                    value={ruleForm.item_id}
                    onChange={(e) => setRuleForm({...ruleForm, item_id: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                    required
                  >
                    <option value="">Select an item...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rule Type */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                    Rule Type *
                  </label>
                  <select
                    value={ruleForm.rule_type}
                    onChange={(e) => setRuleForm({...ruleForm, rule_type: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="min_max">Min/Max Level</option>
                    <option value="dynamic">Dynamic (Demand-based)</option>
                    <option value="periodic">Periodic Review</option>
                  </select>
                </div>

                {/* Min Stock */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                    Minimum Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.min_stock}
                    onChange={(e) => setRuleForm({...ruleForm, min_stock: e.target.value})}
                    placeholder="Minimum stock level"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                    required
                  />
                </div>

                {/* Max Stock */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                    Maximum Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.max_stock}
                    onChange={(e) => setRuleForm({...ruleForm, max_stock: e.target.value})}
                    placeholder="Maximum stock level (optional)"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Safety Stock */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                    Safety Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.safety_stock}
                    onChange={(e) => setRuleForm({...ruleForm, safety_stock: e.target.value})}
                    placeholder="Buffer stock quantity"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Lead Time */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.lead_time_days}
                    onChange={(e) => setRuleForm({...ruleForm, lead_time_days: e.target.value})}
                    placeholder="Days to receive order"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                  />
                </div>

                {/* Reorder Quantity */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                    Reorder Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ruleForm.reorder_quantity}
                    onChange={(e) => setRuleForm({...ruleForm, reorder_quantity: e.target.value})}
                    placeholder="Quantity to reorder"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                    required
                  />
                </div>

                {/* Dynamic Rule Fields */}
                {ruleForm.rule_type === 'dynamic' && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                        Demand Forecast (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={ruleForm.demand_forecast_days}
                        onChange={(e) => setRuleForm({...ruleForm, demand_forecast_days: e.target.value})}
                        placeholder="Days to forecast demand"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#374151' }}>
                        Service Level (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={ruleForm.service_level_percent}
                        onChange={(e) => setRuleForm({...ruleForm, service_level_percent: e.target.value})}
                        placeholder="Target service level"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Additional Options */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={ruleForm.is_active}
                    onChange={(e) => setRuleForm({...ruleForm, is_active: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 'bold', color: '#374151' }}>Activate Rule</span>
                </label>
　 　 　 　 　 <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={ruleForm.auto_create_po}
                    onChange={(e) => setRuleForm({...ruleForm, auto_create_po: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 'bold', color: '#374151' }}>Auto-create Purchase Order</span>
                </label>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleCreateRule}
                  disabled={!ruleForm.item_id || !ruleForm.min_stock || !ruleForm.reorder_quantity}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: (!ruleForm.item_id || !ruleForm.min_stock || !ruleForm.reorder_quantity) ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!ruleForm.item_id || !ruleForm.min_stock || !ruleForm.reorder_quantity) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
　 　 　 　 　 <button
                  onClick={() => {
                    setShowRuleForm(false);
                    setEditingRule(null);
                    resetRuleForm();
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing Rules Summary */}
          {reorderRules.length > 0 && (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <h4 style={{ color: '#0c4a6e', marginBottom: '8px' }}>Current Rules Summary</h4>
              <p style={{ color: '#0e7490', margin: '0' }}>
                You have {reorderRules.length} active reorder rule{reorderRules.length !== 1 ? 's' : ''} configured. 
                Switch to the "Manage Rules" tab to view and edit existing rules.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manage Rules Tab Content */}
      {activeTab === "manage-rules" && (
        <div>
          <h2>Manage Reorder Rules</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Active reorder rules for inventory management
          </p>

          {reorderRules.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              border: '2px solid #86efac'
            }}>
              <h3 style={{ color: '#16a34a', marginBottom: '10px' }}>No Reorder Rules Configured</h3>
              <p style={{ color: '#15803d' }}>Set up reorder rules to enable automated inventory management</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Rule Type</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Min Stock</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Max Stock</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Safety Stock</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Lead Time</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Reorder Qty</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderRules.map(rule => {
                    const item = items.find(i => i.id === rule.item_id);
                    return (
                      <tr key={rule.id}>
                        <td style={{ padding: '12px' }}>
                          {item?.name || 'Unknown Item'}
                          <br />
                          <small style={{ color: '#6b7280' }}>{item?.sku}</small>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '12px',
                            backgroundColor: rule.rule_type === 'dynamic' ? '#8b5cf6' : '#3b82f6',
                            color: 'white'
                          }}>
                            {getRuleTypeLabel(rule.rule_type)}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{rule.min_stock}</td>
                        <td style={{ padding: '12px' }}>{rule.max_stock || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>{rule.safety_stock}</td>
                        <td style={{ padding: '12px' }}>{rule.lead_time_days}d</td>
                        <td style={{ padding: '12px' }}>{rule.reorder_quantity}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '12px',
                            backgroundColor: rule.is_active ? '#10b981' : '#6b7280',
                            color: 'white'
                          }}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {/* Actions column removed - no modify/remove buttons */}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
export default ReorderAutomation;