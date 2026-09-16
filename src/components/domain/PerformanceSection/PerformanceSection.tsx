// src/components/domain/PerformancesSection/PerformancesSection.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './PerformanceSection.css';

interface Performance {
  _id: string;
  title: string;
  type: 'performance' | 'concert';
  image?: string;
  artist?: { username: string };
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

export function PerformancesSection() {
  const [items, setItems] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformances = async () => {
      try {
        const res = await fetch(`${API_BASE}/performances/all`);
        const data = await res.json();
        setItems((data.performances || []).slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformances();
  }, []);

  if (loading || items.length === 0) {
    return null; // nothing to show yet — avoids an empty flash of broken layout
  }

  const [featured, ...rest] = items;

  return (
    <section className="performancesSection">
      <div className="performancesHeader">
        <p className="eyebrow">Coming up</p>
        <h2 className="sectionTitle">Performance &amp; sound</h2>
        <Link to="/performances" className="viewAllLink">
          View all <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="performancesGrid">
        <Link to={`/performances/${featured._id}`} className="performanceCard performanceCardFeatured">
          <div className="performanceCardImage">
            <img src={featured.image || '/fallback.jpg'} alt={featured.title} />
          </div>
          <p className="performanceType">{featured.type}</p>
          <h3>{featured.title}</h3>
          <p className="performanceArtist">{artistLine(featured)}</p>
          <p className="performanceMeta">
            {featured.isLive ? 'Live now' : formatEventDate(featured.eventDate)}
            {featured.location ? ` · ${featured.location}` : ''}
          </p>
        </Link>

        <div className="performanceStack">
          {rest.map((item) => (
            <Link key={item._id} to={`/performances/${item._id}`} className="performanceCard">
              <div className="performanceCardImage">
                <img src={item.image || '/fallback.jpg'} alt={item.title} />
              </div>
              <p className="performanceType">{item.type}</p>
              <h3>{item.title}</h3>
              <p className="performanceArtist">{artistLine(item)}</p>
              <p className="performanceMeta">{formatEventDate(item.eventDate)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}