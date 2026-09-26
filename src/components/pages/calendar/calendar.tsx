// src/pages/Calendar/Calendar.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../../domain/Nav/Nav';
import { Footer } from '../../domain/Footer/Footer';
import './calendar.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

type EventType = 'performance' | 'concert' | 'exhibition';

interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  date: Date;
  artist?: string;
  location?: string;
  isLive?: boolean;
  linkTo: string;
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TYPE_LABEL: Record<EventType, string> = { performance: 'Performance', concert: 'Concert', exhibition: 'Exhibition' };

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [perfRes, exRes] = await Promise.all([
          fetch(`${API_BASE}/performances/all`),
          fetch(`${API_BASE}/exhibitions/exhibitions`),
        ]);
        const perfData = await perfRes.json();
        const exData = await exRes.json();

        const perfEvents: CalendarEvent[] = (perfData.performances || []).map((p: any) => ({
          id: p._id,
          type: p.type as EventType,
          title: p.title,
          date: new Date(p.eventDate),
          artist: p.artist?.username,
          location: p.location,
          isLive: p.isLive,
          linkTo: `/performances/${p._id}`,
        }));

        const exEvents: CalendarEvent[] = (exData.exhibitions || []).map((ex: any) => ({
          id: ex._id,
          type: 'exhibition' as EventType,
          title: ex.title,
          date: new Date(ex.startDate),
          artist: ex.artist?.username,
          linkTo: `/exhibitions/${ex._id}`,
        }));

        setEvents([...perfEvents, ...exEvents]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    filteredEvents.forEach((e) => {
      if (e.date.getFullYear() === cursor.getFullYear() && e.date.getMonth() === cursor.getMonth()) {
        const day = e.date.getDate();
        map.set(day, [...(map.get(day) || []), e]);
      }
    });
    return map;
  }, [filteredEvents, cursor]);

  const selectedEvents = selectedDate ? filteredEvents.filter((e) => sameDay(e.date, selectedDate)) : [];

  const goToMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedDate(null);
  };

  return (
    <>
      <Nav />

      <section className="calendarPage">
        <p className="eyebrow">Programme</p>
        <h1 className="pageTitle">Calendar</h1>
        <p className="pageSubtitle">
          Find live performances, exhibition openings, concerts and conversations across GAP.
        </p>

        <div className="calendarToolbar">
          <div className="monthNav">
            <button onClick={() => goToMonth(-1)} aria-label="Previous month">‹</button>
            <h2>{MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <button onClick={() => goToMonth(1)} aria-label="Next month">›</button>
          </div>

          <div className="filterTabs">
            {(['all', 'performance', 'concert', 'exhibition'] as const).map((f) => (
              <button
                key={f}
                className={filter === f ? 'filterTab filterTabActive' : 'filterTab'}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : TYPE_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="stateMsg">Loading...</p>
        ) : (
          <div className="calendarLayout">
            <div className="calendarGridWrap">
              <div className="weekdayRow">
                {WEEKDAYS.map((wd) => (
                  <span key={wd}>{wd}</span>
                ))}
              </div>

              <div className="calendarGrid">
                {grid.map((day, i) => {
                  if (day === null) return <div key={i} className="dayCell dayCellBlank" />;

                  const dayEvents = eventsByDay.get(day) || [];
                  const dateObj = new Date(cursor.getFullYear(), cursor.getMonth(), day);
                  const isSelected = selectedDate && sameDay(selectedDate, dateObj);

                  return (
                    <button
                      key={i}
                      className={isSelected ? 'dayCell dayCellSelected' : 'dayCell'}
                      onClick={() => setSelectedDate(dateObj)}
                    >
                      <span className="dayNumber">{day}</span>
                      {dayEvents.slice(0, 1).map((e) => (
                        <span key={e.id} className={`dayDotRow dayDotRow-${e.type}`}>
                          <span className="dayDot" />
                          <span className="dayDotLabel">{e.title}</span>
                        </span>
                      ))}
                      {dayEvents.length > 1 && (
                        <span className="dayMore">+{dayEvents.length - 1} more</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="calendarSidebar">
              {!selectedDate && <p className="stateMsg">Select a date to see what's on.</p>}

              {selectedDate && (
                <>
                  <p className="selectedLabel">Selected date</p>
                  <h3 className="selectedDate">
                    {selectedDate.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>

                  {selectedEvents.length === 0 && (
                    <p className="stateMsg">Nothing scheduled this day.</p>
                  )}

                  {selectedEvents.map((e) => (
                    <Link key={e.id} to={e.linkTo} className="eventCard">
                      <div className="eventCardHead">
                        <span className="eventType">
                          <span className={`typeDot typeDot-${e.type}`} />
                          {TYPE_LABEL[e.type]}
                        </span>
                        {e.isLive && <span className="livePillSmall">LIVE</span>}
                      </div>
                      <h4>{e.title}</h4>
                      {e.artist && <p className="eventArtist">{e.artist}</p>}
                      {(e.location || e.type !== 'exhibition') && (
                        <p className="eventMeta">
                          {e.type !== 'exhibition' &&
                            e.date.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }) + ' CET'}
                          {e.location ? ` · ${e.location}` : ''}
                        </p>
                      )}
                      <span className="viewExperience">View experience ↗</span>
                    </Link>
                  ))}
                </>
              )}
            </aside>
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}