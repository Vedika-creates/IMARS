import React from 'react'
import "./header.css"

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>Inventory Management System</h1>
        <div className="user-menu">
          <span>User</span>
          <button>Logout</button>
        </div>
      </div>
    </header>
  )
}

export default Header
