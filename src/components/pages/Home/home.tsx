import { HeroTitle } from '../Home/herotitle/herotitle';
import { Footer} from '../../domain/Footer/Footer';
import { Nav } from '../../domain/Nav/Nav';
import heroImage from '../../../assets/herotitle.jpeg';
import { CurrentExhibition } from '../../domain/CurrentExhibition/CurrentExhibition';
import { PerformancesSection } from '../../domain/PerformanceSection/PerformanceSection';  
import { ArtistsSection } from '../../domain/Artistssection/Artistssection';
import { KidsCornerSection } from '../../domain/Kidscornersection/KidsCornerSection';



import "./home.css"


 export default function Home() {
  return (
    <>
      <Nav />

   <section className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
  <div className="heroOverlay" />
  <div className="heroContent">
    <p className="heroEyebrow">Performance · 42 min</p>
    <HeroTitle lines={['The Distance', 'Between Us']} />

    <div className="heroFooter">
      <button className="heroLiveBtn">
        <span className="heroPlayIcon">▶</span> Enter live
      </button>
      <div className="heroLiveInfo">
        <p>A live work by Hayfa Safa</p>
        <p className="heroLiveSub">Streaming until 20:15 CET</p>
      </div>
    </div>
  </div>
</section>

<CurrentExhibition />
  <PerformancesSection />
    <ArtistsSection />
    <KidsCornerSection />

      <Footer />
    </>
  );
}
