// src/pages/Performances/Performances.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './Performances.css';

interface Performance {
  _id: string;
  title: string;
  type: 'performance' | 'concert';
  image?: string;
  artist?: { _id: string; username: string };
  coArtist?: { username: string };
  eventDate: string;
  location?: string;
  isLive?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time} CET`;
}

function artistLine(item: Performance) {
  if (item.coArtist) return `${item.artist?.username} & ${item.coArtist.username}`;
  return item.artist?.username;
}

type FilterType = 'all' | 'performance' | 'concert';

export default function Performances() {
  const [items, setItems] = useState<Performance[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const isAdmin = role === 'admin';

  useEffect(() => {
    const fetchPerformances = async () => {
      try {
        const res = await fetch(`${API_BASE}/performances/all`);
        const data = await res.json();
        setItems(data.performances || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformances();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this item? This cannot be undone.');
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/performances/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Could not delete this item.');
        return;
      }

      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error(err);
      alert('Could not delete this item.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = filter === 'all' ? items : items.filter((item) => item.type === filter);

  // First item becomes the big, caption-free hero image at the top.
  // Everything (including that same first item) is then listed in the
  // masonry grid below, grouped 3 at a time: one large left + two stacked right.
  const heroImage = filteredItems[0]?.image;
  const rows: Performance[][] = [];
  for (let i = 0; i < filteredItems.length; i += 3) {
    rows.push(filteredItems.slice(i, i + 3));
  }

  const renderCard = (item: Performance, featured = false) => {
    const isOwnerArtist = role === 'artist' && item.artist?._id === userId;
    const canEdit = isAdmin || isOwnerArtist;
    const canDelete = isAdmin;

    return (
      <div key={item._id} className={featured ? 'perfCard perfCardFeatured' : 'perfCard'}>
        <Link to={`/performances/${item._id}`} className="perfCardLink">
          <div className="perfCardImage">
            <img src={item.image || '/fallback.jpg'} alt={item.title} />
            {item.isLive && <span className="livePill">● Live now</span>}
          </div>
          <p className="perfType">{item.type}</p>
          <h3>{item.title}</h3>
          <p className="perfArtist">{artistLine(item)}</p>
          <p className="perfMeta">
            {item.isLive ? 'Live now' : formatEventDate(item.eventDate)}
            {item.location ? ` · ${item.location}` : ''}
          </p>
        </Link>

        {(canEdit || canDelete) && (
          <div className="cardActions">
            {canEdit && (
              <button className="cardEditBtn" onClick={() => navigate(`/performances/${item._id}/edit`)}>
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
  };

  return (
    <>
      <Nav />

      <section className="performancesPage">
        <div className="performancesPageHeader">
          <p className="eyebrow">Live &amp; performances</p>
          <h1 className="pageTitle">Performances & concerts</h1>
          <p className="pageSubtitle">
            Bodies, spaces and ideas unfolding in real time and in our growing archive.
          </p>

          <div className="filterTabs">
            <button
              className={filter === 'all' ? 'filterTab filterTabActive' : 'filterTab'}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={filter === 'performance' ? 'filterTab filterTabActive' : 'filterTab'}
              onClick={() => setFilter('performance')}
            >
              Performances
            </button>
            <button
              className={filter === 'concert' ? 'filterTab filterTabActive' : 'filterTab'}
              onClick={() => setFilter('concert')}
            >
              Concerts
            </button>
          </div>
        </div>

        {loading && <p className="stateMsg">Loading...</p>}
        {!loading && filteredItems.length === 0 && <p className="stateMsg">Nothing scheduled here yet.</p>}

        {heroImage && (
          <div className="performanceHeroImage">
            <img src={heroImage} alt="" />
          </div>
        )}

        {rows.map((row, i) => (
          <div key={i} className="perfMasonryRow">
            {row[0] && renderCard(row[0], true)}
            {(row[1] || row[2]) && (
              <div className="perfStack">
                {row[1] && renderCard(row[1])}
                {row[2] && renderCard(row[2])}
              </div>
            )}
          </div>
        ))}
      </section>

      <Footer />
    </>
  );
}