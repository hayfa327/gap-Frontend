// src/pages/ExhibitionDetail/ExhibitionDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './ExhibitionDetail.css';

interface Exhibition {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  artist?: { _id: string; username: string };
  startDate: string;
  endDate: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${new Date(start).toLocaleDateString('en-GB', opts)} – ${new Date(end).toLocaleDateString('en-GB', opts)}`;
}

export default function ExhibitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId'); // make sure this is saved at login if you want artist-ownership checks to work

  const isAdmin = role === 'admin';
  const isOwnerArtist = role === 'artist' && exhibition?.artist?._id === userId;
  const canEdit = isAdmin || isOwnerArtist;
  const canDelete = isAdmin; // backend only allows admin to delete

  useEffect(() => {
    const fetchExhibition = async () => {
      try {
     const res = await fetch(`${API_BASE}/exhibitions/exhibitions/${id}`);
        if (!res.ok) throw new Error('Exhibition not found');
        const data = await res.json();
        setExhibition(data.exhibition || data);
      } catch (err) {
        console.error(err);
        setError('Could not load this exhibition.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchExhibition();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm('Delete this exhibition? This cannot be undone.');
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/exhibitions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Could not delete this exhibition.');
        return;
      }

      navigate('/exhibitions');
    } catch (err) {
      console.error(err);
      setError('Could not delete this exhibition.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Nav />

      <section className="exhibitionDetailPage">
        {loading && <p className="stateMsg">Loading exhibition...</p>}
        {error && <p className="stateMsg errorMsg">{error}</p>}

        {exhibition && (
          <>
            <Link to="/exhibitions" className="backLink">← All exhibitions</Link>

            <div className="detailImage">
              <img src={exhibition.image || '/fallback.jpg'} alt={exhibition.title} />
            </div>

            <div className="detailHeader">
              <p className="exhibitionDates">
                {formatDateRange(exhibition.startDate, exhibition.endDate)}
              </p>
              <h1 className="exhibitionTitle">{exhibition.title}</h1>
              <p className="exhibitionArtist">{exhibition.artist?.username}</p>

              {exhibition.description && (
                <p className="exhibitionDescription">{exhibition.description}</p>
              )}

              {(canEdit || canDelete) && (
                <div className="ownerActions">
                  {canEdit && (
                    <Link to={`/exhibitions/${exhibition._id}/edit`} className="editBtn">
                      Edit exhibition
                    </Link>
                  )}
                  {canDelete && (
                    <button className="deleteBtn" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Deleting...' : 'Delete exhibition'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <Link to={`/exhibitions/${exhibition._id}/gallery`} className="enter3dBtn">
              Enter 3D Gallery ↗
            </Link>
          </>
        )}
      </section>

      <Footer />
    </>
  );
}