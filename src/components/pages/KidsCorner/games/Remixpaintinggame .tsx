// src/components/pages/KidsCorner/games/RemixPaintingGame.tsx
import { useState, type JSX } from 'react';
import './Remixpaintinggame.css';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  art: JSX.Element;
}

const MondrianArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#F5F1E8" />
    <rect x="0" y="0" width="110" height="110" fill="#E24C4C" />
    <rect x="150" y="0" width="50" height="70" fill="#F5F1E8" />
    <rect x="0" y="150" width="30" height="50" fill="#F5F1E8" />
    <rect x="0" y="180" width="30" height="20" fill="#F2C230" />
    <rect x="150" y="130" width="50" height="70" fill="#3E6FD9" />
    <g stroke="#111" strokeWidth="6">
      <line x1="0" y1="110" x2="200" y2="110" />
      <line x1="110" y1="0" x2="110" y2="200" />
      <line x1="150" y1="0" x2="150" y2="200" />
      <line x1="0" y1="150" x2="150" y2="150" />
      <line x1="30" y1="150" x2="30" y2="200" />
      <line x1="0" y1="180" x2="30" y2="180" />
      <line x1="150" y1="130" x2="200" y2="130" />
    </g>
  </svg>
);

const WaveArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#E8ECE4" />
    <path d="M0 90 Q30 60 60 90 T120 90 T180 90 T200 90 V0 H0 Z" fill="#3E6FD9" opacity="0.85" />
    <path d="M0 130 Q30 100 60 130 T120 130 T180 130 T200 130 V200 H0 Z" fill="#1E2A4A" />
    <circle cx="165" cy="35" r="18" fill="#F2C230" />
  </svg>
);

const FlowerArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#FBF6EC" />
    {Array.from({ length: 6 }).map((_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const cx = 100 + Math.cos(angle) * 40;
      const cy = 100 + Math.sin(angle) * 40;
      return <ellipse key={i} cx={cx} cy={cy} rx="28" ry="18" fill="#E24C4C" transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`} />;
    })}
    <circle cx="100" cy="100" r="22" fill="#F2C230" />
  </svg>
);

const ShapesArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#1A1A1A" />
    <circle cx="70" cy="70" r="45" fill="#5FBF9F" />
    <rect x="110" y="100" width="70" height="70" fill="#F2C230" />
    <polygon points="40,150 90,150 65,105" fill="#8B87C4" />
  </svg>
);

const artworks: Artwork[] = [
  { id: 'a1', title: 'Composition with Red, Blue and Yellow', artist: 'Piet Mondrian', art: MondrianArt },
  { id: 'a2', title: 'Sea and Sun', artist: 'Studio piece', art: WaveArt },
  { id: 'a3', title: 'Blossom Circle', artist: 'Studio piece', art: FlowerArt },
  { id: 'a4', title: 'Night Shapes', artist: 'Studio piece', art: ShapesArt },
];

interface Mood { name: string; filter: string; note: string; }

const moods: Mood[] = [
  { name: 'Original', filter: 'none', note: 'The painting exactly as it was made.' },
  { name: 'Coral', filter: 'hue-rotate(-30deg) saturate(1.6)', note: 'Warm, sunny, a little playful.' },
  { name: 'Sunshine', filter: 'hue-rotate(40deg) saturate(1.8) brightness(1.1)', note: 'Bright and full of energy.' },
  { name: 'Sky', filter: 'hue-rotate(140deg) saturate(1.4)', note: 'Cool, calm, like a clear morning.' },
  { name: 'Mint', filter: 'hue-rotate(90deg) saturate(1.3)', note: 'Fresh and a little mysterious.' },
  { name: 'Dream', filter: 'invert(1) hue-rotate(180deg)', note: 'Upside down — like a photo negative.' },
];

export function RemixPaintingGame() {
  const [artIndex, setArtIndex] = useState(0);
  const [moodIndex, setMoodIndex] = useState(0);

  const artwork = artworks[artIndex];
  const mood = moods[moodIndex];

  return (
    <div className="remixGrid">
      <div className="remixStage">
        <div className="remixArtwork" style={{ filter: mood.filter }}>
          {artwork.art}
        </div>
      </div>

      <div className="remixPanel">
        <p className="eyebrow">Artwork {artIndex + 1} of {artworks.length}</p>
        <h3 className="remixTitle">{artwork.title}</h3>
        <p className="remixArtist">{artwork.artist}</p>

        <div className="moodRow">
          {moods.map((m, i) => (
            <button
              key={m.name}
              className={i === moodIndex ? 'moodBtn moodBtnActive' : 'moodBtn'}
              onClick={() => setMoodIndex(i)}
            >
              {m.name}
            </button>
          ))}
        </div>

        <p className="moodNote"><strong>{mood.name}</strong> — {mood.note}</p>

        <div className="artworkThumbs">
          {artworks.map((a, i) => (
            <button
              key={a.id}
              className={i === artIndex ? 'thumbBtn thumbBtnActive' : 'thumbBtn'}
              onClick={() => setArtIndex(i)}
              aria-label={`Choose ${a.title}`}
            >
              <div className="thumbArt">{a.art}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}