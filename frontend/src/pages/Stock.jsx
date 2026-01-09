import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { supabase } from '../supabase';
import './Stock.css';

/* ---------- Helpers ---------- */
const getStatus = (item) => {
  if (item.current_stock <= item.safety_stock) return "CRITICAL";
  if (item.current_stock <= item.reorder_point) return "LOW";
  return "HEALTHY";
};

const Stock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [currentStock, setCurrentStock] = useState(null);
  const [stock, setStock] = useState([]);

  const apiCall = useApi();

  /* ---------- FETCH STOCK FROM API ---------- */
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      /* ---- GET AUTH USER ---- */
      const { data: { user } } = await apiCall('GET', '/api/auth/user');

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      /* ---- FETCH ROLE ---- */
      const fetchCurrentStock = async () => {
        const { data, error } = await apiCall('GET', '/api/stock/current');
        if (error) {
          console.error('Fetch current stock error:', error);
        } else {
          setCurrentStock(data);
        }
        setLoading(false);
      };

      fetchCurrentStock();

      /* ---- FETCH ITEMS ---- */
      const fetchStock = async () => {
        const { data, error } = await apiCall('GET', '/api/stock/status');
        if (error) {
          console.error('Fetch stock error:', error);
        } else {
          setStock(data || []);
        }
        setLoading(false);
      };

      fetchStock();
    };

    init();
  }, []);

  /* ---------- STOCK IN / OUT ---------- */
  const updateStock = async (itemId, change) => {
    const item = stock.find((i) => i.id === itemId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newStock = Math.max(0, item.current_stock + change);

    const { error } = await supabase
      .from("items")
      .update({ current_stock: newStock })
      .eq("id", itemId);

    if (error) {
      alert(error.message);
      return;
    }

    // Update UI state
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, current_stock: newStock } : i
      )
    );
  };

  if (loading) return <p>Loading stock...</p>;

  return (
    <div className="stock-page">
      <h1>Stock Management</h1>
      <p className="stock-subtitle">
        Monitor and update real-time inventory quantities
      </p>

      {role === "staff" && (
        <p style={{ color: "#dc2626", marginBottom: "10px", textAlign: "center", fontWeight: "600" }}>
          You have read-only access to stock. Contact Admin or Manager to update quantities.
        </p>
      )}

      {items.length === 0 ? (
        <p>No stock items found</p>
      ) : (
        items.map((item) => {
          const status = getStatus(item);

          return (
            <div key={item.id} className="stock-card">
              {/* Header */}
              <div className="stock-header">
                <div>
                  <h2>{item.name}</h2>
                  <p className="stock-meta">SKU: {item.sku}</p>
                </div>

                <span className={`stock-badge ${status.toLowerCase()}`}>
                  {status}
                </span>
              </div>

              {/* Info */}
              <div className="stock-info">
                <div>
                  <strong>Current Stock</strong>
                  <p>
                    {item.current_stock} {item.unit_of_measure}
                  </p>
                </div>
                <div>
                  <strong>Safety Stock</strong>
                  <p>{item.safety_stock}</p>
                </div>
                <div>
                  <strong>Reorder Point</strong>
                  <p>{item.reorder_point}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="stock-actions">
                <button
                  onClick={() => updateStock(item.id, -1)}
                  disabled={role === "staff" || item.current_stock === 0}
                  title={role === "staff" ? "You don't have permission" : ""}
                >
                  Stock OUT
                </button>

                <button
                  onClick={() => updateStock(item.id, 1)}
                  disabled={role === "staff"}
                  title={role === "staff" ? "You don't have permission" : ""}
                >
                  Stock IN
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Stock;
