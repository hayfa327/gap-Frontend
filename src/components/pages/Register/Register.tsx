// src/pages/Register/Register.tsx
import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import galleryImage from '../../../assets/gallery-hero.jpg';
import './Register.css';

type Role = 'visitor' | 'artist' | 'admin';

interface RegisterResponse {
  token?: string;
  user?: { username: string; role: string };
  message?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const roleOptions: { role: Role; title: string; description: string }[] = [
  {
    role: 'visitor',
    title: 'Visitor',
    description: 'Save works, follow artists and get live reminders.',
  },
  {
    role: 'artist',
    title: 'Artist',
    description: 'Share works, publish events and meet other artists.',
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Curate the programme and manage the whole space.',
  },
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('visitor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password) {
      setError('Please fill all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      const data: RegisterResponse = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        return;
      }

      // New accounts register as "visitor" by default on the backend today —
      // send the person to login so they can sign in with their new credentials.
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />

      <section className="authPage">
        <div className="authGrid">
          <div className="authColumn">
            <p className="eyebrow">Join the space</p>
            <h1 className="authHero">Create account</h1>
            <p className="authSubtitle">
              Save works, follow artists and keep every live moment close.
            </p>

            {error && <p className="errorMsg">{error}</p>}

            <form className="authForm" onSubmit={handleRegister}>
              <div className="inputGroup">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={username}
                  autoComplete="name"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="inputGroup">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="inputGroup">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <p className="roleLabel">I am joining as</p>

              <div className="roleOptions">
                {roleOptions.map((option) => (
                  <button
                    key={option.role}
                    type="button"
                    className={`roleCard ${role === option.role ? 'roleCard--selected' : ''}`}
                    onClick={() => setRole(option.role)}
                  >
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="primaryBtn"
                disabled={!username || !email || !password || loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="inlineLink">
              Already a member? <Link to="/login">Sign in</Link>
            </p>
          </div>

          <div className="authImage" style={{ backgroundImage: `url(${galleryImage})` }} />
        </div>
      </section>

      <Footer />
    </>
  );
}