import { useEffect, useState } from "react";
import { supabase } from '../supabase';
import { generateSuggestedPOs, convertSuggestedToManual } from '../utils/suggestedPOGenerator';
import "./suppliers.css";

const PurchaseOrdersSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("suppliers");
  const [role, setRole] = useState("staff");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: ""
  });

  const [poForm, setPoForm] = useState({
    supplier_id: "",
    item_id: "",
    quantity: "",
    source: "manual"
  });

  // Fetch user role and authenticate
  useEffect(() => {
    const fetchRole = async () => {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();

      setRole(profile?.role || 'staff');
    };

    fetchRole();
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch suppliers
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('*')
          .order('name');

        // Fetch purchase orders with supplier names
        const { data: poData, error: poError } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            suppliers(name),
            items(name, sku, unit_of_measure, current_stock),
            source
          `)
          .order('created_at', { ascending: false });

        // Fetch items for PO creation
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('id, name, sku, unit_of_measure, current_stock')
          .order('name');

        if (supplierError) console.error('Supplier fetch error:', supplierError);
        if (poError) console.error('PO fetch error:', poError);
        if (itemError) console.error('Item fetch error:', itemError);

        console.log(' Raw Purchase Orders:', poData);
        console.log(' Purchase Orders with source:', poData.map(po => ({ id: po.id, source: po.source })));

        setSuppliers(supplierData || []);
        setPurchaseOrders(poData || []);
        setItems(itemData || []);
      } catch (error) {
        console.error('Data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const supplierSubscription = supabase
      .channel('supplier_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'suppliers' },
        () => {
          supabase
            .from('suppliers')
            .select('*')
            .order('name')
            .then(({ data }) => {
              if (data) setSuppliers(data);
            });
        }
      )
      .subscribe();

    const poSubscription = supabase
      .channel('po_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'purchase_orders' },
        () => {
          supabase
            .from('purchase_orders')
            .select(`
              *,
              items(name, sku, unit_of_measure),
              suppliers(name, contact_person, phone, email),
              profiles:created_by(full_name),
              source
            `)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
              if (data) setPurchaseOrders(data);
            });
        }
      )
      .subscribe();

    return () => {
      supplierSubscription.unsubscribe();
      poSubscription.unsubscribe();
    };
  }, []);

  // Filter functions
  const getFilteredSuppliers = () => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchTerm || 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  };

  const getFilteredPOs = () => {
    return purchaseOrders.filter(po => {
      const matchesSearch = !searchTerm || 
        po.items?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.items?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.id?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !filterStatus || po.status === filterStatus;
      const matchesSource = !filterSource || categorizePOBySource(po) === filterSource;
      
      return matchesSearch && matchesStatus && matchesSource;
    });
  };

  const getManualPOs = () => {
    const manualPOs = getFilteredPOs().filter(po => {
      const category = categorizePOBySource(po);
      console.log('🔍 Manual PO Check:', po.id, 'source:', po.source, 'category:', category);
      return category === 'manual';
    });
    console.log('🔍 Total Manual POs:', manualPOs.length);
    return manualPOs;
  };

  const getSuggestedPOs = () => {
    const suggestedPOs = getFilteredPOs().filter(po => {
      const category = categorizePOBySource(po);
      console.log('🔍 Suggested PO Check:', po.id, 'source:', po.source, 'category:', category);
      return category === 'suggested';
    });
    console.log('🔍 Total Suggested POs:', suggestedPOs.length);
    return suggestedPOs;
  };

  // Helper function to categorize POs by source
  const categorizePOBySource = (po) => {
    // If source is null, undefined, or not 'suggested', treat as manual
    if (!po.source || po.source === 'manual') {
      return 'manual';
    } else if (po.source === 'suggested') {
      return 'suggested';
    }
    return 'manual'; // Default to manual for safety
  };

  // Generate suggested POs
  const handleGenerateSuggestedPOs = async () => {
    if (!confirm('Generate suggested purchase orders for items below reorder point?')) {
      return;
    }

    try {
      alert('Debug: Starting suggested PO generation...');
      const result = await generateSuggestedPOs();
      
      alert(`Debug: Result - Success: ${result.success}, Created: ${result.createdPOs}, Message: ${result.message}`);
      
      if (result.success) {
        alert(result.message || 'Suggested POs generated successfully!');
        
        // Refresh the purchase orders data
        const { data: newPOData } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            suppliers(name),
            items(name, sku, unit_of_measure, current_stock),
            source
          `)
          .order('created_at', { ascending: false });
        
        setPurchaseOrders(newPOData || []);
      } else {
        alert('Failed to generate suggested POs: ' + (result.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating suggested POs:', error);
      alert('Failed to generate suggested POs: ' + error.message);
    }
  };

  // Convert suggested PO to manual (user approval)
  const handleConvertToManual = async (poId) => {
    if (!confirm('Convert this suggested PO to a manual PO? This will move it to the Manual POs section.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const result = await convertSuggestedToManual(poId, session?.user?.id);
      
      if (result.success) {
        alert('Suggested PO converted to manual PO successfully!');
        
        // Refresh the purchase orders data
        const { data: newPOData } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            suppliers(name),
            items(name, sku, unit_of_measure, current_stock),
            source
          `)
          .order('created_at', { ascending: false });
        
        setPurchaseOrders(newPOData || []);
      } else {
        alert('Failed to convert PO: ' + (result.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error converting PO:', error);
      alert('Failed to convert PO');
    }
  };

  // Add supplier
  const handleAddSupplier = async () => {
    if (!supplierForm.name || !supplierForm.phone) {
      alert("Supplier name and phone are required");
      return;
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .insert(supplierForm);

      if (error) {
        console.error("Insert error:", error);
        alert(error.message);
      } else {
        setSupplierForm({
          name: "",
          contact_person: "",
          phone: "",
          email: "",
          address: ""
        });
        
        const { data: newSupplierData } = await supabase
          .from('suppliers')
          .select('*')
          .order('name');
        
        setSuppliers(newSupplierData || []);
        alert("Supplier added successfully!");
      }
    } catch (error) {
      console.error("Insert error:", error);
      alert("Failed to add supplier");
    }
  };

  // Create PO
  const handleCreatePO = async () => {
    if (!poForm.supplier_id || !poForm.item_id || !poForm.quantity) {
      alert("All fields are required");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: createdPO, error } = await supabase
        .from('purchase_orders')
        .insert({
          supplier_id: poForm.supplier_id,
          item_id: poForm.item_id,
          quantity: parseInt(poForm.quantity),
          status: "draft",
          source: poForm.source,
          created_by: session?.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error("PO creation error:", error);
        alert("Failed to create PO: " + error.message);
      } else {
        setPoForm({
          supplier_id: "",
          item_id: "",
          quantity: ""
        });
        
        const { data: newPOData } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            suppliers(name),
            items(name, sku, unit_of_measure, current_stock),
            source
          `)
          .order('created_at', { ascending: false });
        
        setPurchaseOrders(newPOData || []);
        alert("PO created successfully!");
      }
    } catch (error) {
      console.error("PO creation error:", error);
      alert("Failed to create PO");
    }
  };

  // Approve PO
  const approvePO = async (id) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: "approved" })
        .eq('id', id);

      if (error) {
        console.error("Approve PO error:", error);
        alert("Failed to approve PO: " + error.message);
      } else {
        const { data: updatedPOData } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            suppliers(name),
            items(name, sku, unit_of_measure, current_stock),
            source
          `)
          .order('created_at', { ascending: false });
        
        setPurchaseOrders(updatedPOData || []);
        alert("PO approved successfully!");
      }
    } catch (error) {
      console.error("Approve PO error:", error);
      alert("Failed to approve PO");
    }
  };

  // Delete PO
  const deletePO = async (poId) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) {
      return;
    }

    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', poId);

    if (error) {
      console.error('DELETE ERROR:', error);
      alert(error.message);
    } else {
      const { data: updatedPOData } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(name),
          items(name, sku, unit_of_measure, current_stock),
          source
        `)
        .order('created_at', { ascending: false });
      
      setPurchaseOrders(updatedPOData || []);
      alert('PO deleted successfully');
    }
  };

  // Get POs for a specific supplier (exclude suggested POs)
  const getSupplierPOs = (supplierId) => {
    return purchaseOrders.filter(po => po.supplier_id === supplierId && po.source !== 'suggested');
  };

  if (loading) return <p>Loading purchase orders & suppliers...</p>;

  return (
    <div className="suppliers-page">
      <h1>Purchase Orders & Suppliers</h1>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button 
          className={activeTab === "suppliers" ? "active" : ""}
          onClick={() => setActiveTab("suppliers")}
        >
          Suppliers
        </button>
        <button 
          className={activeTab === "create-po" ? "active" : ""}
          onClick={() => setActiveTab("create-po")}
        >
          Create PO
        </button>
        <button 
          className={activeTab === "created-po" ? "active" : ""}
          onClick={() => setActiveTab("created-po")}
        >
          Created PO
        </button>
      </div>

      {/* Suppliers Tab */}
      {activeTab === "suppliers" && (
        <>
          {/* Search and Filters */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 150px', 
            gap: '15px', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Search Suppliers</label>
              <input
                type="text"
                placeholder="Search by name, contact, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Results</label>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '4px', 
                textAlign: 'center',
                fontSize: '14px'
              }}>
                {getFilteredSuppliers().length} suppliers
              </div>
            </div>
          </div>

          {/* Add Supplier */}
          <div className="card">
            <h3>Add Supplier</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '15px',
              marginBottom: '15px'
            }}>
              <input
                placeholder="Supplier Name *"
                value={supplierForm.name}
                onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                placeholder="Contact Person"
                value={supplierForm.contact_person}
                onChange={e => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '15px',
              marginBottom: '15px'
            }}>
              <input
                placeholder="Phone *"
                value={supplierForm.phone}
                onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                type="email"
                placeholder="Email"
                value={supplierForm.email}
                onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <textarea
              placeholder="Address"
              value={supplierForm.address}
              onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                minHeight: '80px',
                marginBottom: '15px'
              }}
            />
            <button 
              onClick={handleAddSupplier}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Supplier
            </button>
          </div>

          {/* Supplier List with PO Summary */}
          <div className="card">
            <h3>Supplier List ({getFilteredSuppliers().length})</h3>
            {getFilteredSuppliers().length === 0 ? (
              <p className="empty-state">No suppliers found matching your criteria</p>
            ) : (
              <div className="supplier-grid">
                {getFilteredSuppliers().map(supplier => {
                  const supplierPOs = getSupplierPOs(supplier.id);
                  return (
                    <div key={supplier.id} className="supplier-card">
                      <div className="supplier-header">
                        <h4>{supplier.name}</h4>
                        <span className="po-count">{supplierPOs.length} POs</span>
                      </div>
                      <p><strong>Contact:</strong> {supplier.contact_person || 'N/A'}</p>
                      <p><strong>Phone:</strong> {supplier.phone}</p>
                      <p><strong>Email:</strong> {supplier.email || 'N/A'}</p>
                      {supplier.address && <p><strong>Address:</strong> {supplier.address}</p>}
                      {supplierPOs.length > 0 && (
                        <div className="recent-pos">
                          <p><strong>Recent Orders:</strong></p>
                          {supplierPOs.slice(0, 3).map(po => (
                            <div key={po.id} className="mini-po">
                              <span>{po.items?.name}</span>
                              <span className={`status ${po.status}`}>{po.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Created PO Tab */}
      {activeTab === "created-po" && (
        <>
          {/* Search and Filters */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 200px', 
            gap: '15px', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Search Purchase Orders</label>
              <input
                type="text"
                placeholder="Search by item, SKU, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status Filter</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Results</label>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '4px', 
                textAlign: 'center',
                fontSize: '14px'
              }}>
                {getFilteredPOs().length} orders
              </div>
            </div>
          </div>

          {/* Manually Created POs Section */}
          <div className="card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3>Manually Created POs ({getManualPOs().length})</h3>
              <span style={{ 
                padding: '4px 8px', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                borderRadius: '4px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                MANUAL
              </span>
            </div>
            {getManualPOs().length === 0 ? (
              <p className="empty-state">No manually created purchase orders found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                     
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Item</th>
                     
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Quantity</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created Date</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getManualPOs().map(po => (
                      <tr key={po.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                       
                        <td style={{ padding: '12px' }}>{po.items?.name} ({po.items?.sku})</td>
                       
                        <td style={{ padding: '12px' }}>{po.quantity} {po.items?.unit_of_measure}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status ${po.status}`}>{po.status}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{new Date(po.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {(role === "admin" || role === "manager") ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => approvePO(po.id)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => deletePO(po.id)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>No permission</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Suggested POs Section */}
          <div className="card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3>Suggested POs ({getSuggestedPOs().length})</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={handleGenerateSuggestedPOs}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  Generate Suggested POs
                </button>
                <span style={{ 
                  padding: '4px 8px', 
                  backgroundColor: '#f59e0b', 
                  color: 'white', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  SUGGESTED
                </span>
              </div>
            </div>
            {getSuggestedPOs().length === 0 ? (
              <p className="empty-state">No suggested purchase orders found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Quantity</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created Date</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSuggestedPOs().map(po => (
                      <tr key={po.id} style={{ borderBottom: '1px solid #dee2e6' }}>

                        <td style={{ padding: '12px' }}>{po.items?.name} ({po.items?.sku})</td>
                       
                        <td style={{ padding: '12px' }}>{po.quantity} {po.items?.unit_of_measure}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status ${po.status}`}>{po.status}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{new Date(po.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {(role === "admin" || role === "manager") ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => approvePO(po.id)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => deletePO(po.id)}
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>No permission</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create PO Tab */}
      {activeTab === "create-po" && (
        <div className="card">
          <h3>Create Purchase Order</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '15px',
            marginBottom: '15px'
          }}>
            <select
              value={poForm.supplier_id}
              onChange={e => setPoForm({ ...poForm, supplier_id: e.target.value })}
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">Select Supplier *</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <select
              value={poForm.item_id}
              onChange={e => setPoForm({ ...poForm, item_id: e.target.value })}
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">Select Item *</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) - Current Stock: {item.current_stock} {item.unit_of_measure}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="number"
              placeholder="Quantity *"
              value={poForm.quantity}
              onChange={e => setPoForm({ ...poForm, quantity: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px'
              }}
            />
          </div>
          <button 
            onClick={handleCreatePO}
            disabled={!poForm.supplier_id || !poForm.item_id || !poForm.quantity}
            style={{
              padding: '10px 20px',
              backgroundColor: poForm.supplier_id && poForm.item_id && poForm.quantity ? '#16a34a' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: poForm.supplier_id && poForm.item_id && poForm.quantity ? 'pointer' : 'not-allowed'
            }}
          >
            Create Purchase Order
          </button>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersSuppliers;