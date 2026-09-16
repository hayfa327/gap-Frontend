// src/pages/Exhibitions/Exhibitions.tsx
 import { useEffect, useState,} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './Exhibitions.css';

 
interface Exhibition {
  _id: string;
  title: string;
  image?: string;
  artist?: { _id: string; username: string };
  startDate: string;
  endDate: string;
}
 
interface ExhibitionsResponse {
  exhibitions: Exhibition[];
}
 
const API_BASE = import.meta.env.VITE_API_BASE_URL;
 
function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${new Date(start).toLocaleDateString('en-GB', opts)} – ${new Date(end).toLocaleDateString('en-GB', opts)}`;
}
 
export default function Exhibitions() {
  // Keep the full list separately from what's displayed, so search/reset
  // never need another network round trip — same data source as before,
  // just filtered client-side.
  const [allExhibitions, setAllExhibitions] = useState<Exhibition[]>([]);
  const [displayed, setDisplayed] = useState<Exhibition[]>([]);
  const [searchArtist, setSearchArtist] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
 
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const isAdmin = role === 'admin';
 
  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        const res = await fetch(`${API_BASE}/exhibitions/all`);
        const data: ExhibitionsResponse = await res.json();
        setAllExhibitions(data.exhibitions || []);
        setDisplayed(data.exhibitions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
 
    fetchExhibitions();
  }, []);
 
  const handleSearch = () => {
    const query = searchArtist.trim().toLowerCase();
    if (!query) {
      setDisplayed(allExhibitions);
      return;
    }
    setDisplayed(
      allExhibitions.filter((item) =>
        item.artist?.username?.toLowerCase().includes(query)
      )
    );
  };
 
  const handleReset = () => {
    setSearchArtist('');
    setDisplayed(allExhibitions);
  };
 
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this exhibition? This cannot be undone.');
    if (!confirmed) return;
 
    const token = localStorage.getItem('token');
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/exhibitions/exhibitions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
 
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Could not delete this exhibition.');
        return;
      }
 
      setAllExhibitions((prev) => prev.filter((ex) => ex._id !== id));
      setDisplayed((prev) => prev.filter((ex) => ex._id !== id));
    } catch (err) {
      console.error(err);
      alert('Could not delete this exhibition.');
    } finally {
      setDeletingId(null);
    }
  };
 
  return (
    <>
      <Nav />
 
      <section className="exhibitionsPage">
        <div className="exhibitionsHeader">
          <div className="exhibitionsHeaderText">
            <p className="eyebrow">Exhibitions</p>
            <h1 className="pageTitle">
              Exhibitions that don't end<br />when the room closes
            </h1>
            <p className="pageSubtitle">
              Every exhibition stays available after its opening — on view in
              Stockholm, and online anywhere.
            </p>
          </div>
 
          <div className="searchBox">
            <input
              type="text"
              placeholder="Search by artist name..."
              value={searchArtist}
              onChange={(e) => setSearchArtist(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="searchBtn" onClick={handleSearch}>Search</button>
            <button className="resetBtn" onClick={handleReset}>Reset</button>
          </div>
        </div>
 
        {loading && <p className="stateMsg">Loading exhibitions...</p>}
        {!loading && displayed.length === 0 && (
          <p className="stateMsg">No exhibitions match that search.</p>
        )}
 
        <div className="exhibitionsGrid">
          {displayed.map((item) => {
            const isOwnerArtist = role === 'artist' && item.artist?._id === userId;
            const canEdit = isAdmin || isOwnerArtist;
            const canDelete = isAdmin;
 
            return (
              <div key={item._id} className="exhibitionCard">
                <Link to={`/exhibitions/${item._id}`} className="exhibitionCardLink">
                  <div className="exhibitionCardImage">
                    <img src={item.image || '/fallback.jpg'} alt={item.title} />
                  </div>
                  <h3>{item.title}</h3>
                  <p className="exhibitionCardArtist">{item.artist?.username}</p>
                  <p className="exhibitionCardDate">
                    {formatDateRange(item.startDate, item.endDate)}
                  </p>
                </Link>
 
                {(canEdit || canDelete) && (
                  <div className="cardActions">
                    {canEdit && (
                      <button
                        className="cardEditBtn"
                        onClick={() => navigate(`/exhibitions/${item._id}/edit`)}
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="cardDeleteBtn"
                        onClick={() => handleDelete(item._id)}
                        disabled={deletingId === item._id}
                      >
                        {deletingId === item._id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
 
      <Footer />
    </>
  );
}