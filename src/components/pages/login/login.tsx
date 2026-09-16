// src/pages/Login/Login.tsx
import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import galleryImage from '../../../assets/gallery-hero.jpg';
import './login.css';
import { Footer } from '../../domain/Footer/Footer';

type Role = 'admin' | 'artist' | 'visitor';

interface LoginResponse {
  token: string;
  user: {  _id : string; username: string; role: string };
  message?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const demoRoles: {
  role: Role;
  title: string;
  description: string;
  email: string;
}[] = [
  {
    role: 'visitor',
    title: 'Visitor',
    description: 'Save works, follow artists and get live reminders.',
    email: 'demo.visitor@gapspace.art',
  },
  {
    role: 'artist',
    title: 'Artist',
    description: 'Share works, publish events and meet other artists.',
    email: 'demo.artist@gapspace.art',
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Curate the programme and manage the whole space.',
    email: 'demo.admin@gapspace.art',
  },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const performLogin = async (credentials: { email: string; password: string }) => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data: LoginResponse = await response.json();
      if (!response.ok) {
        setError(data.message || 'Login failed');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('userId', data.user._id);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }
    performLogin({ email, password });
  };

  const loginDemo = (role: Role) => {
    const demoCredentials: Record<Role, { email: string; password: string }> = {
      admin: { email: 'admin@test.com', password: 'Admin123' },
      artist: { email: 'artist@test.com', password: 'Artist123' },
      visitor: { email: 'visitor@test.com', password: 'Visitor123' },
    };
    performLogin(demoCredentials[role]);
  };

  return (
    <>
      <Nav />

      <section className="authPage">
        <div className="authGrid">
          {/* Left column — form + demo cards */}
          <div className="authColumn">
            <p className="eyebrow">Welcome back</p>
            <h1 className="authHero">Sign in</h1>

            {error && <p className="errorMsg">{error}</p>}

            <form className="authForm" onSubmit={handleLogin}>
              <div className="inputGroup">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="inputGroup">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="primaryBtn" disabled={!email || !password || loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="inlineLink">
              New to GAP? <Link to="/register">Create an account</Link>
            </p>

            <div className="authDivider" />

            <p className="eyebrow">Live demo · No sign up needed</p>
            <p className="demoIntro">Step straight into GAP as one of three kinds of member.</p>

            <div className="demoCards">
              {demoRoles.map((demo) => (
                <button
                  key={demo.role}
                  className="demoCard"
                  onClick={() => loginDemo(demo.role)}
                  disabled={loading}
                >
                  <div className="demoCardHead">
                    <h3>{demo.title}</h3>
                    <span aria-hidden="true">&#8599;</span>
                  </div>
                  <p>{demo.description}</p>
                  <span className="demoEmail">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right column — full-height image */}
          <div className="authImage" style={{ backgroundImage: `url(${galleryImage})` }} />
        </div>
      </section>
      <Footer />
    </>
  );
}