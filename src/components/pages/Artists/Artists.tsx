// src/pages/Artists/Artists.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './Artists.css';

interface Artist {
  _id: string;
  username: string;
  location?: string;
  discipline?: string;
  profileImage?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/artists`);
        const data = await res.json();
        setArtists(data.artists || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  return (
    <>
      <Nav />

      <section className="artistsPage">
        <div className="artistsPageHeader">
          <p className="eyebrow">Meet the makers</p>
          <h1 className="pageTitle">Artists</h1>
          <p className="pageSubtitle">
            Discover the artists shaping GAP across practices, places and generations.
          </p>
        </div>

        <div className="artistsPageDivider" />

        {loading && <p className="stateMsg">Loading artists...</p>}
        {!loading && artists.length === 0 && (
          <p className="stateMsg">No artists to show yet.</p>
        )}

        <div className="artistsPageGrid">
          {artists.map((artist) => (
            <Link key={artist._id} to={`/artists/${artist._id}`} className="artistPageCard">
              <div className="artistPageCardImage">
                <img src={artist.profileImage || '/fallback-artist.jpg'} alt={artist.username} />
              </div>
              <h3>{artist.username}</h3>
              {artist.location && <p className="artistLocation">{artist.location}</p>}
              {artist.discipline && <p className="artistDiscipline">{artist.discipline}</p>}
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}