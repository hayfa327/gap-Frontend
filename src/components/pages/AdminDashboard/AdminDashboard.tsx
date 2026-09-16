// src/pages/AdminDashboard/AdminDashboard.tsx
import { useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './AdminDashboard.css';

interface DashboardCard {
  title: string;
  description: string;
  path: string;
}
 
const cards: DashboardCard[] = [
  {
    title: 'Create Exhibition',
    description: 'Add a new exhibition to the gallery with artwork, dates, and artist information.',
    path: '/create-exhibition',
  },
  {
    title: 'Add Artist',
    description: 'Create a new artist account with gallery access and exhibition privileges.',
    path: '/add-artist',
  },
  {
    title: 'Create Performance & Concert',
    description: 'Add a live performance or concert, with hero image, video link, artist, and dates.',
    path: '/create-performance',
  },
  {
    title: 'View Exhibitions',
    description: 'Browse all current and upcoming exhibitions in the gallery collection.',
    path: '/exhibitions',
  },
];
 
// Static placeholders for now — swap for a real /stats endpoint once
// the backend exposes one.
const stats = [
  { value: '8', label: 'Total Exhibitions' },
  { value: '24', label: 'Registered Artists' },
  { value: '3', label: 'Active Now' },
];
 
export default function AdminDashboard() {
  const navigate = useNavigate();
 
  return (
    <>
      <Nav />
 
      <section className="adminPage">
        <p className="eyebrow">Admin</p>
        <h1 className="pageTitle">Admin Dashboard</h1>
        <p className="pageSubtitle">Manage exhibitions and artists</p>
 
        <div className="cardGrid">
          {cards.map((card) => (
            <button
              key={card.path}
              className="dashCard"
              onClick={() => navigate(card.path)}
            >
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </button>
          ))}
        </div>
 
        <div className="sectionDivider" />
 
        <h2 className="statsTitle">Quick Stats</h2>
 
        <div className="statsGrid">
          {stats.map((stat) => (
            <div key={stat.label} className="statCard">
              <span className="statValue">{stat.value}</span>
              <span className="statLabel">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
 
      <Footer />
    </>
  );
}