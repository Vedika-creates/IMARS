import React from "react";

const Settings = () => {
  return (
    <>
      <style>{`
        .settings-container {
          max-width: 600px;
          margin: 40px auto;
          font-family: Arial, sans-serif;
        }

        .settings-container h2 {
          margin-bottom: 20px;
        }

        .settings-section {
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fff;
        }

        .settings-section h3 {
          margin-bottom: 15px;
        }

        .setting-item {
          margin-bottom: 15px;
        }

        .setting-item label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .setting-item input,
        .setting-item select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .save-btn {
          background: #2563eb;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .save-btn:hover {
          background: #1d4ed8;
        }
      `}</style>

      <div className="settings-container">
        <h2>Settings</h2>

        <div className="settings-section">
          <h3>General Settings</h3>
          <div className="setting-item">
            <label>Company Name</label>
            <input type="text" placeholder="Enter company name" />
          </div>
          <div className="setting-item">
            <label>Default Currency</label>
            <select>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notification Settings</h3>
          <div className="setting-item">
            <label>
              <input type="checkbox" /> Low stock alerts
            </label>
          </div>
        </div>

        <button className="save-btn">Save Settings</button>
      </div>
    </>
  );
};

export default Settings;
