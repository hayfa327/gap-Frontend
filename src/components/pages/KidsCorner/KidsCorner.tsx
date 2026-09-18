// src/components/pages/KidsCorner/KidsCorner.tsx
import { useState } from 'react';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import kidsImage from '../../../assets/kids-corner.jpg';
import { ColourLabGame } from './games/Colourlabgame';
import { ArtistQuizGame } from './games/Artistquizgame';
import { RemixPaintingGame } from './games/Remixpaintinggame ';
import { ColourHuntGame } from './games/Colourhuntgame';
import './KidsCorner.css';



type GameId =
  | 'remix'
  | 'hunt'
  | 'memory'
  | 'difference'
  | 'exhibition'
  | 'artist'
  | 'lab'
  | 'draw';
 
interface GameDef {
  id: GameId;
  number: string;
  title: string;
  description: string;
  tone: 'coral' | 'sky' | 'mint' | 'lavender' | 'sunshine';
  live: boolean;
}
 
const games: GameDef[] = [
  { id: 'remix', number: '01', title: 'Remix a real painting', description: 'Choose a painting, pick a mood, and create your own version.', tone: 'coral', live: true },
  { id: 'hunt', number: '02', title: 'Colour hunt', description: 'Find every colour hiding in the exhibition rooms — then race the timer.', tone: 'sky', live: true },
  { id: 'memory', number: '03', title: 'Memory gallery', description: 'Can you remember where you saw each artwork?', tone: 'mint', live: false },
  { id: 'difference', number: '04', title: 'Spot the difference', description: 'Two museum scenes look almost the same. Can you find what changed?', tone: 'lavender', live: false },
  { id: 'exhibition', number: '05', title: 'Build your own exhibition', description: 'Choose artworks, arrange them on the wall, and create your own mini museum.', tone: 'sunshine', live: false },
  { id: 'artist', number: '06', title: 'Who am I?', description: 'Meet an artwork, follow the clues and guess the artist.', tone: 'coral', live: true },
  { id: 'lab', number: '07', title: 'Colour Lab', description: 'Bring pigments together and discover what they become.', tone: 'sky', live: true },
  { id: 'draw', number: '08', title: 'Draw on the museum wall', description: 'Make an artwork, choose your brush, then hang it in the gallery.', tone: 'mint', live: false },
];
 
const gameViews: Partial<Record<GameId, () => React.ReactNode>> = {
  lab: () => <ColourLabGame />,
  artist: () => <ArtistQuizGame />,
  remix: () => <RemixPaintingGame />,
  hunt: () => <ColourHuntGame />,
};
 
export default function KidsCorner() {
  const [active, setActive] = useState<GameId | null>(null);
  const activeGame = games.find((g) => g.id === active);
  const ActiveView = active ? gameViews[active] : null;
 
  const scrollToGames = () => {
    document.getElementById('kids-games')?.scrollIntoView({ behavior: 'smooth' });
  };
 
  const openGame = (id: GameId) => {
    setActive(id);
    setTimeout(() => {
      document.querySelector('.gameOpen')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };
 
  return (
    <>
      <Nav />
 
      <main className="kidsCorner">
        <section className="kidsHeroSection">
          <div className="kidsHeroText">
            <p className="eyebrow">Kids corner</p>
            <h1 className="kidsHeroTitle">
              <span>What color</span>
              <span>is a feeling?</span>
            </h1>
            <p className="kidsHeroSubtitle">
              Step into a playful art world. Explore, remix, make and meet
              artists through games and creative challenges.
            </p>
            <button className="primaryBtn" onClick={scrollToGames}>
              Enter Kids Corner <span aria-hidden="true">↓</span>
            </button>
          </div>
 
          <div className="kidsHeroImageWrap">
            <img src={kidsImage} alt="Children exploring a colourful translucent art installation" />
          </div>
        </section>
 
        <section id="kids-games" className="kidsGallerySection">
          <div className="kidsGalleryHeader">
            <p className="eyebrow">Eight rooms · Make your own way</p>
            <h2 className="kidsGalleryTitle">The playful exhibition</h2>
          </div>
 
          {active && activeGame && ActiveView ? (
            <div className="gameOpen">
              <button className="ghostBtn" onClick={() => setActive(null)}>
                ← All games
              </button>
 
              <header className="gameHeading">
                <span className={`gameNumber tone-${activeGame.tone}`}>{activeGame.number}</span>
                <div>
                  <p className="eyebrow">Now playing</p>
                  <h2 className="gameTitle">{activeGame.title}</h2>
                  <p className="gameDesc">{activeGame.description}</p>
                </div>
              </header>
 
              <div className="gameCanvas">
                <ActiveView />
              </div>
            </div>
          ) : (
            <div className="gameCardGrid">
              {games.map((game) => (
                <button
                  key={game.id}
                  className={`roomCard tone-${game.tone} ${!game.live ? 'roomCardSoon' : ''}`}
                  onClick={() => game.live && openGame(game.id)}
                  disabled={!game.live}
                >
                  <span className="roomCardTop">
                    <span className="eyebrow">Room {game.number}</span>
                    {!game.live && <span className="soonTag">Coming soon</span>}
                  </span>
 
                  <span className="roomCardBody">
                    <strong className="roomCardTitle">{game.title}</strong>
                    <span className="roomCardDesc">{game.description}</span>
                  </span>
 
                  {game.live && (
                    <span className="arrowLink">
                      Play <span aria-hidden="true">↗</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
 
      <Footer />
    </>
  );
}
 