import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { supabase } from '../supabase';
import "./stockwarehouse.css";

const StockWarehouse = () => {
  const { apiCall, user, isAuthenticated } = useApi();
  const [activeTab, setActiveTab] = useState("stock");
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Stock states
  const [stockItems, setStockItems] = useState([]);
  
  // Warehouse states
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    address: "",
    city: "",
    country: ""
  });
  
  // Location states
  const [locationForm, setLocationForm] = useState({
    warehouse_id: "",
    aisle: "",
    rack: "",
    bin: ""
  });
  const [selectedItem, setSelectedItem] = useState("");
  const [itemLocations, setItemLocations] = useState([]);
  
  // Transfer order states
  const [transferOrders, setTransferOrders] = useState([]);
  const [transferForm, setTransferForm] = useState({
    from_warehouse: "",
    to_warehouse: "",
    item_id: "",
    quantity: ""
  });
  const [availableStock, setAvailableStock] = useState(null);

  // Fetch user role and authenticate
  const fetchRole = async () => {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.error('StockWarehouse: User not authenticated:', authError);
      window.location.href = '/login';
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    setRole(profile?.role || 'staff');
  };

  // Real-time subscription for stock changes
  useEffect(() => {
    const subscription = supabase
      .channel('stock_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'items' },
        () => {
          console.log('StockWarehouse: Items changed, refreshing...');
          fetchStock();
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  // Fetch stock items with warehouse info (only active items)
  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_active', true)  // Only show active items
        .order('name');
      
      if (error) {
        console.error('Fetch stock error:', error);
      } else {
        setStockItems(data || []);
      }
    } catch (error) {
      console.error('Fetch stock error:', error);
    }
  };

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');
      
      if (error) {
        console.error("Fetch warehouses error:", error);
      } else {
        setWarehouses(data || []);
      }
    } catch (error) {
      console.error("Fetch warehouses error:", error);
    }
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select(`
          *,
          warehouses(name)
        `)
        .order('warehouse_id, aisle, rack, bin');
      
      if (error) {
        console.error("Fetch locations error:", error);
      } else {
        setLocations(data || []);
      }
    } catch (error) {
      console.error("Fetch locations error:", error);
    }
  };

  // Fetch item locations
  const fetchItemLocations = async (itemId) => {
    if (!itemId) {
      setItemLocations([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select(`
          *,
          warehouses(name)
        `)
        .eq('item_id', itemId);
      
      if (error) {
        console.error("Fetch item locations error:", error);
        setItemLocations([]);
      } else {
        setItemLocations(data || []);
      }
    } catch (error) {
      console.error("Fetch item locations error:", error);
      setItemLocations([]);
    }
  };

  // Fetch available stock for selected item and warehouse
  const fetchAvailableStock = async (itemId, warehouseId) => {
    if (!itemId || !warehouseId) {
      setAvailableStock(null);
      return;
    }
    
    try {
      const { data: item } = await supabase
        .from('items')
        .select('current_stock')
        .eq('id', itemId)
        .single();
      
      setAvailableStock(item?.current_stock || 0);
    } catch (error) {
      console.error("Get stock error:", error);
      setAvailableStock(null);
    }
  };

  // Handle transfer form changes
  const handleTransferFormChange = (field, value) => {
    const newForm = { ...transferForm, [field]: value };
    
    // If from_warehouse changes, reset to_warehouse if it's the same
    if (field === 'from_warehouse' && value === newForm.to_warehouse) {
      newForm.to_warehouse = "";
    }
    
    // If to_warehouse changes, reset if it's the same as from_warehouse
    if (field === 'to_warehouse' && value === newForm.from_warehouse) {
      newForm.to_warehouse = "";
    }
    
    // If item changes, fetch available stock
    if (field === 'item_id') {
      fetchAvailableStock(value, newForm.from_warehouse);
    }
    
    setTransferForm(newForm);
  };

  // Fetch transfer orders
  const fetchTransferOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          items(name, sku, unit_of_measure),
          from_warehouse:warehouses!stock_transfers_from_warehouse_fkey(name),
          to_warehouse:warehouses!stock_transfers_to_warehouse_fkey(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Fetch transfer orders error:", error);
        setTransferOrders([]);
      } else {
        setTransferOrders(data || []);
      }
    } catch (error) {
      console.error("Fetch transfer orders error:", error);
      setTransferOrders([]);
    }
  };

  useEffect(() => {
    fetchRole();
    fetchStock();
    fetchWarehouses();
    fetchLocations();
    fetchTransferOrders();
    setLoading(false);
  }, []);

  // Filter and search functionality
  const getFilteredStockItems = () => {
    return stockItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !filterStatus || getStockStatus(item) === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Get stock status
  const getStockStatus = (item) => {
    if (item.current_stock === 0) return "OUT";
    if (item.current_stock > 0 && item.current_stock <= item.safety_stock) return "CRITICAL";
    if (item.current_stock > item.safety_stock && item.current_stock <= item.reorder_point) return "LOW";
    return "HEALTHY";
  };

  // Calculate warehouse summary
  const getWarehouseSummary = () => {
    const summary = {};
    stockItems.forEach(item => {
      const warehouseName = 'Main Warehouse';
      if (!summary[warehouseName]) {
        summary[warehouseName] = {
          totalItems: 0,
          totalQuantity: 0,
          criticalItems: 0,
          lowItems: 0
        };
      }
      summary[warehouseName].totalItems += 1;
      summary[warehouseName].totalQuantity += item.current_stock || 0;
      
      const status = getStockStatus(item);
      if (status === 'CRITICAL' || status === 'OUT') {
        summary[warehouseName].criticalItems += 1;
      } else if (status === 'LOW') {
        summary[warehouseName].lowItems += 1;
      }
    });
    return summary;
  };

  // Add warehouse
  const handleAddWarehouse = async () => {
    if (!warehouseForm.name) {
      alert("Warehouse name is required");
      return;
    }

    try {
      if (editingWarehouse) {
        // Update existing warehouse
        const { error } = await supabase
          .from('warehouses')
          .update(warehouseForm)
          .eq('id', editingWarehouse.id);

        if (error) {
          console.error("Update error:", error);
          alert(error.message);
        } else {
          setWarehouseForm({
            name: "",
            address: "",
            city: "",
            country: ""
          });
          setEditingWarehouse(null);
          fetchWarehouses();
        }
      } else {
        // Add new warehouse
        const { error } = await supabase
          .from('warehouses')
          .insert(warehouseForm);

        if (error) {
          console.error("Insert error:", error);
          alert(error.message);
        } else {
          setWarehouseForm({
            name: "",
            address: "",
            city: "",
            country: ""
          });
          fetchWarehouses();
        }
      }
    } catch (error) {
      console.error("Operation error:", error);
      alert(`Failed to ${editingWarehouse ? 'update' : 'add'} warehouse`);
    }
  };

  // Edit warehouse
  const handleEditWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);
    setWarehouseForm({
      name: warehouse.name,
      address: warehouse.address || "",
      city: warehouse.city || "",
      country: warehouse.country || ""
    });
  };

  // Delete warehouse
  const handleDeleteWarehouse = async (warehouseId) => {
    if (!window.confirm("Are you sure you want to delete this warehouse? Note: This warehouse cannot be deleted if it has associated stock transfers.")) {
      return;
    }

    try {
      // First check if warehouse has any stock transfers
      const { data: transfers, error: checkError } = await supabase
        .from('stock_transfers')
        .select('id')
        .or(`from_warehouse.eq.${warehouseId},to_warehouse.eq.${warehouseId}`)
        .limit(1);

      if (checkError) {
        console.error("Check error:", checkError);
        alert("Error checking warehouse dependencies");
        return;
      }

      if (transfers && transfers.length > 0) {
        alert("This warehouse cannot be deleted because it has associated stock transfers. Please delete or reassign the transfers first.");
        return;
      }

      // If no transfers found, proceed with deletion
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouseId);

      if (error) {
        console.error("Delete error:", error);
        if (error.message.includes('foreign key constraint')) {
          alert("This warehouse cannot be deleted because it's referenced by other records. Please remove all references first.");
        } else {
          alert(error.message);
        }
      } else {
        alert("Warehouse deleted successfully");
        fetchWarehouses();
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete warehouse");
    }
  };

  // Add location
  const handleAddLocation = async () => {
    if (!locationForm.warehouse_id || !locationForm.aisle) {
      alert("Warehouse and aisle are required");
      return;
    }

    try {
      const { error } = await supabase
        .from('warehouse_locations')
        .insert(locationForm);

      if (error) {
        console.error("Insert error:", error);
        alert(error.message);
      } else {
        setLocationForm({
          warehouse_id: "",
          aisle: "",
          rack: "",
          bin: ""
        });
        fetchLocations();
      }
    } catch (error) {
      console.error("Insert error:", error);
      alert("Failed to add location");
    }
  };

  // Create transfer order
  const handleCreateTransfer = async () => {
    if (!transferForm.from_warehouse || !transferForm.to_warehouse || 
        !transferForm.item_id || !transferForm.quantity) {
      alert("All fields are required");
      return;
    }

    if (transferForm.from_warehouse === transferForm.to_warehouse) {
      alert("Source and destination warehouses must be different");
      return;
    }

    if (transferForm.quantity > availableStock) {
      alert("Transfer quantity cannot exceed available stock");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('stock_transfers')
        .insert({
          ...transferForm,
          quantity: Number(transferForm.quantity),
          status: "pending",
          created_by: session?.user?.id
        });

      if (error) {
        console.error("Transfer creation error:", error);
        alert("Failed to create transfer: " + error.message);
      } else {
        setTransferForm({
          from_warehouse: "",
          to_warehouse: "",
          item_id: "",
          quantity: ""
        });
        setAvailableStock(null);
        fetchTransferOrders();
        alert("Transfer order created successfully!");
      }
    } catch (error) {
      console.error("Transfer creation error:", error);
      alert("Failed to create transfer");
    }
  };

  // Approve transfer order
  const approveTransfer = async (id) => {
    try {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: "approved" })
        .eq('id', id);

      if (error) {
        alert(error.message);
      } else {
        alert("Transfer Approved");
        fetchTransferOrders();
      }
    } catch (error) {
      console.error("Approve transfer error:", error);
      alert("Failed to approve transfer");
    }
  };

  // Delete transfer order
  const deleteTransfer = async (id) => {
    if (!confirm("Are you sure you want to delete this transfer order?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stock_transfers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Delete transfer error:", error);
        alert("Failed to delete transfer: " + error.message);
      } else {
        alert("Transfer deleted successfully");
        fetchTransferOrders();
      }
    } catch (error) {
      console.error("Delete transfer error:", error);
      alert("Failed to delete transfer");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="suppliers-page">
      <h1>Stock & Warehouse Management</h1>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button 
          className={activeTab === "stock" ? "active" : ""}
          onClick={() => setActiveTab("stock")}
        >
          Stock Overview
        </button>
        <button 
          className={activeTab === "warehouses" ? "active" : ""}
          onClick={() => setActiveTab("warehouses")}
        >
          Warehouses
        </button>
        <button 
          className={activeTab === "transfers" ? "active" : ""}
          onClick={() => setActiveTab("transfers")}
        >
          Transfer Orders
        </button>
        <button 
          className={activeTab === "approve-transfers" ? "active" : ""}
          onClick={() => setActiveTab("approve-transfers")}
        >
          Approve Transfers
        </button>
      </div>

      {/* Stock Overview Tab */}
      {activeTab === "stock" && (
        <div className="card">
          <h3>Stock by Warehouse</h3>
          
          {/* Search and Filters */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 200px 150px', 
            gap: '15px', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Search Items</label>
              <input
                type="text"
                placeholder="Search by name, SKU, or category..."
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
                <option value="HEALTHY">Healthy</option>
                <option value="LOW">Low Stock</option>
                <option value="CRITICAL">Critical</option>
                <option value="OUT">Out of Stock</option>
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
                {getFilteredStockItems().length} items
              </div>
            </div>
          </div>

          {getFilteredStockItems().length === 0 ? (
            <p className="empty-state">No stock items found matching your criteria</p>
          ) : (
            <div className="stock-grid">
              {getFilteredStockItems().map(item => {
                const status = getStockStatus(item);
                return (
                  <div key={item.id} className="stock-card">
                    <div className="stock-header">
                      <div>
                        <h4>{item.name}</h4>
                        <p className="stock-meta">SKU: {item.sku}</p>
                        <p className="stock-meta">Category: {item.category}</p>
                      </div>
                      <span className={`stock-badge ${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </div>
                    <div className="stock-info">
                      <div>
                        <strong>Quantity</strong>
                        <p>{item.current_stock} {item.unit_of_measure}</p>
                      </div>
                      <div>
                        <strong>Reorder Point</strong>
                        <p>{item.reorder_point}</p>
                      </div>
                      <div>
                        <strong>Safety Stock</strong>
                        <p>{item.safety_stock}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Warehouses Tab */}
      {activeTab === "warehouses" && (
        <>
          <div className="card">
            <h3>Add Warehouse</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '15px',
              marginBottom: '15px'
            }}>
              <input
                placeholder="Warehouse Name"
                value={warehouseForm.name}
                onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                placeholder="City"
                value={warehouseForm.city}
                onChange={e => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
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
                placeholder="Country"
                value={warehouseForm.country}
                onChange={e => setWarehouseForm({ ...warehouseForm, country: e.target.value })}
                style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <textarea
              placeholder="Address"
              value={warehouseForm.address}
              onChange={e => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                minHeight: '80px',
                marginBottom: '15px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleAddWarehouse}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingWarehouse ? 'Update Warehouse' : 'Add Warehouse'}
              </button>
              {editingWarehouse && (
                <button 
                  onClick={() => {
                    setEditingWarehouse(null);
                    setWarehouseForm({
                      name: "",
                      address: "",
                      city: "",
                      country: ""
                    });
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Warehouse List ({warehouses.length})</h3>
            {warehouses.length === 0 ? (
              <p className="empty-state">No warehouses found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Address</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>City</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Country</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.map(warehouse => (
                      <tr key={warehouse.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{warehouse.name}</td>
                        <td style={{ padding: '12px' }}>{warehouse.address || '-'}</td>
                        <td style={{ padding: '12px' }}>{warehouse.city || '-'}</td>
                        <td style={{ padding: '12px' }}>{warehouse.country || '-'}</td>
                        <td style={{ padding: '8px', textAlign: 'center', width: '120px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEditWarehouse(warehouse)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                flex: '1'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteWarehouse(warehouse.id)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                flex: '1'
                              }}
                            >
                              Delete
                            </button>
                          </div>
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

      {/* Transfer Orders Tab */}
      {activeTab === "transfers" && (
        <>
          <div className="card">
            <h3>Create Transfer Order</h3>
            
            {/* Available Stock Display */}
            {transferForm.item_id && transferForm.from_warehouse && (
              <div className="stock-availability">
                <strong>Available in {warehouses.find(w => w.id === transferForm.from_warehouse)?.name}: </strong>
                <span className="stock-quantity">
                  {availableStock !== null ? `${availableStock} units` : 'Loading...'}
                </span>
              </div>
            )}

            <div className="form-grid">
              <select
                value={transferForm.from_warehouse}
                onChange={e => handleTransferFormChange('from_warehouse', e.target.value)}
              >
                <option value="">From Warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <select
                value={transferForm.to_warehouse}
                onChange={e => handleTransferFormChange('to_warehouse', e.target.value)}
                disabled={transferForm.from_warehouse === transferForm.to_warehouse}
              >
                <option value="">To Warehouse</option>
                {warehouses
                  .filter(warehouse => warehouse.id !== transferForm.from_warehouse)
                  .map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
              </select>
              <select
                value={transferForm.item_id}
                onChange={e => handleTransferFormChange('item_id', e.target.value)}
              >
                <option value="">Select Item</option>
                {stockItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Quantity"
                value={transferForm.quantity}
                onChange={e => handleTransferFormChange('quantity', e.target.value)}
                max={availableStock || 999}
              />
            </div>
            
            <div className="form-validation">
              {transferForm.from_warehouse === transferForm.to_warehouse && (
                <p className="error-message">Source and destination warehouses cannot be the same</p>
              )}
              {transferForm.quantity > availableStock && (
                <p className="error-message">Transfer quantity cannot exceed available stock</p>
              )}
            </div>
            
            <button 
              onClick={handleCreateTransfer}
              disabled={!transferForm.from_warehouse || !transferForm.to_warehouse || 
                      !transferForm.item_id || !transferForm.quantity ||
                      transferForm.from_warehouse === transferForm.to_warehouse ||
                      transferForm.quantity > availableStock}
            >
              Create Transfer Order
            </button>
          </div>

          <div className="card">
            <h3>Transfer Orders</h3>
            {transferOrders.length === 0 ? (
              <p className="empty-state">No transfer orders found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Item</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>From Warehouse</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>To Warehouse</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Quantity</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferOrders.map(transfer => (
                      <tr key={transfer.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>{transfer.items?.name} ({transfer.items?.sku})</td>
                        <td style={{ padding: '12px' }}>{transfer.from_warehouse?.name}</td>
                        <td style={{ padding: '12px' }}>{transfer.to_warehouse?.name}</td>
                        <td style={{ padding: '12px' }}>{transfer.quantity} {transfer.items?.unit_of_measure}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status-badge ${transfer.status}`}>
                            {transfer.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{new Date(transfer.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Approve Transfers Tab */}
      {activeTab === "approve-transfers" && (
        <div className="card">
          <h3>Pending Transfer Approvals</h3>
          {transferOrders.filter(t => t.status === "pending").length === 0 ? (
            <p className="empty-state">No pending transfers to approve</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Item</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>From Warehouse</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>To Warehouse</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Quantity</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Created Date</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transferOrders
                    .filter(transfer => transfer.status === "pending")
                    .map(transfer => (
                      <tr key={transfer.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>{transfer.items?.name} ({transfer.items?.sku})</td>
                        <td style={{ padding: '12px' }}>{transfer.from_warehouse?.name}</td>
                        <td style={{ padding: '12px' }}>{transfer.to_warehouse?.name}</td>
                        <td style={{ padding: '12px' }}>{transfer.quantity} {transfer.items?.unit_of_measure}</td>
                        <td style={{ padding: '12px' }}>{new Date(transfer.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {(role === "admin" || role === "manager") ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => approveTransfer(transfer.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => deleteTransfer(transfer.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
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
      )}
    </div>
  );
};

export default StockWarehouse;
