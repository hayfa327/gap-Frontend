// src/components/pages/KidsCorner/games/ArtistQuizGame.tsx
import { useState, type JSX } from 'react';
import './Artistquizgame.css';

interface Question {
  id: string;
  artworkTitle: string;
  artwork: JSX.Element;
  question: string;
  options: string[];
  correctIndex: number;
  fact: string;
}

const MondrianArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#F5F1E8" />
    <rect x="0" y="0" width="110" height="110" fill="#E24C4C" />
    <rect x="150" y="0" width="50" height="70" fill="#F5F1E8" />
    <rect x="0" y="150" width="30" height="50" fill="#F5F1E8" />
    <rect x="0" y="180" width="30" height="20" fill="#F2C230" />
    <rect x="150" y="130" width="50" height="70" fill="#3E6FD9" />
    <g stroke="#111" strokeWidth="6">
      <line x1="0" y1="110" x2="200" y2="110" />
      <line x1="110" y1="0" x2="110" y2="200" />
      <line x1="150" y1="0" x2="150" y2="200" />
      <line x1="0" y1="150" x2="150" y2="150" />
      <line x1="30" y1="150" x2="30" y2="200" />
      <line x1="0" y1="180" x2="30" y2="180" />
      <line x1="150" y1="130" x2="200" y2="130" />
    </g>
  </svg>
);

const KusamaArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#1A1A1A" />
    <ellipse cx="100" cy="130" rx="55" ry="50" fill="#F2A430" />
    <path d="M95 60 Q90 30 105 15" stroke="#5FBF9F" strokeWidth="10" fill="none" strokeLinecap="round" />
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      const r = 15 + (i % 3) * 12;
      const cx = 100 + Math.cos(angle) * r;
      const cy = 130 + Math.sin(angle) * r * 0.85;
      return <circle key={i} cx={cx} cy={cy} r={5 + (i % 3)} fill="#1A1A1A" />;
    })}
  </svg>
);

const MatisseArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#F2EADF" />
    <path d="M40 160 Q30 100 60 60 Q80 30 100 50 Q90 90 70 120 Q100 100 130 70 Q150 50 160 70 Q140 110 100 140 Q140 130 160 150 L150 170 Q110 165 80 180 Q55 185 40 160 Z" fill="#5FBF9F" />
    <circle cx="150" cy="40" r="18" fill="#E24C4C" />
    <path d="M30 40 L50 60 L30 80 L10 60 Z" fill="#F2C230" />
  </svg>
);

const VanGoghArt = (
  <svg viewBox="0 0 200 200" className="artworkSvg">
    <rect width="200" height="200" fill="#1E2A4A" />
    <circle cx="150" cy="45" r="22" fill="#F2C230" />
    {[0, 1, 2].map((ring) => (
      <circle key={ring} cx="150" cy="45" r={28 + ring * 10} fill="none" stroke="#F2C230" strokeOpacity={0.35 - ring * 0.1} strokeWidth="4" />
    ))}
    <path d="M0 120 Q40 100 60 130 Q90 160 130 130 Q160 110 200 140 V200 H0 Z" fill="#111827" />
    {Array.from({ length: 5 }).map((_, i) => (
      <path key={i} d={`M${20 + i * 35} 90 Q${30 + i * 35} 60 ${25 + i * 35} 40`} stroke="#3E6FD9" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.7" />
    ))}
  </svg>
);

const questions: Question[] = [
  { id: 'q1', artworkTitle: 'Composition with Red, Blue and Yellow (1930)', artwork: MondrianArt, question: 'Who created this iconic composition with red, yellow, and blue rectangles framed by black lines?', options: ['Piet Mondrian', 'Claude Monet', 'Pablo Picasso', 'Andy Warhol'], correctIndex: 0, fact: 'Piet Mondrian believed a painting could be made from just lines, squares, and a few bold colours.' },
  { id: 'q2', artworkTitle: 'Infinity Dots & Yellow Pumpkin (1994)', artwork: KusamaArt, question: 'Who is famous for painting and sculpting rhythmic polka dots that spread across entire rooms?', options: ['Georgia O\'Keeffe', 'Yayoi Kusama', 'Henri Matisse', 'Frida Kahlo'], correctIndex: 1, fact: 'Yayoi Kusama sees dots everywhere! To her, every person, tree, and star is a dot connected in an endless, joyful cosmic landscape.' },
  { id: 'q3', artworkTitle: 'The Snail, cut paper (1953)', artwork: MatisseArt, question: 'This artist cut shapes out of coloured paper instead of painting when he got older. Who was it?', options: ['Salvador Dalí', 'Jackson Pollock', 'Henri Matisse', 'Wassily Kandinsky'], correctIndex: 2, fact: 'Henri Matisse called this technique "painting with scissors" — he cut shapes from painted paper and arranged them like a collage.' },
  { id: 'q4', artworkTitle: 'The Starry Night (1889)', artwork: VanGoghArt, question: 'Who painted swirling stars and a glowing moon in one of the most famous night skies ever painted?', options: ['Leonardo da Vinci', 'Vincent van Gogh', 'Claude Monet', 'Rembrandt'], correctIndex: 1, fact: 'Vincent van Gogh painted "The Starry Night" from memory, looking out of the window of the hospital room where he was staying.' },
];

const letters = ['A', 'B', 'C', 'D'];

export function ArtistQuizGame() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    if (index === question.correctIndex) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (isLast) { setFinished(true); return; }
    setCurrentIndex((i) => i + 1);
    setSelected(null);
  };

  const handleRestart = () => {
    setCurrentIndex(0); setSelected(null); setScore(0); setFinished(false);
  };

  if (finished) {
    return (
      <div className="quizFinish">
        <h3 className="finishTitle">{score === questions.length ? 'Perfect score!' : 'Nicely done!'}</h3>
        <p className="finishScore">You got {score} out of {questions.length} right.</p>
        <button className="primaryBtnSmall" onClick={handleRestart}>Play again</button>
      </div>
    );
  }

  return (
    <div className="quizGame">
      <div className="progressDots">
        {questions.map((q, i) => (
          <span key={q.id} className={i <= currentIndex ? 'progressDot progressDotActive' : 'progressDot'} />
        ))}
      </div>

      <div className="quizBody">
        <div className="artworkColumn">
          <div className="artworkFrame">{question.artwork}</div>
          <p className="artworkCaption">{question.artworkTitle}</p>
        </div>

        <div className="questionColumn">
          <h3 className="quizQuestion">{question.question}</h3>

          <div className="optionsList">
            {question.options.map((option, index) => {
              const isCorrect = index === question.correctIndex;
              const isSelected = index === selected;
              let stateClass = '';
              if (selected !== null) {
                if (isCorrect) stateClass = 'optionCorrect';
                else if (isSelected) stateClass = 'optionWrong';
              }
              return (
                <button key={option} className={`optionBtn ${stateClass}`} onClick={() => handleSelect(index)} disabled={selected !== null}>
                  <span className="optionLetter">{letters[index]}</span>
                  <span className="optionText">{option}</span>
                  {selected !== null && isCorrect && <span className="optionIcon">✓</span>}
                  {selected !== null && isSelected && !isCorrect && <span className="optionIcon">✕</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selected !== null && (
        <div className="feedbackBox">
          <span className="feedbackIcon" aria-hidden="true">📖</span>
          <div>
            <p className="feedbackVerdict">
              {selected === question.correctIndex ? 'Good observation!' : 'Almost —'} Artist: {question.options[question.correctIndex]}
            </p>
            <p className="feedbackFact">{question.fact}</p>
          </div>
          <button className="primaryBtnSmall feedbackNextBtn" onClick={handleNext}>
            {isLast ? 'See my score →' : 'Next artwork →'}
          </button>
        </div>
      )}
    </div>
  );
}