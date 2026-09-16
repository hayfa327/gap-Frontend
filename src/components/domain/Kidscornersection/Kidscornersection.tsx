// src/components/domain/KidsCornerSection/KidsCornerSection.tsx
import { Link } from 'react-router-dom';
import kidsImage from '../../../assets/kids-corner.jpg';
import './Kidscornersection.css';

export function KidsCornerSection() {
  return (
    <section className="kidsSection">
      <div className="kidsGrid">
        <div className="kidsContent">
          <p className="kidsEyebrow">Kids corner</p>
          <h2 className="kidsTitle">What color is a feeling?</h2>
          <p className="kidsSubtitle">
            Step into a playful art world. Explore, remix, make and meet
            artists with GAP&apos;s creative guide.
          </p>
          <Link to="/kids-corner" className="kidsLink">
            Enter Kids Corner <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="kidsImageWrap">
          <img src={kidsImage} alt="Two children exploring a colourful installation" />
        </div>
      </div>
    </section>
  );
}