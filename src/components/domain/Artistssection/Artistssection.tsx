// src/components/domain/ArtistsSection/ArtistsSection.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Artistssection.css';

interface Artist {
  _id: string;
  username: string;
  // Not provided by the backend yet — falls back gracefully until the
  // User model is extended with real profile fields.
  location?: string;
  discipline?: string;
  profileImage?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function ArtistsSection() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/artists`);
        const data = await res.json();
        setArtists((data.artists || []).slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  if (loading || artists.length === 0) {
    return null;
  }

  return (
    <section className="artistsSection">
      <div className="artistsHeader">
        <p className="eyebrow">Artists across borders</p>
        <h2 className="sectionTitle">Discover artists</h2>
        <Link to="/artists" className="viewAllLink">
          View all <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="artistsGrid">
        {artists.map((artist) => (
          <Link key={artist._id} to={`/artists/${artist._id}`} className="artistCard">
            <div className="artistCardImage">
              <img src={artist.profileImage || '/fallback-artist.jpg'} alt={artist.username} />
            </div>
            <h3>{artist.username}</h3>
            {artist.location && <p className="artistLocation">{artist.location}</p>}
            {artist.discipline && <p className="artistDiscipline">{artist.discipline}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}