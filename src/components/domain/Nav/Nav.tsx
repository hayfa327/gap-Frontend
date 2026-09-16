// src/components/domain/Nav/Nav.tsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './nav.css';

const navLinks = [
  { label: 'Live', href: '/live' },
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Performances', href: '/performances' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Artists', href: '/artists' },
  { label: 'Kids', href: '/kids-corner' },
  { label: 'Voices', href: '/voices' },
];

type Role = 'visitor' | 'artist' | 'admin';

export function Nav() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') as Role | null;
  const isLoggedIn = Boolean(token && role);

  // Close the account dropdown when clicking anywhere outside it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close the mobile menu automatically if the screen is resized back to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) setMobileOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setAccountOpen(false);
    setMobileOpen(false);
    navigate('/login');
  };

  const accountLinks = (
    <>
      {!isLoggedIn && (
        <>
          <Link to="/login" className="nav-dropdown-item" onClick={() => { setAccountOpen(false); setMobileOpen(false); }}>
            Login
          </Link>
          <Link to="/register" className="nav-dropdown-item" onClick={() => { setAccountOpen(false); setMobileOpen(false); }}>
            Create Account
          </Link>
        </>
      )}

      {isLoggedIn && (
        <>
          <Link to="/manage-account" className="nav-dropdown-item" onClick={() => { setAccountOpen(false); setMobileOpen(false); }}>
            Manage Account
          </Link>

          {role === 'artist' && (
            <Link to="/my-art" className="nav-dropdown-item" onClick={() => { setAccountOpen(false); setMobileOpen(false); }}>
              My Art
            </Link>
          )}

          {role === 'admin' && (
            <Link to="/admin-dashboard" className="nav-dropdown-item" onClick={() => { setAccountOpen(false); setMobileOpen(false); }}>
              Admin Dashboard
            </Link>
          )}

          <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
            Logout
          </button>
        </>
      )}
    </>
  );

  return (
    <header className="nav">
      <Link to="/" className="nav-logo">
        GAP <span className="nav-logo-sub">Living Art Space</span>
      </Link>

      <nav className="nav-links">
        {navLinks.map((link) => (
          <Link key={link.href} to={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="nav-actions">
        <span className="live-pill">
          <span className="live-dot" />
          Live now
        </span>

        {/* Desktop account dropdown — hidden on mobile via CSS */}
        <div className="nav-account" ref={menuRef}>
          <button className="nav-account-trigger" onClick={() => setAccountOpen((v) => !v)}>
            <span aria-hidden="true">&#128100;</span>
            {isLoggedIn ? role : 'Sign in'}
          </button>

          {accountOpen && <div className="nav-dropdown">{accountLinks}</div>}
        </div>

        {/* Mobile hamburger — hidden on desktop via CSS. Morphs into an X when open. */}
        <button
          className={mobileOpen ? 'nav-burger nav-burger-open' : 'nav-burger'}
          aria-label={mobileOpen ? 'Close menu' : 'Menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="nav-mobile-menu">
          <nav className="nav-mobile-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="nav-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="nav-mobile-divider" />

          <div className="nav-mobile-account">
            <p className="nav-mobile-account-label">
              {isLoggedIn ? `Signed in as ${role}` : 'Account'}
            </p>
            {accountLinks}
          </div>
        </div>
      )}
    </header>
  );
}