// src/components/domain/Footer/Footer.tsx
import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footerContent">
        <h2 className="footerLogo">GAP</h2>
        <p className="footerTagline">
          A living art space in Stockholm, closing the distance between
          people, places and time.
        </p>
      </div>

      <div className="footerLinks">
        <Link to="/about">The space</Link>
        <a href="mailto:hello@gapspace.art">Contact</a>
        <span className="footerLocation">Stockholm, SE</span>
      </div>
    </footer>
  );
}