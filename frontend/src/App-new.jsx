// New App Component with JWT Integration
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApi } from './hooks/useApi';
import Login from './components/Login';
import ItemsManagement from './components/ItemsManagement';

const App = () => {
  const { user, isAuthenticated, logout } = useApi();

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              {/* Header */}
              <header style={{ 
                backgroundColor: '#343a40', 
                color: 'white', 
                padding: '1rem 2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
                  🏭 Inventory Management System
                </h1>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span>👤 {user?.first_name} {user?.last_name}</span>
                  <span style={{ marginLeft: '0.5rem' }}>({user?.email})</span>
                  <button
                    onClick={logout}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>
              </header>

              {/* Navigation */}
              <nav style={{ 
                backgroundColor: '#495057', 
                padding: '0.5rem 2rem' 
              }}>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                  <button
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    📦 Items
                  </button>
                  <button
                    style={{
                      backgroundColor: 'transparent',
                      color: 'white',
                      border: '1px solid white',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    📊 Stock
                  </button>
                  <button
                    style={{
                      backgroundColor: 'transparent',
                      color: 'white',
                      border: '1px solid white',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Reorder
                  </button>
                </div>
              </nav>

              {/* Main Content */}
              <main style={{ 
                padding: '2rem', 
                maxWidth: '1200px', 
                margin: '0 auto' 
              }}>
                <ItemsManagement />
              </main>

              {/* Footer */}
              <footer style={{ 
                backgroundColor: '#343a40', 
                color: 'white', 
                textAlign: 'center', 
                padding: '1rem 2rem', 
                marginTop: 'auto' 
              }}>
                <p>🚀 MySQL + JWT Authentication System</p>
                <p>📦 Fully migrated from Supabase</p>
                <p>🔐 Secure API endpoints</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  API Base: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}
                </p>
              </footer>
            </div>
          </ProtectedRoute>
        } />
        
        {/* Redirect root to items */}
        <Route path="/" element={<Navigate to="/items" replace />} />
        
        {/* Catch all route - redirect to login if not authenticated */}
        <Route path="*" element={
          !isAuthenticated ? <Navigate to="/login" replace /> : <Navigate to="/items" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
