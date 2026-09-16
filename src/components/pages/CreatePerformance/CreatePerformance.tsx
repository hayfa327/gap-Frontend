// src/pages/CreatePerformance/CreatePerformance.tsx
import { useState, useEffect, type SyntheticEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './CreatePerformance.css';

interface Artist {
  _id: string;
  username: string;
}
 
type PerformanceType = 'performance' | 'concert';
 
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
 
export default function CreatePerformance() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PerformanceType>('performance');
  const [image, setImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [preview, setPreview] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState('');
  const [coArtistId, setCoArtistId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('Stockholm');
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
 
  const navigate = useNavigate();
 
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/artists`);
        const data = await res.json();
        setArtists(data.artists || []);
      } catch (err) {
        console.error('Error fetching artists:', err);
      }
    };
    fetchArtists();
  }, []);
 
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
 
    try {
      const url = await uploadToCloudinary(file);
      setImage(url);
      setPreview(url);
    } catch (err) {
      console.error(err);
      setError('Image upload failed');
    }
  };
 
  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
 
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must login first');
      return;
    }
 
    if (!title || !description || !artistId || !eventDate) {
      setError('Please fill all required fields');
      return;
    }
 
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/performances/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          type,
          image,
          videoUrl,
          artist: artistId,
          coArtist: coArtistId || undefined,
          eventDate,
          location,
          isLive,
        }),
      });
 
      const data = await response.json();
 
      if (!response.ok) {
        setError(data.message || 'Something went wrong');
        return;
      }
 
      navigate(type === 'concert' ? '/concerts' : '/performances');
    } catch (err) {
      console.error(err);
      setError('Error creating performance');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <>
      <Nav />
 
      <section className="createPerformancePage">
        <div className="formContainer">
          <p className="eyebrow">Admin</p>
          <h1 className="pageTitle">Create performance & Concert</h1>
          <p className="pageSubtitle">Add a live performance or concert to the programme</p>
 
          {error && <p className="errorMsg">{error}</p>}
 
          <form onSubmit={handleSubmit} className="authForm">
            <div className="inputGroup">
              <label>Type</label>
              <div className="typeToggle">
                <button
                  type="button"
                  className={type === 'performance' ? 'typeBtn typeBtnActive' : 'typeBtn'}
                  onClick={() => setType('performance')}
                >
                  Performance
                </button>
                <button
                  type="button"
                  className={type === 'concert' ? 'typeBtn typeBtnActive' : 'typeBtn'}
                  onClick={() => setType('concert')}
                >
                  Concert
                </button>
              </div>
            </div>
 
            <div className="inputGroup">
              <label>Cover image</label>
              <div className="imageUpload">
                <input type="file" accept="image/*" onChange={handleImageUpload} />
                {preview ? (
                  <img src={preview} className="previewImg" alt="Preview" />
                ) : (
                  <span className="uploadHint">PNG, JPG up to 10MB</span>
                )}
              </div>
            </div>
 
            <div className="inputGroup">
              <label>Title</label>
              <input
                type="text"
                placeholder="Enter title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Video link (streaming or recording)</label>
              <input
                type="url"
                placeholder="https://..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Description</label>
              <textarea
                placeholder="Enter description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
 
            <div className="inputGroup">
              <label>Artist</label>
              <select value={artistId} onChange={(e) => setArtistId(e.target.value)}>
                <option value="">Select artist</option>
                {artists.map((artist) => (
                  <option key={artist._id} value={artist._id}>
                    {artist.username}
                  </option>
                ))}
              </select>
            </div>
 
            <div className="inputGroup">
              <label>Co-artist (optional)</label>
              <select value={coArtistId} onChange={(e) => setCoArtistId(e.target.value)}>
                <option value="">None</option>
                {artists.map((artist) => (
                  <option key={artist._id} value={artist._id}>
                    {artist.username}
                  </option>
                ))}
              </select>
            </div>
 
            <div className="dateRow">
              <div className="inputGroup">
                <label>Event date &amp; time</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="inputGroup">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="Stockholm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
 
            <label className="checkboxRow">
              <input
                type="checkbox"
                checked={isLive}
                onChange={(e) => setIsLive(e.target.checked)}
              />
              Mark as live now
            </label>
 
            <button
              type="submit"
              className="primaryBtn"
              disabled={!title || !description || !artistId || !eventDate || loading}
            >
              {loading ? 'Creating...' : 'Create performance'}
            </button>
          </form>
        </div>
      </section>
 
      <Footer />
    </>
  );
}