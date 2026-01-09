import React, { useState } from 'react';
import { supabase } from '../supabase';
import './Login.css';

const Login = () => {
  console.log('🚀 Login: Component rendering...');
  
  // Test Supabase connection on mount
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🔍 Login: Testing Supabase connection...');
        const { data, error } = await supabase.from('users').select('count').limit(1);
        console.log('🔍 Login: Connection test result:', { data, error });
      } catch (err) {
        console.error('❌ Login: Connection test failed:', err);
      }
    };
    testConnection();
  }, []);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('🔍 Login: Starting login process...');
    console.log('🔍 Login: Email:', email);
    
    setLoading(true);
    setError("");

    try {
      console.log('🔍 Login: Calling Supabase signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔍 Login: Supabase response:', { data, error });

      if (error) {
        console.error('❌ Login: Authentication error:', error);
        setError(error.message);
      } else {
        console.log('✅ Login: Authentication successful:', data);
        // Login successful, redirect to dashboard
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error('❌ Login: Unexpected error:', err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
        <h1 className="title">Login</h1>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
          
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
          />
          
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        
        <div className="signup-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </div>
      </div>
  );
};

export default Login;
