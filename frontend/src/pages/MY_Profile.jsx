import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useApi } from "../hooks/useApi";
import "./MY_Profile.css";

const MyProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    role: "",
    bio: "",
    department: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, address, city, role, bio, department")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          bio: profile.bio,
          department: profile.department
        })
        .eq("id", user.id);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert("Error updating profile: " + error.message);
    }

    setSaving(false);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      alert("Password updated successfully");
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      alert("Error updating password: " + error.message);
    }
  };

  // if (loading) {
  //   return (
  //     <div className="loading-spinner">
  //       <p>Loading profile...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1 className="profile-title">My Profile</h1>
        <p className="profile-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="profile-content">
        <div className="profile-main">
          {success && (
            <div className="success-message">
              ✓ Profile updated successfully!
            </div>
          )}

          <div className="profile-card">
            <h2 className="section-title">Personal Information</h2>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input value={user?.email || ""} disabled className="disabled-input" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input value={profile.role || ""} disabled className="disabled-input" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    name="full_name"
                    value={profile.full_name || ""}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    name="phone"
                    value={profile.phone || ""}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    name="department"
                    value={profile.department || ""}
                    onChange={handleChange}
                    placeholder="Enter your department"
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    name="city"
                    value={profile.city || ""}
                    onChange={handleChange}
                    placeholder="Enter your city"
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Address</label>
                <input
                  name="address"
                  value={profile.address || ""}
                  onChange={handleChange}
                  placeholder="Enter your address"
                />
              </div>

              <div className="form-group full-width">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={profile.bio || ""}
                  onChange={handleChange}
                  placeholder="Tell us about yourself"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving} className="save-btn">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="password-btn"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>

          {showPasswordChange && (
            <div className="profile-card password-card">
              <h2 className="section-title">Change Password</h2>
              <form onSubmit={handlePasswordUpdate}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">
                    Update Password
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordChange(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
