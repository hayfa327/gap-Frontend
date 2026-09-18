// src/components/pages/KidsCorner/games/ColourHuntGame.tsx
import { useEffect, useState } from 'react';
import './Colourhuntgame.css';

const targets = ['blue', 'coral', 'yellow', 'mint'] as const;
type ColourName = (typeof targets)[number];

const colourHex: Record<ColourName, string> = {
  blue: '#3E6FD9',
  coral: '#F26B6B',
  yellow: '#F2C230',
  mint: '#5FBF9F',
};

interface GalleryObject {
  colour: ColourName;
  x: number;
  y: number;
  shape: 'circle' | 'square' | 'triangle';
  label: string;
}

const objects: GalleryObject[] = [
  { colour: 'blue', x: 18, y: 35, shape: 'square', label: 'blue sculpture' },
  { colour: 'coral', x: 72, y: 30, shape: 'circle', label: 'coral painting' },
  { colour: 'yellow', x: 48, y: 68, shape: 'triangle', label: 'yellow bench' },
  { colour: 'mint', x: 84, y: 65, shape: 'circle', label: 'mint vase' },
  { colour: 'blue', x: 8, y: 75, shape: 'circle', label: 'small object' },
  { colour: 'coral', x: 60, y: 12, shape: 'square', label: 'small object' },
];

const ROUND_TIME = 30;

export function ColourHuntGame() {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [found, setFound] = useState<ColourName[]>([]);
  const [note, setNote] = useState('Look closely around the room.');
  const [shake, setShake] = useState<string | null>(null);

  const gameActive = round < targets.length && timeLeft > 0;

  useEffect(() => {
    if (!gameActive) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameActive]);

  const pick = (obj: GalleryObject, index: number) => {
    if (!gameActive) return;
    const target = targets[round];

    if (obj.colour === target && !found.includes(target)) {
      setFound((prev) => [...prev, target]);
      setScore((s) => s + 10);
      setNote('Wonderful eye! Here comes a new colour.');
      setRound((r) => r + 1);
    } else {
      setNote('Almost — look for another object.');
      setShake(`${obj.colour}-${index}`);
      setTimeout(() => setShake(null), 350);
    }
  };

  const reset = () => {
    setRound(0);
    setScore(0);
    setTimeLeft(ROUND_TIME);
    setFound([]);
    setNote('Look closely around the room.');
  };

  return (
    <div className="huntGame">
      <div className="huntScore">
        <span>Time <strong>{Math.max(timeLeft, 0)}s</strong></span>
        <span>Score <strong>{score}</strong></span>
        <span>Found <strong>{round}/{targets.length}</strong></span>
      </div>

      {gameActive ? (
        <>
          <h3 className="huntPrompt">
            Find something <span className={`huntColourWord colour-${targets[round]}`}>{targets[round].toUpperCase()}</span>
          </h3>

          <div className="galleryRoom" aria-label="Gallery room scavenger hunt">
            {objects.map((obj, i) => (
              <button
                key={`${obj.colour}-${i}`}
                className={`galleryObject shape-${obj.shape} ${shake === `${obj.colour}-${i}` ? 'objShake' : ''} ${found.includes(obj.colour) ? 'objFound' : ''}`}
                style={{ left: `${obj.x}%`, top: `${obj.y}%`, backgroundColor: colourHex[obj.colour] }}
                onClick={() => pick(obj, i)}
                aria-label={obj.label}
              />
            ))}
          </div>

          <p className="huntNote" aria-live="polite">{note}</p>
        </>
      ) : (
        <div className="huntFinish">
          <p className="huntFinishIcon">✓</p>
          <h3>{round === targets.length ? 'You found every colour!' : 'Time for another look?'}</h3>
          <p className="huntFinishScore">Score: {score}</p>
          <button className="primaryBtnSmall" onClick={reset}>Play again</button>
        </div>
      )}
    </div>
  );
}