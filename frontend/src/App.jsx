import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import emailjs from "@emailjs/browser";

// Initialize EmailJS
emailjs.init("UyOyPZkS_FYE4mkit");

import Dashboard from "./pages/Dashboard";
import Items from "./pages/Items";
import StockWarehouse from "./pages/StockWarehouse";
import PurchaseOrdersSuppliers from "./pages/PurchaseOrdersSuppliers";
import ReorderAutomation from "./pages/ReorderAutomation";
import Reports from "./pages/Reports";
import BatchManagement from "./pages/BatchManagement";
import GRNPage from "./pages/GRNPage";
import Login from "./pages/Login";
import MyProfile from "./pages/MY_Profile";                                               

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Dashboard />
            </div>
          </div>
        } />
        <Route path="/" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Dashboard />
            </div>
          </div>
        } />
        <Route path="/items" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Items />
            </div>
          </div>
        } />
        <Route path="/stock" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <StockWarehouse />
            </div>
          </div>
        } />
        <Route path="/purchase-orders-suppliers" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <PurchaseOrdersSuppliers />
            </div>
          </div>
        } />
        <Route path="/reorder" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <ReorderAutomation />
            </div>
          </div>
        } />
        <Route path="/reports" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Reports />
            </div>
          </div>
        } />
        <Route path="/batch-management" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <BatchManagement />
            </div>
          </div>
        } />
        <Route path="/grn" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <GRNPage />
            </div>
          </div>
        } />
        <Route path="/profile" element={
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <MyProfile />
            </div>
          </div>
        } />
        </Routes>
    </BrowserRouter>
  );
};

export default App;
