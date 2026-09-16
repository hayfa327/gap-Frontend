// src/components/domain/CurrentExhibition/CurrentExhibition.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './CurrentExhibition.css';


interface Exhibition {
  _id: string;
  title: string;
  image?: string;
  artist?: { username: string };
  startDate: string;
  endDate: string;
}

interface ExhibitionsResponse {
  exhibitions: Exhibition[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const startStr = new Date(start).toLocaleDateString('en-GB', opts).toUpperCase();
  const endStr = new Date(end).toLocaleDateString('en-GB', { ...opts, year: 'numeric' }).toUpperCase();
  return `${startStr} — ${endStr}`;
}

export function CurrentExhibition() {
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        const res = await fetch(`${API_BASE}/exhibitions/all`);
        const data: ExhibitionsResponse = await res.json();
        // Show the most recent exhibition as "current" — adjust this
        // once the backend exposes a proper "is this live now" field.
        setExhibition(data.exhibitions?.[0] ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExhibitions();
  }, []);

  if (loading || !exhibition) {
    return null; // nothing to show yet — avoids an empty flash of broken layout
  }

  return (
    <section className="currentExhibition">
      <div className="currentExhibitionHeader">
        <p className="eyebrow">On view now</p>
        <h2 className="sectionTitle">Current exhibition</h2>
        <Link to="/exhibitions" className="viewAllLink">
          View all <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="currentExhibitionGrid">
        <div className="currentExhibitionImage">
          <img src={exhibition.image || '/fallback.jpg'} alt={exhibition.title} />
        </div>

        <div className="currentExhibitionDetails">
          <p className="exhibitionDates">
            {formatDateRange(exhibition.startDate, exhibition.endDate)}
          </p>
          <h3 className="exhibitionTitle">{exhibition.title}</h3>
          <p className="exhibitionArtist">{exhibition.artist?.username}</p>
          <p className="exhibitionMeta">Installation · Stockholm + Online</p>

          <Link to={`/exhibitions/${exhibition._id}`} className="enterExhibitionLink">
            Enter exhibition <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}