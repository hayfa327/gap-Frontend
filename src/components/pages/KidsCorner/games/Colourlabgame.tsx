// src/components/pages/KidsCorner/games/ColourLabGame.tsx
import { useState, useEffect, useMemo } from 'react';
import './Colourlabgame.css';

interface Pigment { name: string; hex: string; }

const pigments: Pigment[] = [
  { name: 'Red', hex: '#E24C4C' },
  { name: 'Blue', hex: '#3E6FD9' },
  { name: 'Yellow', hex: '#F2C230' },
  { name: 'White', hex: '#FFFFFF' },
];

interface Quest { id: string; name: string; recipe: Record<string, number>; }

const quests: Quest[] = [
  { id: 'purple', name: 'Royal Violet', recipe: { Red: 1, Blue: 1 } },
  { id: 'green', name: 'Gallery Emerald', recipe: { Blue: 1, Yellow: 1 } },
  { id: 'orange', name: 'Cadmium Tangerine', recipe: { Red: 1, Yellow: 1 } },
  { id: 'lavender', name: 'Museum Lavender', recipe: { Red: 1, Blue: 1, White: 1 } },
  { id: 'mint', name: 'Botanical Mint', recipe: { Blue: 1, Yellow: 1, White: 1 } },
  { id: 'coral', name: 'Coral Blush', recipe: { Red: 2, White: 1 } },
];

const STORAGE_KEY = 'gap-kids-colour-lab-swatches';

function hexToRgb(hex: string) {
  const v = hex.replace('#', '');
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}

function mixColorFromCounts(counts: Record<string, number>): string {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return '#F4F1EA';
  const totals = { r: 0, g: 0, b: 0 };
  for (const p of pigments) {
    const n = counts[p.name] || 0;
    if (!n) continue;
    const rgb = hexToRgb(p.hex);
    totals.r += rgb.r * n; totals.g += rgb.g * n; totals.b += rgb.b * n;
  }
  const toHex = (n: number) => Math.round(n / total).toString(16).padStart(2, '0');
  return `#${toHex(totals.r)}${toHex(totals.g)}${toHex(totals.b)}`;
}

function matches(counts: Record<string, number>, recipe: Record<string, number>): boolean {
  const used = Object.keys(counts).filter((k) => counts[k] > 0);
  const req = Object.keys(recipe);
  if (used.length !== req.length) return false;
  return req.every((c) => counts[c] === recipe[c]);
}

export function ColourLabGame() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [celebrate, setCelebrate] = useState(false);
  const [saved, setSaved] = useState<{ id: string; name: string; hex: string }[]>([]);
  const [nameDraft, setNameDraft] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      // start fresh on corrupted storage
    }
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const resultColor = mixColorFromCounts(counts);
  const matchedQuest = useMemo(() => quests.find((q) => matches(counts, q.recipe)), [counts]);

  useEffect(() => {
    if (!matchedQuest) return;
    setCompleted((prev) => (prev.has(matchedQuest.id) ? prev : new Set(prev).add(matchedQuest.id)));
  }, [matchedQuest]);

  useEffect(() => {
    if (matchedQuest && !completed.has(matchedQuest.id)) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1000);
      return () => clearTimeout(t);
    }
  }, [matchedQuest, completed]);

  const addDrop = (name: string) => {
    if (total >= 8) return;
    setCounts((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  };

  const wash = () => { setCounts({}); setShowNameInput(false); setNameDraft(''); };

  const saveSwatch = () => {
    if (total === 0) return;
    const name = nameDraft.trim() || matchedQuest?.name || 'My colour';
    const updated = [{ id: Date.now().toString(), name, hex: resultColor }, ...saved].slice(0, 24);
    setSaved(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowNameInput(false);
    setNameDraft('');
  };

  return (
    <div className="labGrid">
      <div className="labMain">
        <div className="dishArea">
          <div className={celebrate ? 'dish celebrate' : 'dish'} style={{ backgroundColor: resultColor }}>
            <div className="dishShine" />
          </div>
          <p className="resultName">{total === 0 ? 'Clean dish' : matchedQuest ? matchedQuest.name : 'A new colour'}</p>
          <p className="dropCount">{total} drop{total === 1 ? '' : 's'}</p>

          <div className="dishActions">
            {!showNameInput ? (
              <button className="secondaryBtn" onClick={() => setShowNameInput(true)} disabled={total === 0}>Save swatch</button>
            ) : (
              <div className="nameInputRow">
                <input placeholder={matchedQuest?.name || 'Name it'} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={24} />
                <button className="primaryBtnSmall" onClick={saveSwatch}>Save</button>
              </div>
            )}
            <button className="secondaryBtn" onClick={wash} disabled={total === 0}>Wash dish</button>
          </div>
        </div>

        <div className="pigmentCards">
          {pigments.map((p) => (
            <button key={p.name} className="pigmentCard" onClick={() => addDrop(p.name)}>
              <span className="pigmentCircle" style={{ backgroundColor: p.hex }} />
              <span className="pigmentName">{p.name}</span>
              <span className="pigmentCount">{counts[p.name] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="labSidebar">
        <div className="sidebarPanel">
          <div className="sidebarPanelHead">
            <p className="sidebarTitle">Mixing quests</p>
            <span className="questProgress">{completed.size}/{quests.length}</span>
          </div>
          <div className="questList">
            {quests.map((q) => {
              const done = completed.has(q.id);
              return (
                <div key={q.id} className={done ? 'questItem questItemDone' : 'questItem'}>
                  <span className="questDot" style={{ backgroundColor: mixColorFromCounts(q.recipe) }} />
                  <span className="questName">{q.name}</span>
                  {done && <span className="questCheck">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="sidebarPanel">
          <p className="sidebarTitle">Saved colours</p>
          {saved.length === 0 ? (
            <p className="emptyHint">No colours saved yet.</p>
          ) : (
            <div className="swatchArchive">
              {saved.map((s) => (
                <div key={s.id} className="savedSwatch">
                  <span className="savedSwatchColor" style={{ backgroundColor: s.hex }} />
                  <span className="savedSwatchName">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}