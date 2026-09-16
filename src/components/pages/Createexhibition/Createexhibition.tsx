// src/pages/CreateExhibition/CreateExhibition.tsx
import { useState, useEffect, type SyntheticEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './Createexhibition.css';

interface Artist {
  _id: string;
  username: string;
}

interface Artwork {
  image: string;
  title: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/doxbrbcdf/image/upload';
const CLOUDINARY_PRESET = 'unsigned_preset';

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.secure_url as string;
}

export default function CreateExhibition() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [image, setImage] = useState('');
  const [preview, setPreview] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
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

  const handleArtworksUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    try {
      const uploaded = await Promise.all(
        files.map(async (file) => ({
          image: await uploadToCloudinary(file),
          title: file.name,
        }))
      );
      setArtworks((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error(err);
      setError('Artwork upload failed');
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

    if (!title || !description || !startDate || !endDate || !artistId) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/exhibitions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, startDate, endDate, artistId, image, artworks }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Something went wrong');
        return;
      }

      navigate('/exhibitions');
    } catch (err) {
      console.error(err);
      setError('Error creating exhibition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />

      <section className="createExhibitionPage">
        <div className="formContainer">
          <p className="eyebrow">Admin</p>
          <h1 className="pageTitle">Create Exhibition</h1>
          <p className="pageSubtitle">Add a new exhibition to the gallery collection</p>

          {error && <p className="errorMsg">{error}</p>}

          <form onSubmit={handleSubmit} className="authForm">
            <div className="inputGroup">
              <label>Exhibition image</label>
              <div className="imageUpload">
                <input type="file" accept="image/*" onChange={handleImageUpload} />
                {preview ? (
                  <img src={preview} className="previewImg" alt="Exhibition preview" />
                ) : (
                  <span className="uploadHint">PNG, JPG up to 10MB</span>
                )}
              </div>
            </div>

            <div className="inputGroup">
              <label>Artworks (multiple images)</label>
              <input type="file" accept="image/*" multiple onChange={handleArtworksUpload} />
              <div className="previewGrid">
                {artworks.map((art, index) => (
                  <img key={index} src={art.image} className="previewThumb" alt={art.title} />
                ))}
              </div>
            </div>

            <div className="inputGroup">
              <label>Exhibition title</label>
              <input
                type="text"
                placeholder="Enter exhibition title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="inputGroup">
              <label>Description</label>
              <textarea
                placeholder="Enter exhibition description"
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

            <div className="dateRow">
              <div className="inputGroup">
                <label>Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="inputGroup">
                <label>End date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <button
              type="submit"
              className="primaryBtn"
              disabled={!title || !description || !artistId || loading}
            >
              {loading ? 'Creating...' : 'Create Exhibition'}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </>
  );
}