// src/pages/ChangePassword/ChangePassword.tsx
import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './ChangePassword.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isDisabled = !oldPassword || !newPassword || loading;

  const handleChangePassword = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!oldPassword || !newPassword) {
      setError('Please fill all fields');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to change password');
        return;
      }

      navigate('/manage-account');
    } catch (err) {
      console.error(err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />

      <section className="changePasswordPage">
        <div className="changePasswordCard">
          <Link to="/manage-account" className="backLink">← Back to account</Link>

          <p className="eyebrow">Account</p>
          <h1 className="pageTitle">Change password</h1>
          <p className="pageSubtitle">Update your password securely</p>

          {error && <p className="errorMsg">{error}</p>}

          <form onSubmit={handleChangePassword} className="authForm">
            <div className="inputGroup">
              <label>Old password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={oldPassword}
                autoComplete="current-password"
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div className="inputGroup">
              <label>New password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="primaryBtn" disabled={isDisabled}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </>
  );
}