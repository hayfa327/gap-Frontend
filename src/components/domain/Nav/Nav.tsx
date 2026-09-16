// src/components/domain/Nav/Nav.tsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './nav.css';

 const navLinks = [
  { label: 'Live', href: '/live' },
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Performances & Concerts', href: '/performances' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Artists', href: '/artists' },
  { label: 'Kids', href: '/kids-corner' },
  { label: 'Voices', href: '/voices' },
];
 
type Role = 'visitor' | 'artist' | 'admin';
 
export function Nav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
 
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') as Role | null;
  const isLoggedIn = Boolean(token && role);
 
  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
 
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setOpen(false);
    navigate('/login');
  };
 
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
 
        <div className="nav-account" ref={menuRef}>
          <button className="nav-account-trigger" onClick={() => setOpen((v) => !v)}>
            <span aria-hidden="true">&#128100;</span>
            {isLoggedIn ? role : 'Sign in'}
          </button>
 
          {open && (
            <div className="nav-dropdown">
              {!isLoggedIn && (
                <>
                  <Link to="/login" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                    Create Account
                  </Link>
                </>
              )}
 
              {isLoggedIn && (
                <>
                  <Link to="/manage-account" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                    Manage Account
                  </Link>
 
                  {role === 'artist' && (
                    <Link to="/my-art" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                      My Art
                    </Link>
                  )}
 
                  {role === 'admin' && (
                    <Link to="/admin-dashboard" className="nav-dropdown-item" onClick={() => setOpen(false)}>
                      Admin Dashboard
                    </Link>
                  )}
 
                  <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}