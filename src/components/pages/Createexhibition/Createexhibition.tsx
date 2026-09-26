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

type ContentType = 'artOnly' | 'textOnly' | 'both';
type TextPosition = 'top' | 'center' | 'bottom';

type TextFont = 'inter' | 'playfair' | 'merriweather' | 'mono';

interface WallSetting {
  id: string; // e.g. 'wall-1' — open-ended, admin adds as many as needed
  color: string;
  contentType: ContentType;
  wallText: string;
  maxArtworks: number;
  textPosition: TextPosition;
  textSize: number; // exact size, not a preset
  textFont: TextFont;
}

// The form still edits a simple flat list of walls (unchanged UX) — these
// two helpers convert to/from the backend's proper rooms→walls hierarchy
// only at the save/load boundary, so the data model is clean without
// complicating the editing experience.
type Slot = 'far' | 'left' | 'right';
const SLOTS: Slot[] = ['far', 'left', 'right'];

function wallsToRooms(walls: WallSetting[]) {
  const rooms: { id: string; walls: (WallSetting & { slot: Slot })[] }[] = [];
  for (let i = 0; i < walls.length; i += 3) {
    const chunk = walls.slice(i, i + 3).map((w, j) => ({ ...w, slot: SLOTS[j] }));
    rooms.push({ id: "room-" + (rooms.length + 1), walls: chunk });
  }
  return rooms;
}


// Realistic gallery paint tones as starting defaults — admins can still
// pick any colour, but these read as real architectural choices rather
// than arbitrary CSS colours.
const defaultWallSettings: WallSetting[] = [
  { id: 'wall-1', color: '#F5F3EE', contentType: 'both', wallText: '', maxArtworks: 4, textPosition: 'top', textSize: 24, textFont: 'inter' },
  { id: 'wall-2', color: '#F5F3EE', contentType: 'artOnly', wallText: '', maxArtworks: 6, textPosition: 'top', textSize: 24, textFont: 'inter' },
  { id: 'wall-3', color: '#2B2A28', contentType: 'artOnly', wallText: '', maxArtworks: 6, textPosition: 'top', textSize: 24, textFont: 'inter' },
];

function nextWallId(existing: WallSetting[]) {
  let n = existing.length + 1;
  while (existing.some((w) => w.id === "wall-" + n)) n++;
  return "wall-" + n;
}

interface Artwork {
  image: string;
  title: string;
  wallId: string;
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
  const [wallSettings, setWallSettings] = useState<WallSetting[]>(defaultWallSettings);
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
          wallId: 'wall-1',
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
        body: JSON.stringify({ title, description, startDate, endDate, artistId, image, artworks, rooms: wallsToRooms(wallSettings) }),
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
              <div className="artworkWallList">
                {artworks.map((art, index) => (
                  <div key={index} className="artworkWallRow">
                    <img src={art.image} className="previewThumb" alt={art.title} />
                    <span className="artworkWallName">{art.title}</span>
                    <select
                      value={art.wallId}
                      onChange={(e) => {
                        const updated = [...artworks];
                        updated[index] = { ...updated[index], wallId: e.target.value };
                        setArtworks(updated);
                      }}
                    >
                      {wallSettings.map((w, i) => (
                        <option key={w.id} value={w.id}>Wall {i + 1}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="wallOrganizer">
                <div className="wallOrganizerHead">
                  <div>
                    <p className="wallOrganizerTitle">Organize the 3D gallery walls</p>
                    <p className="wallOrganizerHint">
                      Add as many walls as this exhibition needs. Every 3 walls form one
                      room in the 3D gallery, connected by a doorway — add more any time.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="addWallBtn"
                    onClick={() => {
                      setWallSettings([
                        ...wallSettings,
                        {
                          id: nextWallId(wallSettings),
                          color: '#F5F3EE',
                          contentType: 'artOnly',
                          wallText: '',
                          maxArtworks: 6,
                          textPosition: 'top',
                          textSize: 24,
                          textFont: 'inter',
                        },
                      ]);
                    }}
                  >
                    + Add wall
                  </button>
                </div>

                {wallSettings.map((wall, index) => {
                  const artworksOnWall = artworks.filter((a) => a.wallId === wall.id).length;
                  const roomNumber = Math.floor(index / 3) + 1;
                  const slotInRoom = (index % 3) + 1;
                  return (
                    <div key={wall.id} className="wallSettingCard">
                      <div className="wallSettingHead">
                        <span className="wallSettingName">
                          Room {roomNumber} · Wall {slotInRoom}
                        </span>
                        <input
                          type="color"
                          value={wall.color}
                          onChange={(e) => {
                            const updated = [...wallSettings];
                            updated[index] = { ...updated[index], color: e.target.value };
                            setWallSettings(updated);
                          }}
                        />
                      </div>

                      <div className="wallSettingRow">
                        <label>Content</label>
                        <select
                          value={wall.contentType}
                          onChange={(e) => {
                            const updated = [...wallSettings];
                            updated[index] = { ...updated[index], contentType: e.target.value as ContentType };
                            setWallSettings(updated);
                          }}
                        >
                          <option value="artOnly">Artworks only</option>
                          <option value="textOnly">Text only</option>
                          <option value="both">Artworks + text</option>
                        </select>
                      </div>

                      {wall.contentType !== 'artOnly' && (
                        <>
                          <div className="wallSettingRow">
                            <label>Wall text</label>
                            <textarea
                              placeholder="e.g. curatorial note for this wall"
                              value={wall.wallText}
                              onChange={(e) => {
                                const updated = [...wallSettings];
                                updated[index] = { ...updated[index], wallText: e.target.value };
                                setWallSettings(updated);
                              }}
                            />
                          </div>

                          <div className="wallSettingRow">
                            <label>Text position</label>
                            <select
                              value={wall.textPosition}
                              onChange={(e) => {
                                const updated = [...wallSettings];
                                updated[index] = { ...updated[index], textPosition: e.target.value as TextPosition };
                                setWallSettings(updated);
                              }}
                            >
                              <option value="top">Top of wall</option>
                              <option value="center">Centre of wall</option>
                              <option value="bottom">Bottom of wall</option>
                            </select>
                          </div>

                          <div className="wallSettingRow">
                            <label>Text size (pt)</label>
                            <input
                              type="number"
                              min={8}
                              max={72}
                              value={wall.textSize}
                              onChange={(e) => {
                                const updated = [...wallSettings];
                                updated[index] = { ...updated[index], textSize: Number(e.target.value) };
                                setWallSettings(updated);
                              }}
                            />
                          </div>

                          <div className="wallSettingRow">
                            <label>Font</label>
                            <select
                              value={wall.textFont}
                              onChange={(e) => {
                                const updated = [...wallSettings];
                                updated[index] = { ...updated[index], textFont: e.target.value as TextFont };
                                setWallSettings(updated);
                              }}
                            >
                              <option value="inter">Inter (clean sans-serif)</option>
                              <option value="playfair">Playfair Display (elegant serif)</option>
                              <option value="merriweather">Merriweather (classic serif)</option>
                              <option value="mono">Roboto Mono (typewriter)</option>
                            </select>
                          </div>

                        </>
                      )}

                      {wall.contentType !== 'textOnly' && (
                        <div className="wallSettingRow">
                          <label>Max artworks on this wall</label>
                          <input
                            type="number"
                            min={0}
                            max={12}
                            value={wall.maxArtworks}
                            onChange={(e) => {
                              const updated = [...wallSettings];
                              updated[index] = { ...updated[index], maxArtworks: Number(e.target.value) };
                              setWallSettings(updated);
                            }}
                          />
                          <span className="wallSettingCount">
                            {artworksOnWall} / {wall.maxArtworks} assigned
                          </span>
                        </div>
                      )}

                      {wallSettings.length > 1 && (
                        <button
                          type="button"
                          className="removeWallBtn"
                          onClick={() => {
                            setWallSettings(wallSettings.filter((_, i) => i !== index));
                            // any artwork pointed at this wall falls back to the first wall
                            setArtworks(artworks.map((a) => a.wallId === wall.id ? { ...a, wallId: wallSettings[0].id } : a));
                          }}
                        >
                          Remove this wall
                        </button>
                      )}
                    </div>
                  );
                })}
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