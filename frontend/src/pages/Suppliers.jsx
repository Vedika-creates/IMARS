import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import "./suppliers.css";

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: ""
  });

  /* ================= FETCH SUPPLIERS ================= */
  const fetchSuppliers = async () => {
    const { data, error } = await apiCall('GET', '/api/suppliers');
    if (error) {
      console.error('Fetch suppliers error:', error);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  /* ================= ADD SUPPLIER ================= */
  const handleAddSupplier = async () => {
    if (!form.name || !form.phone) {
      alert("Supplier name and phone are required");
      return;
    }

    setSaving(true);
    const { error } = await apiCall('POST', '/api/suppliers', {
      name: form.name,
      contact_person: form.contact_person,
      phone: form.phone,
      email: form.email,
      address: form.address
    });

    if (error) {
      console.error('Insert error:', error);
      alert(error.message);
    } else {
      setForm({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: ""
      });
      fetchSuppliers();
    }
    setSaving(false);
  };

  /* ================= UI ================= */
  return (
    <div className="suppliers-page">
      <h1>Suppliers</h1>

      {/* ADD SUPPLIER */}
      <div className="card">
        <h3>Add Supplier</h3>

        <div className="form-grid">
          <input
            placeholder="Supplier Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="Contact Person"
            value={form.contact_person}
            onChange={e => setForm({ ...form, contact_person: e.target.value })}
          />

          <input
            placeholder="Phone"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />

          <textarea
            placeholder="Address"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            className="form-full-width"
          />
        </div>

        <button onClick={handleAddSupplier}>Add Supplier</button>
      </div>

      {/* SUPPLIER LIST */}
      <div className="card">
        <h3>Supplier List</h3>

        {loading ? (
          <p className="loading">Loading...</p>
        ) : suppliers.length === 0 ? (
          <p className="empty-state">No suppliers found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.contact_person}</td>
                  <td>{s.phone}</td>
                  <td>{s.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Suppliers;
