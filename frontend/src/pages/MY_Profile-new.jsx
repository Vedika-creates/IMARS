// Profile Component with JWT Integration
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import './MY_Profile.css';

const MyProfile = () => {
  const { user, isAuthenticated, apiCall } = useApi();
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        // In a real app, you'd fetch profile from API
        // For now, using user data from JWT token
        setProfile({
          full_name: user.first_name + ' ' + user.last_name,
          phone: user.phone || '',
          address: user.address || '',
          city: user.city || '',
          role: user.role || 'user'
        });
        setMessage('✅ Profile loaded successfully');
      } catch (error) {
        setMessage('❌ Failed to load profile: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // In a real app, you'd save profile to API
      // For now, just simulate successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage('✅ Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-page">
        <h1>🔐 Authentication Required</h1>
        <p>Please login to view your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-page">
        <p>🔄 Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1 className="profile-title">👤 My Profile</h1>
      <p className="profile-subtitle">View and update your information</p>
      
      {message && (
        <div className={`profile-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="profile-card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Email</label>
            <input value={user?.email || ''} disabled />
          </div>

          <div className="form-group">
            <label>Role</label>
            <input value={profile.role} disabled />
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              name="full_name"
              value={profile.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              name="phone"
              value={profile.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              name="address"
              value={profile.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>City</label>
            <input
              name="city"
              value={profile.city}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? '💾 Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyProfile;
