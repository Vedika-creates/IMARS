import { useState, useEffect } from "react";
import { supabase } from '../supabase';

/* ---------- Component ---------- */
const Transfers = () => {
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [form, setForm] = useState({
    item_id: "",
    from_warehouse: "",
    to_warehouse: "",
    quantity: ""
  });

  const [availableStock, setAvailableStock] = useState(null);

  // Fetch user role and authenticate
  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        console.error('Transfers: User not authenticated:', authError);
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

    fetchRole();
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch transfers
        const { data: transferData, error: transferError } = await supabase
          .from('stock_transfers')
          .select(`
            *,
            items(name, sku, unit_of_measure),
            from_warehouse:warehouses!stock_transfers_from_warehouse_fkey(name),
            to_warehouse:warehouses!stock_transfers_to_warehouse_fkey(name)
          `)
          .order('created_at', { ascending: false });

        // Fetch warehouses
        const { data: warehouseData, error: warehouseError } = await supabase
          .from('warehouses')
          .select('*')
          .order('name');

        // Fetch items
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('id, name, sku, current_stock, unit_of_measure')
          .order('name');

        if (transferError) console.error('Transfer fetch error:', transferError);
        if (warehouseError) console.error('Warehouse fetch error:', warehouseError);
        if (itemError) console.error('Item fetch error:', itemError);

        setTransfers(transferData || []);
        setWarehouses(warehouseData || []);
        setItems(itemData || []);
      } catch (error) {
        console.error('Data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('transfer_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stock_transfers' },
        () => {
          console.log('Transfers: Database changed, refreshing...');
          // Re-fetch transfers
          supabase
            .from('stock_transfers')
            .select(`
              *,
              items(name, sku, unit_of_measure),
              from_warehouse:warehouses!stock_transfers_from_warehouse_fkey(name),
              to_warehouse:warehouses!stock_transfers_to_warehouse_fkey(name)
            `)
            .order('created_at', { ascending: false })
            .then(({ data }) => setTransfers(data || []));
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  // Fetch available stock when item and warehouse change
  useEffect(() => {
    if (form.item_id && form.from_warehouse) {
      const fetchStock = async () => {
        try {
          const { data: item } = await supabase
            .from('items')
            .select('current_stock')
            .eq('id', form.item_id)
            .single();
          
          setAvailableStock(item?.current_stock || 0);
        } catch (error) {
          console.error('Stock fetch error:', error);
          setAvailableStock(0);
        }
      };

      fetchStock();
    } else {
      setAvailableStock(null);
    }
  }, [form.item_id, form.from_warehouse]);

  // Filter transfers
  const getFilteredTransfers = () => {
    return transfers.filter(transfer => {
      const matchesSearch = !searchTerm || 
        transfer.items?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.items?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.from_warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.to_warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !filterStatus || transfer.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  };

  /* ---------- Create Transfer ---------- */
  const createTransfer = async () => {
    if (!form.item_id || !form.from_warehouse || !form.to_warehouse || !form.quantity) {
      alert("All fields are required");
      return;
    }

    if (form.from_warehouse === form.to_warehouse) {
      alert("Source and destination warehouses must be different");
      return;
    }

    if (form.quantity > availableStock) {
      alert("Transfer quantity cannot exceed available stock");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('stock_transfers')
        .insert({
          ...form,
          quantity: Number(form.quantity),
          status: "pending",
          created_by: session?.user?.id
        });

      if (error) {
        alert("Failed to create transfer: " + error.message);
      } else {
        setForm({ item_id: "", from_warehouse: "", to_warehouse: "", quantity: "" });
        setAvailableStock(null);
        alert("Transfer request created successfully!");
      }
    } catch (error) {
      console.error('Create transfer error:', error);
      alert("Failed to create transfer");
    }
  };

  /* ---------- Approve Transfer ---------- */
  const approveTransfer = async (id) => {
    try {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status: "approved" })
        .eq('id', id);

      if (error) {
        alert("Failed to approve transfer: " + error.message);
      } else {
        alert("Transfer approved successfully!");
      }
    } catch (error) {
      console.error('Approve transfer error:', error);
      alert("Failed to approve transfer");
    }
  };

  /* ---------- Delete Transfer ---------- */
  const deleteTransfer = async (id) => {
    if (!confirm("Are you sure you want to delete this transfer?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stock_transfers')
        .delete()
        .eq('id', id);

      if (error) {
        alert("Failed to delete transfer: " + error.message);
      } else {
        alert("Transfer deleted successfully!");
      }
    } catch (error) {
      console.error('Delete transfer error:', error);
      alert("Failed to delete transfer");
    }
  };

  if (loading) return <p>Loading transfers...</p>;

  return (
    <div style={styles.container}>
      <h1>Warehouse Transfers</h1>
      <p style={styles.subtitle}>
        Transfer stock between warehouses with approval control
      </p>

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
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Search Transfers</label>
          <input
            type="text"
            placeholder="Search by item, SKU, or warehouse..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
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
            {getFilteredTransfers().length} transfers
          </div>
        </div>
      </div>

      {/* Create Transfer (Staff Only) */}
      {(role === "staff" || role === "admin" || role === "manager") && (
        <div style={styles.form}>
          <h3>Create Transfer Request</h3>

          {/* Available Stock Display */}
          {form.item_id && form.from_warehouse && (
            <div style={{
              padding: '10px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '10px',
              fontSize: '14px'
            }}>
              <strong>Available Stock: </strong>
              <span style={{ color: availableStock > 0 ? '#10b981' : '#dc2626' }}>
                {availableStock !== null ? `${availableStock} units` : 'Loading...'}
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select
              value={form.from_warehouse}
              onChange={(e) => setForm({ ...form, from_warehouse: e.target.value })}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">From Warehouse</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>

            <select
              value={form.to_warehouse}
              onChange={(e) => setForm({ ...form, to_warehouse: e.target.value })}
              disabled={form.from_warehouse === form.to_warehouse}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">To Warehouse</option>
              {warehouses
                .filter(warehouse => warehouse.id !== form.from_warehouse)
                .map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
            </select>
          </div>

          <select
            value={form.item_id}
            onChange={(e) => setForm({ ...form, item_id: e.target.value })}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '10px'
            }}
          >
            <option value="">Select Item</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku}) - {item.current_stock} {item.unit_of_measure}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            max={availableStock || 999}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '10px'
            }}
          />

          <button 
            onClick={createTransfer}
            disabled={!form.item_id || !form.from_warehouse || !form.to_warehouse || !form.quantity ||
                    form.from_warehouse === form.to_warehouse ||
                    (form.quantity > availableStock)}
            style={{
              ...styles.button,
              backgroundColor: form.item_id && form.from_warehouse && form.to_warehouse && form.quantity &&
                             form.from_warehouse !== form.to_warehouse &&
                             form.quantity <= availableStock ? '#16a34a' : '#9ca3af',
              cursor: form.item_id && form.from_warehouse && form.to_warehouse && form.quantity &&
                        form.from_warehouse !== form.to_warehouse &&
                        form.quantity <= availableStock ? 'pointer' : 'not-allowed'
            }}
          >
            Create Transfer
          </button>
        </div>
      )}

      {/* Transfer List */}
      <div style={styles.transferList}>
        <h3>Transfer Orders ({getFilteredTransfers().length})</h3>
        
        {getFilteredTransfers().length === 0 ? (
          <div style={styles.emptyState}>
            <p>No transfers found matching your criteria</p>
          </div>
        ) : (
          getFilteredTransfers().map((transfer) => (
            <div key={transfer.id} style={styles.card}>
              <div style={styles.header}>
                <div>
                  <h2 style={{ margin: 0, color: '#1f2937' }}>
                    #{transfer.id.toString().padStart(6, '0')}
                  </h2>
                  <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
                    {new Date(transfer.created_at).toLocaleDateString()} at {new Date(transfer.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  style={{
                    ...styles.badge,
                    ...(transfer.status === "approved" ? styles.approved :
                      transfer.status === "completed" ? styles.completed :
                      transfer.status === "cancelled" ? styles.cancelled :
                      styles.pending),
                  }}
                >
                  {transfer.status.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '15px 0' }}>
                <div>
                  <p style={{ margin: '4px 0' }}><strong>Item:</strong> {transfer.items?.name}</p>
                  <p style={{ margin: '4px 0' }}><strong>SKU:</strong> {transfer.items?.sku}</p>
                  <p style={{ margin: '4px 0' }}><strong>Quantity:</strong> {transfer.quantity} {transfer.items?.unit_of_measure}</p>
                </div>
                <div>
                  <p style={{ margin: '4px 0' }}><strong>From:</strong> {transfer.from_warehouse?.name}</p>
                  <p style={{ margin: '4px 0' }}><strong>To:</strong> {transfer.to_warehouse?.name}</p>
                </div>
              </div>

              {(role === "admin" || role === "manager") && transfer.status === "pending" && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button
                    style={{
                      ...styles.button,
                      backgroundColor: '#16a34a',
                      flex: 1
                    }}
                    onClick={() => approveTransfer(transfer.id)}
                  >
                    Approve Transfer
                  </button>
                  <button
                    style={{
                      ...styles.button,
                      backgroundColor: '#dc2626',
                      flex: 1
                    }}
                    onClick={() => deleteTransfer(transfer.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ---------- Styles ---------- */
const styles = {
  container: {
    padding: "20px",
  },
  subtitle: {
    color: "#6b7280",
    marginBottom: "20px",
  },
  form: {
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid #e5e7eb"
  },
  card: {
    background: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 6px 15px rgba(0,0,0,0.08)",
    marginBottom: "16px",
    border: "1px solid #e5e7eb"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px"
  },
  badge: {
    padding: "6px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  pending: {
    background: "#fef3c7",
    color: "#92400e",
  },
  approved: {
    background: "#dcfce7",
    color: "#166534",
  },
  completed: {
    background: "#dbeafe",
    color: "#1e40af",
  },
  cancelled: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  button: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease"
  },
  transferList: {
    marginTop: "20px"
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    color: "#6b7280"
  }
};

export default Transfers;
