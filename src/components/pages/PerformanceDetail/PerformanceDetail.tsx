// src/pages/PerformanceDetail/PerformanceDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './PerformanceDetail.css';

interface Performance {
  _id: string;
  title: string;
  description: string;
  type: 'performance' | 'concert';
  image?: string;
  videoUrl?: string;
  artist?: { _id: string; username: string };
  coArtist?: { _id: string; username: string };
  eventDate: string;
  location?: string;
  isLive?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time} CET`;
}

function artistLine(item: Performance) {
  if (item.coArtist) return `${item.artist?.username} & ${item.coArtist.username}`;
  return item.artist?.username;
}

export default function PerformanceDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await fetch(`${API_BASE}/performances/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setItem(data.performance || data);
      } catch (err) {
        console.error(err);
        setError('Could not load this performance.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPerformance();
  }, [id]);

  if (loading) return <p className="stateMsg">Loading...</p>;

  if (error || !item) {
    return (
      <>
        <Nav />
        <section className="performanceDetailPage">
          <p className="stateMsg">{error || 'Performance not found.'}</p>
          <Link to="/performances" className="backLink">← All performances</Link>
        </section>
        <Footer />
      </>
    );
  }

  // A raw URL isn't necessarily an embeddable player link — some are
  // YouTube/Vimeo watch pages, others are direct video files or external
  // streaming pages. Safest default: open it in a new tab as "Watch"
  // rather than assuming it always embeds cleanly.
  const hasVideo = Boolean(item.videoUrl);

  return (
    <>
      <Nav />

      <section className="performanceDetailPage">
        {item.image && (
          <div className="performanceDetailImage">
            <img src={item.image} alt={item.title} />
            {item.isLive && <span className="livePill">● Live now</span>}
          </div>
        )}

        <div className="performanceDetailBody">
          <p className="eyebrow">{item.type}</p>
          <h1 className="pageTitle">{item.title}</h1>
          <p className="performanceArtist">{artistLine(item)}</p>
          <p className="performanceMeta">
            {item.isLive ? 'Live now' : formatEventDate(item.eventDate)}
            {item.location ? ` · ${item.location}` : ''}
          </p>

          {hasVideo && (
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="watchBtn"
            >
              {item.isLive ? '● Watch live' : '▶ Watch recording'}
            </a>
          )}

          <p className="performanceDescription">{item.description}</p>

          <Link to="/performances" className="backLink">← All performances</Link>
        </div>
      </section>

      <Footer />
    </>
  );
}