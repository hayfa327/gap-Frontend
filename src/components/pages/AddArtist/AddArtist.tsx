// src/pages/AddArtist/AddArtist.tsx
import { useState, type SyntheticEvent } from 'react';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './AddArtist.css';

 const API_BASE = import.meta.env.VITE_API_BASE_URL;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/doxbrbcdf/image/upload';
const CLOUDINARY_PRESET = 'unsigned_preset';
 
async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url as string;
}
 
export default function AddArtist() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
 
  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
 
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
 
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in as admin');
      return;
    }
 
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/artists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, email, password, location, discipline, profileImage }),
      });
 
      const data = await response.json();
 
      if (!response.ok) {
        setError(data.message || 'Something went wrong');
        return;
      }
 
      setSuccess('Artist created successfully');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setLocation('');
      setDiscipline('');
      setProfileImage('');
      setPreview('');
    } catch (err) {
      console.error(err);
      setError('Error creating artist');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <>
      <Nav />
 
      <section className="addArtistPage">
        <div className="formContainer">
          <p className="eyebrow">Admin</p>
          <h1 className="pageTitle">Add Artist</h1>
          <p className="pageSubtitle">
            Create a new artist account with gallery access
          </p>
 
          {error && <p className="errorMsg">{error}</p>}
          {success && <p className="successMsg">{success}</p>}
 
          <form onSubmit={handleSubmit} className="authForm">
            <div className="inputGroup">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter artist username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Email address</label>
              <input
                type="email"
                placeholder="artist@example.com"
                value={email}
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter secure password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Profile photo</label>
              <div className="imageUpload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadToCloudinary(file);
                      setProfileImage(url);
                      setPreview(url);
                    } catch (err) {
                      console.error(err);
                      setError('Image upload failed');
                    }
                  }}
                />
                {preview ? (
                  <img src={preview} className="previewImg" alt="Preview" />
                ) : (
                  <span className="uploadHint">PNG, JPG up to 10MB</span>
                )}
              </div>
            </div>
 
            <div className="inputGroup">
              <label>Location</label>
              <input
                type="text"
                placeholder="e.g. Beirut ↔ Stockholm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Discipline</label>
              <input
                type="text"
                placeholder="e.g. Installation · Performance"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Confirm password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
 
            <div className="roleBox">
              <strong>Role: Artist</strong>
              <p>This account will have artist privileges to manage their own exhibitions.</p>
            </div>
 
            <div className="buttonRow">
              <button
                type="submit"
                className="primaryBtn"
                disabled={!username || !email || !password || loading}
              >
                {loading ? 'Creating...' : 'Add Artist'}
              </button>
            </div>
          </form>
        </div>
      </section>
 
      <Footer />
    </>
  );
}