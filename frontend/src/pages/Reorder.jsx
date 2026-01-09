import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { sendAlertEmail } from "../utils/email";
import "./Reorder.css";

const Reorder = () => {
  console.log('🚀 Reorder component mounting...');
  
  const [alerts, setAlerts] = useState([]);
  const [autoPODrafts, setAutoPODrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("alerts");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoPOEnabled, setAutoPOEnabled] = useState(true); // Set to true by default
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log('🚀 Reorder useEffect running...');
    // Test Supabase connection first
    testSupabaseConnection();
    fetchRole();
    fetchReorderSuggestions();
    fetchPOSuggestions();
    
    // Add real-time subscription for item changes
    const subscription = supabase
      .channel('reorder_items_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'items' },
        () => {
          console.log('🔄 Reorder: Items changed, refreshing...');
          fetchReorderSuggestions();
          fetchPOSuggestions();
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  /* ================= SQL QUERY FOR RLS CHECK ================= */
const rlsCheckQuery = `
-- Check existing RLS policies on the items table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'items';

-- Check if RLS is enabled on the items table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'items';

-- Test direct query to items table
SELECT id, sku, name, current_stock 
FROM items 
LIMIT 5;
`;

console.log('🔍 SQL Query for RLS Check:');
console.log(rlsCheckQuery);
  /* ================= TEST SUPABASE CONNECTION ================= */
  const testSupabaseConnection = async () => {
    try {
      console.log('🔍 Testing Supabase connection...');
      console.log('🔍 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('🔍 Supabase Key present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      // Test 1: Basic connection
      console.log('🔍 Test 1: Basic connection...');
      const { data: basicData, error: basicError } = await supabase
        .from('items')
        .select('id')
        .limit(1);

      console.log('🔍 Basic connection result:', { basicData, basicError });

      if (basicError) {
        console.error('❌ Basic connection failed:', basicError);
        alert(`Basic connection error: ${basicError.message}`);
        return;
      }

      // Test 2: Simple query (same as fetchReorderSuggestions) - NO COLUMN COMPARISON
      console.log('🔍 Test 2: Simple query test...');
      const { data: fullData, error: fullError } = await supabase
        .from('items')
        .select('id, name, sku, current_stock, reorder_point, safety_stock, unit_of_measure, lead_time')
        .limit(5);

      console.log('🔍 Simple query result:', { fullData, fullError });
      console.log('🔍 Simple data length:', fullData?.length);

      if (fullError) {
        console.error('❌ Simple query failed:', fullError);
        alert(`Simple query error: ${fullError.message}`);
        return;
      }

      console.log('✅ All Supabase tests passed!');
      console.log('✅ Found', fullData?.length, 'items');
      
      // Test 3: Check if data is being processed
      if (fullData && fullData.length > 0) {
        console.log('🔍 Processing test data...');
        const testAlert = fullData[0];
        console.log('🔍 Test item:', testAlert);
        console.log('🔍 Test severity:', testAlert.current_stock <= (testAlert.safety_stock ?? 0) ? 'critical' : 'normal');
      }
      
    } catch (err) {
      console.error('❌ Connection error:', err);
      alert(`Connection error: ${err.message}`);
    }
  };

  /* ================= FETCH USER ROLE ================= */
  const fetchRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    } catch (err) {
      console.error('Fetch role error:', err);
      setLoading(false);
    }
  };

  /* ================= EMAIL NOTIFICATION SERVICE ================= */
  const sendEmailNotification = async (type, poData, additionalData = {}) => {
    if (!user?.email) {
      console.log('❌ No user email available for notification');
      alert('❌ Cannot send email: No user email found');
      return;
    }

    console.log('📧 Sending email notification via EmailJS...');
    console.log('📧 User email:', user.email);
    
    try {
      await sendAlertEmail({
        toEmail: user.email, // ✅ Use authenticated user's email
        subject: getEmailSubject(type, poData),
        message: `PO action: ${type} for ${poData.items?.name || 'Item'}`,
        item: poData.items
      });

      alert("📧 Email notification sent successfully");
    } catch (err) {
      console.error('❌ EmailJS error:', err);
      alert('❌ Email failed');
    }
  };

  const getEmailSubject = (type, poData) => {
    switch (type) {
      case 'auto_draft':
        return `🚨 Critical Alert: PO Draft Auto-Generated for ${poData.items?.name || 'Item'}`;
      case 'manual_draft':
        return `📋 PO Draft Created for ${poData.items?.name || 'Item'}`;
      case 'approved':
        return `✅ PO Draft Approved for ${poData.items?.name || 'Item'}`;
      case 'deleted':
        return `🗑️ PO Draft Deleted for ${poData.items?.name || 'Item'}`;
      default:
        return '📧 PO Draft Notification';
    }
  };

  const getEmailBody = (type, poData, additionalData) => {
    const itemName = poData.items?.name || 'Unknown Item';
    const itemSku = poData.items?.sku || 'N/A';
    const quantity = poData.quantity || 0;
    const currentStock = additionalData.currentStock || 'N/A';
    const reorderPoint = additionalData.reorderPoint || 'N/A';

    const baseContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin: 0 0 10px 0;">${getEmailSubject(type, poData)}</h2>
          <p style="color: #6b7280; margin: 0;">Purchase Order Draft Notification</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">Item Details</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Item Name:</span>
              <strong style="color: #1f2937;">${itemName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">SKU:</span>
              <strong style="color: #1f2937;">${itemSku}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Quantity:</span>
              <strong style="color: #1f2937;">${quantity} units</strong>
            </div>
            ${currentStock !== 'N/A' ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Current Stock:</span>
              <strong style="color: #1f2937;">${currentStock}</strong>
            </div>` : ''}
            ${reorderPoint !== 'N/A' ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Reorder Point:</span>
              <strong style="color: #1f2937;">${reorderPoint}</strong>
            </div>` : ''}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${window.location.origin}/reorder" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View PO Drafts
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated notification from your Inventory Management System
          </p>
        </div>
      </div>
    `;

    return baseContent;
  };

  /* ================= FETCH REORDER SUGGESTIONS ================= */
  const fetchReorderSuggestions = async () => {
    try {
      setLoading(true);
      
      console.log('Starting fetchReorderSuggestions...');
      console.log(' autoPOEnabled:', autoPOEnabled);
      
      // ✅ Fetch items with reorder rules and supplier info
      const { data: items, error } = await supabase
        .from('reorder_rules')
        .select(`
          item_id,
          reorder_point,
          safety_stock,
          reorder_quantity,
          preferred_supplier_id,
          items!inner(
            id, 
            name, 
            sku, 
            current_stock, 
            unit_of_measure, 
            lead_time_days,
            suppliers(name)
          )
        `)
        .eq('is_active', true);

      if (error) {
        console.error('Fetch items error:', error);
        setAlerts([]);
        setLoading(false);
        return;
      }
      
      console.log('Raw items from database:', items);
      
      if (!items || items.length === 0) {
        console.log('No items found in database');
        setAlerts([]);
        setLoading(false);
        return;
      }
      
      // Apply ALL logic in frontend (ONLY HERE)
      const criticalItems = items.filter(
        item => item.items.current_stock <= (item.safety_stock ?? 0)
      );

      const lowStockItems = items.filter(
        item =>
          item.items.current_stock <= item.reorder_point &&
          item.items.current_stock > (item.safety_stock ?? 0)
      );
      
      console.log('Critical items:', criticalItems);
      console.log('Low stock items:', lowStockItems);
      
      // Transform critical items into alert format
      const criticalAlerts = criticalItems.map(item => ({
        item_id: item.item_id,
        name: item.items.name,
        sku: item.items.sku,
        current_stock: item.items.current_stock,
        reorder_point: item.reorder_point,
        safety_stock: item.safety_stock,
        suggested_qty: item.reorder_quantity || (item.reorder_point * 2),
        unit_of_measure: item.items.unit_of_measure,
        lead_time: item.items.lead_time_days || 7,
        preferred_supplier_id: item.preferred_supplier_id,
        supplier_name: item.items.suppliers?.name,
        severity: 'critical',
        message: `Critical stock for ${item.items.name}. Current: ${item.items.current_stock}, Safety stock: ${item.safety_stock || 0}`
      }));
      
      // Transform low stock items into alert format
      const lowStockAlerts = lowStockItems.map(item => ({
        item_id: item.item_id,
        name: item.items.name,
        sku: item.items.sku,
        current_stock: item.items.current_stock,
        reorder_point: item.reorder_point,
        safety_stock: item.safety_stock,
        suggested_qty: item.reorder_quantity || (item.reorder_point * 2),
        unit_of_measure: item.items.unit_of_measure,
        lead_time: item.items.lead_time_days || 7,
        preferred_supplier_id: item.preferred_supplier_id,
        supplier_name: item.items.suppliers?.name,
        severity: 'warning',
        message: `Low stock for ${item.items.name}. Current: ${item.items.current_stock}, Reorder point: ${item.reorder_point}`
      }));
      
      // Combine all alerts
      const allAlerts = [...criticalAlerts, ...lowStockAlerts];
      console.log('All alerts:', allAlerts);
      
      // Sort: critical first, then warning
      const sortedAlerts = allAlerts.sort((a, b) => {
        if (a.severity === "critical" && b.severity !== "critical") return -1;
        if (a.severity !== "critical" && b.severity === "critical") return 1;
        return 0;
      });
      
      console.log('Sorted alerts:', sortedAlerts);
      setAlerts(sortedAlerts);
      
      // Auto-generate PO suggestions only (no actual PO creation)
      console.log('Critical items for auto-generation:', criticalAlerts);
      console.log('Critical items count:', criticalAlerts.length);
      console.log('User available:', !!user);
      
      if (criticalAlerts.length > 0 && autoPOEnabled && user) {
        console.log('Critical items detected - ready for PO creation');
        // PO creation will be handled by Purchase Orders section
      } else {
        console.log('Auto-generation conditions not met:', {
          hasCriticalItems: criticalAlerts.length > 0,
          autoPOEnabled,
          hasUser: !!user
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Fetch reorder suggestions error:', err);
      setAlerts([]);
      setLoading(false);
    }
  };

  /* ================= SUGGEST PO CREATION ================= */
  const suggestPOCreation = async (reorderAlert) => {
    if (!user) {
      alert("User not authenticated");
      return;
    }

    try {
      // Create suggested PO record in purchase_orders table (same as auto-generated)
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
          item_id: reorderAlert.item_id,
          supplier_id: reorderAlert.preferred_supplier_id,
          quantity: reorderAlert.suggested_qty,
          status: 'draft',
          created_by: user.id,
          notes: `SUGGESTED: Suggested PO for ${reorderAlert.name}. Current stock: ${reorderAlert.current_stock}`
        })
        .select()
        .single();

      if (error) {
        console.error("PO suggestion error:", error);
        alert("Failed to create PO suggestion");
      } else {
        // Send email notification for suggestion
        await sendEmailNotification('suggested', { items: reorderAlert }, {
          currentStock: reorderAlert.current_stock,
          reorderPoint: reorderAlert.reorder_point
        });
        
        alert("PO suggestion created! Check Purchase Orders section to create PO.");
      }
    } catch (err) {
      console.error("PO suggestion error:", err);
      alert("Failed to create PO suggestion");
    }
  };

  /* ================= FETCH PO SUGGESTIONS ================= */
  const fetchPOSuggestions = async () => {
    try {
      console.log('🔍 Fetching PO suggestions...');
      
      // First, let's see ALL POs without any filter
      const { data: allPOs, error: allError } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 ALL POs in database:', { allPOs, allError });
      console.log('📝 All POs notes:', allPOs?.map(po => ({ id: po.id, notes: po.notes, status: po.status })));

      // Now filter manually in JavaScript
      const suggestedPOs = allPOs?.filter(po => 
        po.notes && po.notes.includes('SUGGESTED')
      ) || [];

      console.log('🎯 Manually filtered PO suggestions:', suggestedPOs);

      if (allError) {
        console.error('Fetch ALL POs error:', allError);
        setAutoPODrafts([]);
      } else {
        console.log('✅ Setting filtered PO suggestions:', suggestedPOs);
        setAutoPODrafts(suggestedPOs);
      }
    } catch (err) {
      console.error('Fetch PO suggestions error:', err);
      setAutoPODrafts([]);
    }
  };

  /* ================= CREATE PO DRAFT ================= */
  const createPODraft = async (reorderAlert) => {
    if (!user) {
      alert("User not authenticated");
      return;
    }

    if (!reorderAlert.preferred_supplier_id) {
      alert("This item doesn't have a preferred supplier. Please set up a supplier for this item first.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
          item_id: reorderAlert.item_id,
          supplier_id: reorderAlert.preferred_supplier_id,
          quantity: reorderAlert.suggested_qty,
          status: "draft",
          created_by: user.id,
          notes: `SUGGESTED: Created from reorder alert for ${reorderAlert.name}. Supplier: ${reorderAlert.supplier_name}`
        })
        .select()
        .single();

      if (error) {
        console.error("PO creation error:", error);
        alert("Failed to create PO draft: " + error.message);
      } else {
        // Send email notification for manual PO creation
        await sendEmailNotification('manual_draft', data, {
          currentStock: reorderAlert.current_stock,
          reorderPoint: reorderAlert.reorder_point
        });
        
        alert("PO Draft created successfully!");
        setTimeout(() => fetchReorderSuggestions(), 1000);
        await fetchPOSuggestions(); // Refresh PO suggestions list
      }
    } catch (err) {
      console.error("PO creation error:", err);
      alert("Failed to create PO draft");
    }
  };

  /* ================= GENERATE PO SUGGESTIONS ================= */
  const generateAutoPODrafts = async () => {
    if (!autoPOEnabled) {
      alert('Auto PO generation is disabled');
      return;
    }

    try {
      // Get items with reorder rules (same as fetchReorderSuggestions)
      const { data: allItems, error: itemsError } = await supabase
        .from('reorder_rules')
        .select(`
          item_id,
          reorder_point,
          safety_stock,
          reorder_quantity,
          preferred_supplier_id,
          items!inner(
            id, 
            name, 
            sku, 
            current_stock, 
            unit_of_measure, 
            lead_time_days
          )
        `)
        .eq('is_active', true);

      if (itemsError) {
        console.error('Fetch items error:', itemsError);
        alert('Failed to fetch items: ' + itemsError.message);
        return;
      }

      console.log('All items for PO suggestions:', allItems);

      // Apply reorder logic in frontend
      const reorderItems = allItems.filter(
        item => item.items.current_stock <= item.reorder_point
      );

      console.log('Items needing reorder:', reorderItems);

      // Apply Min-Max rules and generate PO suggestions
      const poSuggestions = [];
      
      for (const item of reorderItems) {
        let reorderQuantity = 0;
        
        // Apply Min-Max rules
        if (item.items.current_stock <= 5) {
          // Critical items: min 5, max 50
          reorderQuantity = 50 - item.items.current_stock;
        } else if (item.items.current_stock <= 10) {
          // Regular items: min 10, max 100
          reorderQuantity = 100 - item.items.current_stock;
        } else if (item.items.current_stock <= 20) {
          // Slow moving: min 20, max 200
          reorderQuantity = 200 - item.items.current_stock;
        }

        if (reorderQuantity > 0) {
          poSuggestions.push({
            item_id: item.item_id,
            supplier_id: item.preferred_supplier_id,
            suggested_quantity: reorderQuantity,
            status: 'suggested',
            created_by: user?.id,
            notes: `Auto-suggested PO based on Min-Max rules. Current stock: ${item.items.current_stock}, Suggested reorder: ${reorderQuantity}`
          });
        }
      }

      console.log('PO suggestions to create:', poSuggestions);

      // Insert PO suggestions
      if (poSuggestions.length > 0) {
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert(poSuggestions.map(suggestion => ({
            item_id: suggestion.item_id,
            supplier_id: suggestion.supplier_id,
            quantity: suggestion.quantity,
            status: 'draft',
            created_by: suggestion.created_by,
            notes: `SUGGESTED: ${suggestion.notes}`
          })))
          .select();

        if (error) {
          console.error('Generate PO suggestions error:', error);
          alert('Failed to generate PO suggestions: ' + error.message);
        } else {
          console.log('Successfully created PO suggestions:', data);
          alert(`Generated ${poSuggestions.length} PO suggestions!`);
          console.log('🔄 Calling fetchPOSuggestions after generation...');
          await fetchPOSuggestions();
          await fetchReorderSuggestions();
        }
      } else {
        console.log('No items need reordering. Reorder items:', reorderItems);
        console.log('All items with stock levels:', allItems?.map(item => ({
          name: item.items?.name,
          current_stock: item.items?.current_stock,
          reorder_point: item.reorder_point
        })));
        alert('No items need reordering at this time.');
      }
    } catch (err) {
      console.error('Generate PO suggestions error:', err);
      alert('Failed to generate PO suggestions: ' + err.message);
    }
  };

  /* ================= CREATE PO FROM SUGGESTION ================= */
  const createPOFromSuggestion = async (suggestion) => {
    if (!user) {
      alert("User not authenticated");
      return;
    }

    try {
      // Create actual PO from suggestion
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
          item_id: suggestion.item_id,
          supplier_id: suggestion.supplier_id,
          quantity: suggestion.quantity,
          status: "draft",
          created_by: user.id,
          notes: `Created from PO suggestion for ${suggestion.items?.name || 'Item'}`
        })
        .select()
        .single();

      if (error) {
        console.error("PO creation error:", error);
        alert("Failed to create PO from suggestion");
      } else {
        // Send email notification
        await sendEmailNotification('suggested', data, {
          currentStock: suggestion.current_stock,
          reorderPoint: suggestion.reorder_point
        });
        
        // Delete the suggestion after creating PO
        await deletePOSuggestion(suggestion.id);
        
        alert("PO created successfully from suggestion!");
        setTimeout(() => fetchPOSuggestions(), 1000);
      }
    } catch (err) {
      console.error("PO creation error:", err);
      alert("Failed to create PO from suggestion");
    }
  };

  /* ================= DELETE PO SUGGESTION ================= */
  const deletePOSuggestion = async (suggestionId) => {
    if (!confirm('Are you sure you want to delete this PO suggestion?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', suggestionId);

      if (error) {
        console.error('Delete PO suggestion error:', error);
        alert('Failed to delete PO suggestion');
      } else {
        alert('PO suggestion deleted!');
        await fetchPOSuggestions();
      }
    } catch (err) {
      console.error('Delete PO suggestion error:', err);
      alert('Failed to delete PO suggestion');
    }
  };

  /* ================= UI HELPERS ================= */
  const getBadgeClass = (severity) => {
    if (severity === "critical") return "badge-critical";
    if (severity === "warning") return "badge-warning";
    return "badge-info";
  };

  if (loading) return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center', 
      fontSize: '18px',
      backgroundColor: '#f0f9ff',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h2>🔄 Loading Reorder Automation...</h2>
      <p>Checking database connection and fetching inventory data...</p>
    </div>
  );

  return (
    <div className="reorder-container">
      <div>
        <h1>Reorder Automation & Alerts</h1>
        <p className="reorder-subtitle">
          Intelligent inventory monitoring with automated reorder rules and PO draft generation
        </p>
        {user && (
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
            📧 Email notifications will be sent to: <strong>{user.email}</strong>
          </p>
        )}
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
          className={`tab-button ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === "alerts" ? '#3b82f6' : '#f3f4f6',
            color: activeTab === "alerts" ? 'white' : '#374151',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reorder Alerts
        </button>
        <button 
          className={`tab-button ${activeTab === "auto-po" ? "active" : ""}`}
          onClick={() => setActiveTab("auto-po")}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === "auto-po" ? '#3b82f6' : '#f3f4f6',
            color: activeTab === "auto-po" ? 'white' : '#374151',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Auto Create PO
        </button>
      </div>

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div>
          <h2>Reorder Alerts</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Active reorder alerts requiring attention
          </p>

          {/* Critical Stock Square Cards */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#dc2626', marginBottom: '15px' }}>Critical Stock</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '15px' 
            }}>
              {alerts.filter(a => a.severity === 'critical').map(alert => (
                <div key={alert.item_id} style={{
                  padding: '20px',
                  backgroundColor: '#fef2f2',
                  border: '2px solid #dc2626',
                  borderRadius: '8px',
                  textAlign: 'center',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#dc2626', fontSize: '16px', fontWeight: 'bold' }}>
                    {alert.name}
                  </h4>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px' }}>
                    {alert.sku}
                  </p>
                  <div style={{ 
                    backgroundColor: '#fff', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    margin: '10px 0'
                  }}>
                    <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                      {alert.current_stock}
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                      Current Stock
                    </p>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    Reorder: {alert.suggested_qty}
                  </p>
                  {alert.supplier_name && (
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#6b7280' }}>
                      Supplier: {alert.supplier_name}
                    </p>
                  )}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => createPODraft(alert)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        width: '100%'
                      }}
                    >
                      Create PO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Square Cards */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '15px' }}>Low Stock</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '15px' 
            }}>
              {alerts.filter(a => a.severity === 'warning').map(alert => (
                <div key={alert.item_id} style={{
                  padding: '20px',
                  backgroundColor: '#fffbeb',
                  border: '2px solid #f59e0b',
                  borderRadius: '8px',
                  textAlign: 'center',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '16px', fontWeight: 'bold' }}>
                    {alert.name}
                  </h4>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px' }}>
                    {alert.sku}
                  </p>
                  <div style={{ 
                    backgroundColor: '#fff', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    margin: '10px 0'
                  }}>
                    <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                      {alert.current_stock}
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                      Current Stock
                    </p>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#374151' }}>
                    Reorder: {alert.suggested_qty}
                  </p>
                  {alert.supplier_name && (
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#6b7280' }}>
                      Supplier: {alert.supplier_name}
                    </p>
                  )}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      onClick={() => createPODraft(alert)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        width: '100%'
                      }}
                    >
                      Create PO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {alerts.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              border: '2px solid #86efac'
            }}>
              <h3 style={{ color: '#16a34a', marginBottom: '10px' }}>No Active Alerts</h3>
              <p style={{ color: '#15803d' }}>All inventory levels are within acceptable ranges</p>
            </div>
          )}
        </div>
      )}

      {/* Auto Create PO Tab */}
      {activeTab === "auto-po" && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2>Auto Create PO</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setAutoPOEnabled(!autoPOEnabled)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: autoPOEnabled ? '#10b981' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {autoPOEnabled ? 'Auto PO On' : 'Auto PO Off'}
              </button>
              <button
                onClick={generateAutoPODrafts}
                disabled={!autoPOEnabled}
                style={{
                  padding: '8px 16px',
                  backgroundColor: autoPOEnabled ? '#3b82f6' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: autoPOEnabled ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                Generate POs
              </button>
            </div>
          </div>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Automatic PO creation based on inventory reorder points
          </p>

          {/* PO Suggestions */}
          <div>
            <h3 style={{ marginBottom: '15px' }}>PO Suggestions ({autoPODrafts.length})</h3>
            {autoPODrafts.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '2px solid #60a5fa'
              }}>
                <h3 style={{ color: '#1d4ed8', marginBottom: '10px' }}>No PO Suggestions</h3>
                <p style={{ color: '#1e40af' }}>Click "Generate POs" to create PO suggestions based on inventory levels</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {autoPODrafts.map(po => (
                  <div key={po.id} style={{
                    padding: '15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    borderLeft: '4px solid #f59e0b'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, color: '#1f2937', fontSize: '14px' }}>
                        {po.items?.name}
                      </h4>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: '#f59e0b',
                        color: '#fff'
                      }}>
                        SUGGESTED
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                      <p style={{ margin: '2px 0' }}>SKU: {po.items?.sku}</p>
                      <p style={{ margin: '2px 0' }}>Quantity: {po.quantity} {po.items?.unit_of_measure}</p>
                      <p style={{ margin: '2px 0' }}>Supplier: {po.suppliers?.name}</p>
                    </div>

                    <p style={{ margin: '5px 0', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                      {po.notes}
                    </p>

                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                      <button
                        onClick={() => createPOFromSuggestion(po)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Create PO
                      </button>
                      <button
                        onClick={() => deletePOSuggestion(po.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reorder;
