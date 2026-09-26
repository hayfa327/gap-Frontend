// src/components/domain/Nav/Nav.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './nav.css';

const navLinks = [
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Performances & concerts', href: '/performances' },
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
    // Stay on the current page instead of forcing a redirect to /login —
    // the page will simply reflect the logged-out state (e.g. the nav
    // switches back to showing "Sign in").
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
        {/* Always visible — desktop AND mobile — unlike the old account
            dropdown, which was hidden below 900px, leaving mobile users
            with no visible way to sign in until they opened the burger
            menu. Logged-in users still get the full account dropdown
            with Manage Account / My Art / Admin / Logout. */}
        {!isLoggedIn && (
          <Link to="/login" className="nav-signin-btn">
            Sign in
          </Link>
        )}

        {isLoggedIn && (
          <div className="nav-account" ref={menuRef}>
            <button className="nav-account-trigger" onClick={() => setAccountOpen((v) => !v)}>
              <span aria-hidden="true">&#128100;</span>
              {role}
            </button>

            {accountOpen && <div className="nav-dropdown">{accountLinks}</div>}
          </div>
        )}

        {/* Mobile menu toggle — hidden on desktop via CSS. Plain text,
            no icon, to match the site's minimal editorial typography
            instead of a generic app-style hamburger glyph. */}
        <button
          className="nav-menu-toggle"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? 'Close' : 'Menu'}
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