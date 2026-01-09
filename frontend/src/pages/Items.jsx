import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import { supabase } from "../supabase";
import "./item.css";

const emptyForm = {
  sku: "",
  name: "",
  category: "",
  unit_of_measure: "",
  description: "",
  current_stock: "",
  reorder_point: "",
  safety_stock: "",
  lead_time: "",
  max_stock: ""
};

const Items = () => {
  const { apiCall, user, isAuthenticated } = useApi();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      /* ---- CHECK AUTHENTICATION ---- */
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        console.error('Items: User not authenticated:', authError);
        window.location.href = '/login';
        return;
      }

      /* ---- GET USER PROFILE ---- */
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setRole(profile?.role || 'staff');

      /* ---- FETCH ITEMS ---- */
      await fetchItems();
      setLoading(false);
    };

    init();
  }, []);

  /* ================= REAL-TIME SUBSCRIPTION ================= */
  useEffect(() => {
    const subscription = supabase
      .channel('items_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'items' },
        () => {
          console.log('Items: Database changed, refreshing...');
          fetchItems();
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  /* ================= DATA FETCHING ================= */
  const fetchItems = async () => {
    try {
      let query = supabase
        .from('items')
        .select('*')
        .eq('is_active', true)   // ✅ IMPORTANT: Only show active items
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply search filter
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%` 
        );
      }

      // Apply category filter
      if (filterCategory) {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Items fetch error:", error);
      } else {
        setItems(data || []);
      }
    } catch (error) {
      console.error("Items fetch error:", error);
    }
  };

  /* ================= FORM HANDLERS ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.sku || form.sku.trim() === "") {
      alert("SKU is required");
      return;
    }

    const payload = {
      sku: form.sku,
      name: form.name,
      category: form.category,
      unit_of_measure: form.unit_of_measure,
      description: form.description,
      current_stock: Number(form.current_stock) || 0,
      reorder_point: Number(form.reorder_point) || 0,
      safety_stock: Number(form.safety_stock) || 0,
      lead_time: Number(form.lead_time) || 0,
      max_stock: Number(form.max_stock) || 0
    };

    try {
      let error;
      if (editingId) {
        ({ error } = await supabase
          .from('items')
          .update(payload)
          .eq('id', editingId));
      } else {
        ({ error } = await supabase
          .from('items')
          .insert(payload));
      }

      if (error) {
        alert(error.message);
        return;
      }

      // Reset form and refresh items
      setForm(emptyForm);
      setEditingId(null);
      await fetchItems();
    } catch (error) {
      alert("An error occurred while saving the item");
    }
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    console.log('🗑️ Delete button clicked for item:', id);
    
    if (!confirm("Are you sure you want to delete this item?")) {
      console.log('❌ User cancelled deletion');
      return;
    }

    try {
      // Soft delete: Set is_active = false instead of deleting
      console.log('🔄 Attempting to deactivate item:', id);
      
      const { data, error } = await supabase
        .from('items')
        .update({ is_active: false })
        .eq('id', id)
        .select(); // Return the updated data to verify

      console.log('📊 Update response:', { data, error });

      if (error) {
        console.error('❌ Deactivation error:', error);
        alert("Error deactivating item: " + error.message);
        
        // Fallback: Try hard delete if soft delete fails
        if (error.message.includes('column "is_active" does not exist')) {
          console.log('⚠️ is_active field not found, trying hard delete...');
          const { error: deleteError } = await supabase
            .from('items')
            .delete()
            .eq('id', id);
            
          if (deleteError) {
            alert("Error deleting item: " + deleteError.message);
          } else {
            alert("Item deleted permanently");
            await fetchItems();
          }
        }
      } else {
        console.log('✅ Item deactivated successfully:', data);
        alert("Item deactivated successfully");
        await fetchItems();
      }
    } catch (error) {
      console.error('❌ Catch error:', error);
      alert("An error occurred while deactivating item: " + error.message);
    }
  };

  /* ================= FILTERING AND SORTING ================= */
  const getUniqueCategories = () => {
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))];
    return categories.sort();
  };

  const filteredAndSortedItems = items
    .filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !filterCategory || item.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      const modifier = sortOrder === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }
      return (aVal - bVal) * modifier;
    });

  /* ================= UI ================= */
  if (loading) return <p>Loading items...</p>;

  return (
    <div className="page-container">
      <h1 className="page-title">Items</h1>
      <p className="page-subtitle">Inventory master data</p>

      {/* ===== SEARCH AND FILTERS ===== */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 150px', gap: '15px', alignItems: 'end' }}>
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
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Categories</option>
              {getUniqueCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="current_stock-asc">Stock (Low to High)</option>
              <option value="current_stock-desc">Stock (High to Low)</option>
              <option value="category-asc">Category (A-Z)</option>
              <option value="sku-asc">SKU (A-Z)</option>
            </select>
          </div>
        </div>
        
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Showing {filteredAndSortedItems.length} of {items.length} items
        </div>
      </div>

      {/* ===== FORM ===== */}
      {(role === "admin" || role === "manager") ? (
        <div className="card">
          <h2>{editingId ? "Edit Item" : "Add Item"}</h2>

          <form onSubmit={handleSubmit}>
            <div className="grid">
              <input
                type="text"
                name="sku"
                placeholder="SKU"
                value={form.sku}
                onChange={handleChange}
                required
              />
              <input name="name" placeholder="Item Name" value={form.name} onChange={handleChange} required />
              <input name="category" placeholder="Category" value={form.category} onChange={handleChange} required />
              <input name="unit_of_measure" placeholder="Unit" value={form.unit_of_measure} onChange={handleChange} required />
            </div>

            <div className="grid">
              <input type="number" name="current_stock" placeholder="Current Stock" value={form.current_stock} onChange={handleChange} required />
              <input type="number" name="reorder_point" placeholder="Reorder Point" value={form.reorder_point} onChange={handleChange} required />
              <input type="number" name="safety_stock" placeholder="Safety Stock" value={form.safety_stock} onChange={handleChange} required />
              <input type="number" name="lead_time" placeholder="Lead Time (days)" value={form.lead_time} onChange={handleChange} required />
              <input type="number" name="max_stock" placeholder="Max Stock" value={form.max_stock} onChange={handleChange} />
            </div>

            <div className="grid">
              <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} className="form-full-width" rows="3" />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit">
                {editingId ? "Update Item" : "Add Item"}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => {
                    setForm(emptyForm);
                    setEditingId(null);
                  }}
                  style={{ backgroundColor: '#6b7280' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <p style={{ color: "#dc2626" }}>
            You have read-only access to items.
          </p>
        </div>
      )}

      {/* ===== TABLE ===== */}
      <div className="card">
        <h2>Catalog Items ({filteredAndSortedItems.length})</h2>

        {filteredAndSortedItems.length === 0 ? (
          <p>No items found</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>SKU</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Category</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>UOM</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Current Stock</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Reorder Point</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>Safety Stock</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Lead Time</th>
                  {(role === "admin" || role === "manager") && <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedItems.map((item) => {
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6', '&:hover': { backgroundColor: '#f8f9fa' } }}>
                      <td style={{ padding: '12px' }}>{item.sku}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          backgroundColor: '#e5e7eb', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px' 
                        }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{item.unit_of_measure}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{item.current_stock}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{item.reorder_point}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{item.safety_stock}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{item.lead_time} days</td>
                      {(role === "admin" || role === "manager") && (
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleEdit(item)}
                              style={{ 
                                backgroundColor: '#3b82f6', 
                                color: 'white', 
                                border: 'none', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              style={{ 
                                backgroundColor: '#ef4444', 
                                color: 'white', 
                                border: 'none', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Items;
