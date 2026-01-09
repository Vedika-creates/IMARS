// Fixed Login Component - Working Version
import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  
  const { login, loading, error } = useApi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    const result = await login(credentials);
    
    if (result.success) {
      setMessage('✅ Login successful!');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } else {
      setMessage(`❌ Login failed: ${result.error}`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({
      ...credentials,
      [name]: value
    });
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>🔐 Login</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          ⚠️ {error}
        </div>
      )}
      
      {message && (
        <div style={{ color: 'green', marginBottom: '10px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            required
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="test@example.com"
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            required
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="Enter your password"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? '🔄 Logging in...' : '🔑 Login'}
        </button>
      </form>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>📝 Test Credentials:</p>
        <p>Email: test@example.com</p>
        <p>Password: password123</p>
      </div>
    </div>
  );
};

export default Login;
