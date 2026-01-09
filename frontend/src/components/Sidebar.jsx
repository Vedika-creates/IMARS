import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./sidebar.css";

const Sidebar = () => {
  const { logout } = useApi();
  
  const handleLogout = async () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="sidebar">
      <h2 className="sidebar-title">IMS</h2>

      <nav className="sidebar-nav">
        <Link to="/" className="sidebar-link">Dashboard</Link>
        <Link to="/items" className="sidebar-link">Items</Link>
        <Link to="/stock" className="sidebar-link">Stock & Warehouse</Link>
        <Link to="/purchase-orders-suppliers" className="sidebar-link">Purchase Orders & Suppliers</Link>
        <Link to="/reorder" className="sidebar-link">Reorder Alerts</Link>
        <Link to="/reports" className="sidebar-link">Reports</Link>
        <Link to="/grn" className="sidebar-link">Goods Receipt (GRN)</Link>
        <Link to="/batch-management" className="sidebar-link">Batch & Expiry</Link>
        <Link to="/profile" className="sidebar-link">My Profile</Link>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
