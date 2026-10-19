'use client';

import { useEffect, useState } from 'react';
import type { LetterContent } from '@/types/letter';
import type { EventItem } from '@/types/events';
import type { IdeaItem } from '@/types/ideas';
import type { Memory } from '@/types/memories';
import { Icon } from '@/shared/icons/Icon';
import { formatDate, generateGoogleCalendarLink } from '@/modules/events/components/EventCard';
import { Balloon, BalloonBunch, BALLOON_COLORS, HeartMark, Sunflower, Tape } from './BookDecor';
import { calculateNextDate } from '@/modules/events/components/CountdownTimer';
import { isImageUrl, isSafeUrl, linkLabel } from '@/modules/ideas/domain/links';
import { downloadLetterHtml, downloadLetterImage } from '@/modules/hero/domain/downloadLetter';
import { formatShortDate, getDateParts } from '../domain/bookHelpers';
import type { NotesStatus } from '../hooks/useBookNotes';

const FALLBACK_IMG = '/img/fondo.jpg';
const LETTER_COLORS = ['#e9953b', '#8d5fa8', '#3bb0c1', '#e4572e', '#f2c14e', '#6aa84f'];

/* ------------------------------------------------------------------ */
/* Piezas compartidas                                                  */
/* ------------------------------------------------------------------ */

function ColorWord({ text, offset = 0, className = '' }: { text: string; offset?: number; className?: string }) {
  return (
    <span className={`bk-colorword ${className}`} aria-hidden="true">
      {Array.from(text).map((ch, i) =>
        ch === ' ' ? (
          <span key={i} className="bk-colorword-gap" />
        ) : (
          <span key={i} className="bk-colorword-letter" style={{ color: LETTER_COLORS[(i + offset) % LETTER_COLORS.length] }}>
            {ch}
          </span>
        )
      )}
    </span>
  );
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

/* ------------------------------------------------------------------ */
/* Portadas (estilo "My Adventure Book" de Up)                         */
/* ------------------------------------------------------------------ */

function CoverEmblem() {
  return (
    <svg className="cv-emblem" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="29" fill="#5b3217" stroke="#d9732a" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="23.5" fill="none" stroke="#e9953b" strokeWidth="1" strokeDasharray="2.2 2.2" />
      <path d="M12 21 L52 21 L52 29 L12 29 Z" fill="#f6efdc" transform="rotate(-8 32 25)" />
      <path
        d="M32 52.5l-1.2-1.1C25.4 46.6 22 43.5 22 39.7c0-2.4 1.9-4.2 4.2-4.2 1.4 0 2.8.7 3.8 1.8 1-1.1 2.4-1.8 3.8-1.8 2.3 0 4.2 1.8 4.2 4.2 0 3.8-3.4 6.9-8.8 11.7L32 52.5z"
        fill="#f6efdc"
      />
    </svg>
  );
}

function CoverFrame() {
  return (
    <svg className="cv-frame" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="12" y="12" width="276" height="376" rx="16" fill="none" stroke="#d9532a" strokeWidth="3.2" />
      <rect x="22" y="22" width="256" height="356" rx="9" fill="none" stroke="#e9953b" strokeWidth="1.6" />
      <ellipse cx="150" cy="170" rx="126" ry="112" fill="none" stroke="#d9532a" strokeWidth="2.6" />
      <ellipse cx="150" cy="170" rx="118" ry="104" fill="none" stroke="#e9953b" strokeWidth="1.2" />
    </svg>
  );
}

export function CoverFront({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="cv cv-front">
      <div className="cv-spine" aria-hidden="true">
        <svg viewBox="0 0 40 100" preserveAspectRatio="none" className="cv-cord">
          <circle cx="20" cy="14" r="3.2" fill="#2a1408" />
          <circle cx="20" cy="50" r="3.2" fill="#2a1408" />
          <circle cx="20" cy="86" r="3.2" fill="#2a1408" />
          <path d="M20 14 C 32 24, 8 34, 20 50 C 32 66, 8 76, 20 86" stroke="#120804" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M20 50 C 8 44, 4 54, 12 58 M20 50 C 32 44, 36 54, 28 58" stroke="#120804" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="20" cy="50" r="3.6" fill="#120804" />
        </svg>
      </div>
      <div className="cv-art">
        <CoverFrame />
        <h2 className="cv-title" aria-label="Nuestro libro de aventuras">
          <ColorWord text="NUESTRO" offset={0} className="cv-word-sm" />
          <ColorWord text="LIBRO DE" offset={2} className="cv-word-md" />
          <ColorWord text="AVENTURAS" offset={4} className="cv-word-lg" />
        </h2>
        <CoverEmblem />
        <p className="cv-hint">Toca para abrir</p>
      </div>
      <button type="button" className="cv-open-hit" aria-label="Abrir el libro" onClick={onOpen} />
    </div>
  );
}

export function CoverBack({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="cv cv-back">
      <div className="cv-art cv-art-back">
        <CoverFrame />
        <div className="cv-back-center">
          <BalloonBunch />
          <h2 className="cv-title cv-title-back" aria-label="Continuará">
            <ColorWord text="CONTINUARÁ" offset={1} className="cv-word-lg" />
          </h2>
          <p className="cv-back-note">…porque nuestra mejor aventura apenas empieza.</p>
          <button type="button" className="cv-restart" onClick={onRestart}>
            Volver al principio
          </button>
        </div>
        <CoverEmblem />
      </div>
    </div>
  );
}

export function Endpaper() {
  return (
    <div className="bp bp-endpaper">
      <Tape className="tape-tl" />
      <Tape className="tape-tr" />
      <p className="ep-small">Este libro pertenece a</p>
      <h2 className="ep-name">
        <ColorWord text="Adi" offset={1} />
      </h2>
      <div className="ep-divider" aria-hidden="true">
        <span />
        <HeartMark />
        <span />
      </div>
      <p className="ep-note">y a su compañero de aventuras, Eyro</p>
      <BalloonBunch className="ep-balloons" />
      <p className="ep-quote">«¡La aventura está allá afuera!»</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carta                                                               */
/* ------------------------------------------------------------------ */

export function LetterPage({ letter }: { letter: LetterContent }) {
  const isPoem = letter.mode === 'poem';
  const blocks = splitParagraphs(letter.body);

  return (
    <div className="bp bp-letter">
      <Tape className="tape-tl" />
      <span className="bp-tag">{isPoem ? 'Versos del corazón' : 'Una carta para ti'}</span>
      <h2 className={`lt-greeting ${isPoem ? 'is-poem' : ''}`}>{letter.greeting}</h2>
      <div className="lt-ornament" aria-hidden="true">
        <span />
        <Sunflower />
        <span />
      </div>

      {isPoem ? (
        <div className="lt-poem">
          {blocks.map((stanza, sIdx) => (
            <div key={sIdx} className="lt-stanza">
              {stanza
                .split('\n')
                .filter((v) => v.trim().length > 0)
                .map((verse, vIdx) => (
                  <p key={vIdx}>{verse.trim()}</p>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="lt-body">
          {blocks.map((paragraph, index) => (
            <p key={index} className={index === 0 ? 'lt-lead' : undefined}>
              {paragraph}
            </p>
          ))}
        </div>
      )}

      <p className="lt-question">{letter.question}</p>
      <p className="lt-ps">
        <strong>{letter.psLabel}</strong> {letter.psText}
      </p>
      <p className="lt-sign">
        <span>{letter.signIntro}</span>
        <em>{letter.signName}</em>
      </p>
      <div className="lt-download">
        <Icon name="download" />
        <span>Descargar carta:</span>
        <button type="button" className="bk-link" onClick={() => downloadLetterImage(letter)}>
          PNG
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className="bk-link" onClick={() => downloadLetterHtml(letter)}>
          HTML
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aperturas de capítulo                                               */
/* ------------------------------------------------------------------ */

export function ChapterOpener({
  numeral,
  title,
  subtitle,
  color,
  children,
}: {
  numeral: string;
  title: string;
  subtitle: string;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bp bp-chapter" style={{ ['--chapter-color' as string]: color }}>
      <Tape className="tape-tr" />
      <span className="ch-numeral">{numeral}</span>
      <h2 className="ch-title">{title}</h2>
      <div className="ch-rule" aria-hidden="true">
        <span />
        <HeartMark />
        <span />
      </div>
      <p className="ch-sub">{subtitle}</p>
      {children}
      <BalloonBunch className="ch-balloons" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recuerdos                                                           */
/* ------------------------------------------------------------------ */

/** Fotos por página de recuerdo: un recuerdo con más fotos sigue en páginas de continuación. */
export const MEMORY_PHOTOS_PER_PAGE = 3;

export function MemoryPage({
  memory,
  number,
  photos,
  part = 0,
  onOpen,
}: {
  memory: Memory;
  number: number;
  /** Fotos que van en esta página (portada primero en la primera página). */
  photos: string[];
  /** 0 = primera página del recuerdo; >0 = continuación. */
  part?: number;
  onOpen: (memory: Memory) => void;
}) {
  const shown = photos.length > 0 ? photos : [FALLBACK_IMG];
  const tilt = (number + part) % 2 === 0 ? 1 : -1;
  const isContinuation = part > 0;

  return (
    <div className={`bp bp-memory ${isContinuation ? 'is-continuation' : ''}`}>
      <span className="bp-tag">{isContinuation ? `Recuerdo #${number} · continúa` : `Recuerdo #${number}`}</span>
      <h3 className="mem-title">{memory.title || 'Recuerdo de nuestra salida'}</h3>

      <div className={`mem-photos mem-photos-${shown.length}`} style={{ ['--tilt' as string]: tilt }}>
        {shown.map((src, i) => (
          <button
            key={`${src.slice(-24)}-${i}`}
            type="button"
            className={`polaroid-p polaroid-p-${i + 1}`}
            aria-label={`Abrir recuerdo: ${memory.title}`}
            onClick={() => onOpen(memory)}
          >
            <Tape className={i % 2 === 0 ? 'tape-top-left' : 'tape-top-right'} />
            <img
              src={src}
              alt={i === 0 ? memory.title : ''}
              loading="lazy"
              draggable={false}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMG;
              }}
            />
          </button>
        ))}
      </div>

      {!isContinuation && (
        <>
          <div className="mem-meta">
        {memory.date && (
          <span className="mem-ticket">
            <Icon name="calendar" /> {formatShortDate(memory.date)}
          </span>
        )}
        {memory.location && (
          <span className="mem-ticket mem-ticket-loc">
            <Icon name="location" /> {memory.location}
          </span>
        )}
      </div>
          {memory.caption && <p className="mem-caption">{memory.caption}</p>}
        </>
      )}
    </div>
  );
}

export function AddMemoryPage({ onAdd, empty }: { onAdd: () => void; empty: boolean }) {
  return (
    <div className="bp bp-add">
      <span className="add-rule" aria-hidden="true" />
      <h3>{empty ? 'Aquí empezará nuestro álbum' : 'Un espacio para lo que viene'}</h3>
      <p>{empty ? 'Aún no hay fotos pegadas en el libro.' : 'Cada nueva salida merece su propia página.'}</p>
      <button type="button" className="bk-btn bk-btn-ghost" onClick={onAdd}>
        <Icon name="plus" /> Añadir recuerdo
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agenda                                                              */
/* ------------------------------------------------------------------ */

const SHY_PHRASES = ['¿Segura?', '¡Habrá tu postre favorito!', '¡No te hagas del rogar jeje!', '¡Prometo hacerte reír mucho!', '¡Di que sí por favor!', '¡Ya casi le das al Sí!'];

export function EventPage({
  event,
  isRevealedSecret,
  onAccept,
  onUndo,
  onRelock,
}: {
  event: EventItem;
  isRevealedSecret: boolean;
  onAccept: (eventId: number, point: { x: number; y: number }) => void;
  onUndo: (eventId: number) => void;
  onRelock: (eventId: number) => void;
}) {
  const [shyIndex, setShyIndex] = useState(0);
  const [shyOffset, setShyOffset] = useState({ x: 0, y: 0 });
  const parts = getDateParts(event.date);

  function handleShy() {
    setShyIndex((i) => i + 1);
    setShyOffset({ x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 30 });
  }

  return (
    <div className={`bp bp-agenda ${event.accepted ? 'is-accepted' : ''}`}>
      <span className="bp-tag">{isRevealedSecret ? 'Sorpresa revelada' : event.badge || `Cita #${event.id}`}</span>

      <div className="ag-head">
        <div className="ag-date" aria-label={formatDate(event.date)}>
          {parts ? (
            <>
              <span className="ag-date-month">{parts.month}</span>
              <span className="ag-date-day">{parts.day}</span>
              <span className="ag-date-week">{parts.weekday}</span>
            </>
          ) : (
            <span className="ag-date-day ag-date-soon">?</span>
          )}
        </div>
        <h3 className="ag-title">{event.title}</h3>
      </div>

      <p className="ag-desc">{event.description}</p>

      <ul className="ag-lines">
        <li>
          <Icon name="clock" />
          <span className="ag-label">Hora</span>
          <strong>{event.time || '19:30'} hrs</strong>
        </li>
        <li>
          <Icon name="location" />
          <span className="ag-label">Lugar</span>
          <strong>{event.location}</strong>
        </li>
        <li>
          <Icon name="dress" />
          <span className="ag-label">Vestimenta</span>
          <strong>{event.dressCode}</strong>
        </li>
        {event.secretHint && (
          <li className="ag-secret">
            <Icon name="sparkle" />
            <span className="ag-label">Detalle secreto</span>
            <strong>{event.secretHint}</strong>
          </li>
        )}
      </ul>

      <div className="ag-actions">
        {event.accepted ? (
          <>
            <div className="ag-stamp" aria-label="Cita aceptada">
              ¡Aceptada!
            </div>
            <p className="ag-accepted-note">¡Aceptaste salir conmigo! Estoy preparando todo para que sea un día perfecto.</p>
            <div className="ag-buttons">
              <a href={generateGoogleCalendarLink(event)} target="_blank" rel="noopener noreferrer" className="bk-btn bk-btn-ghost">
                <Icon name="calendar" /> Añadir a Calendar
              </a>
              <button type="button" className="bk-btn bk-btn-ghost" onClick={() => onUndo(event.id)}>
                <Icon name="undo" /> Cambiar respuesta
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="ag-ask">¿Aceptas esta invitación especial?</p>
            <div className="ag-buttons">
              <button type="button" className="bk-btn" onClick={(e) => onAccept(event.id, { x: e.clientX, y: e.clientY })}>
                <Icon name="heart" /> ¡Sí, acepto con todo mi amor!
              </button>
              <button
                type="button"
                className="bk-btn bk-btn-ghost"
                onMouseEnter={handleShy}
                onClick={handleShy}
                style={{ transform: `translate(${shyOffset.x}px, ${shyOffset.y}px)` }}
              >
                {shyIndex === 0 ? 'Mmm... tal vez' : SHY_PHRASES[shyIndex % SHY_PHRASES.length]}
              </button>
            </div>
          </>
        )}
        {isRevealedSecret && (
          <button type="button" className="bk-link" onClick={() => onRelock(event.id)}>
            <Icon name="lock" /> Volver a ocultar secreto
          </button>
        )}
      </div>
    </div>
  );
}

export function LockedEventPage({ event, onUnlock }: { event: EventItem; onUnlock: (eventId: number, point?: { x: number; y: number }) => void }) {
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const hasSecretCode = Boolean(event.secretCode && event.secretCode.trim().length > 0);

  function attempt(point?: { x: number; y: number }) {
    const code = (event.secretCode || '').trim().toLowerCase();
    if (guess.trim().toLowerCase() === code || code === '') {
      onUnlock(event.id, point);
      return;
    }
    setError('Mmm... esa no es la palabra mágica. ¡Pídele una pista a Eyro!');
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <div className="bp bp-agenda bp-locked">
      <span className="bp-tag">Cita secreta</span>
      <div className="lk-seal" aria-hidden="true">
        <Icon name="lock" />
      </div>
      <h3 className="lk-title">Una cita secreta te espera…</h3>
      <p className="ag-desc">Eyro preparó una sorpresa. Para descubrir el lugar, la hora y todos los detalles, abre esta página.</p>

      {event.secretClue && (
        <div className="lk-clue">
          <Icon name="key" />
          <div>
            <span className="ag-label">Pista de Eyro para Adi</span>
            <p>“{event.secretClue}”</p>
          </div>
        </div>
      )}

      <div className="lk-unlock">
        {hasSecretCode ? (
          <>
            <label htmlFor={`bk-secret-${event.id}`} className="ag-label">
              Escribe la palabra mágica:
            </label>
            <div className="lk-row">
              <input
                id={`bk-secret-${event.id}`}
                className={`lk-input ${shake ? 'input-shake' : ''}`}
                type="text"
                autoComplete="off"
                placeholder="palabra mágica…"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    attempt();
                  }
                }}
              />
              <button type="button" className="bk-btn" onClick={(e) => attempt({ x: e.clientX, y: e.clientY })}>
                <Icon name="key" /> Descubrir
              </button>
            </div>
            {error && <p className="lk-error">{error}</p>}
          </>
        ) : (
          <button type="button" className="bk-btn" onClick={(e) => attempt({ x: e.clientX, y: e.clientY })}>
            <Icon name="unlock" /> ¡Abrir y revelar sorpresa!
          </button>
        )}
      </div>
    </div>
  );
}

const COUNTDOWN_QUOTES = [
  'Contando cada segundo para volver a verte sonreír',
  'El tiempo se hace eterno cuando no estás, y vuela cuando estamos juntos',
  'Cada segundo que pasa es un segundo más cerca de nuestro momento',
];

// Misma cuenta regresiva que la vista normal, hacia la próxima cita visible.
export function CountdownPage({ events }: { events: EventItem[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { targetDate, title } = calculateNextDate(events);
  const diff = now === null ? 0 : Math.max(0, targetDate - now);
  const units = [
    { label: 'días', value: Math.floor(diff / 86400000) },
    { label: 'horas', value: Math.floor((diff / 3600000) % 24) },
    { label: 'min', value: Math.floor((diff / 60000) % 60) },
    { label: 'seg', value: Math.floor((diff / 1000) % 60) },
  ];
  const quote = COUNTDOWN_QUOTES[new Date(targetDate).getDate() % COUNTDOWN_QUOTES.length];

  return (
    <div className="bp bp-countdown">
      <Tape className="tape-tr" />
      <span className="bp-tag">Cuenta regresiva</span>
      <h3 className="cd-title">Falta poquito para…</h3>
      <p className="cd-event">{title}</p>
      <div className="cd-grid" aria-live="off">
        {units.map((u) => (
          <div key={u.label} className="cd-cell">
            <span className="cd-value">{now === null ? '–' : String(u.value).padStart(2, '0')}</span>
            <span className="cd-label">{u.label}</span>
          </div>
        ))}
      </div>
      <p className="cd-quote">«{quote}»</p>
      <Sunflower className="cd-flower" />
    </div>
  );
}

export function EmptyAgendaPage() {
  return (
    <div className="bp bp-empty">
      <Sunflower />
      <h3>No hay citas programadas por ahora</h3>
      <p>Pronto habrá nuevas sorpresas y momentos mágicos preparados para ti.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Metas / planes juntos                                               */
/* ------------------------------------------------------------------ */

/** Imagen que se muestra para un plan: la suya, o el link si apunta directo a una imagen. */
export function ideaImage(idea: IdeaItem): string {
  if (isSafeUrl(idea.image)) return idea.image as string;
  return isImageUrl(idea.link) ? idea.link : '';
}

export function GoalsPage({
  ideas,
  startNumber,
  done,
  onToggle,
}: {
  ideas: IdeaItem[];
  startNumber: number;
  done: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="bp bp-goals">
      <span className="bp-tag">Cosas que vamos a hacer</span>
      <ul className="gl-list">
        {ideas.map((idea, i) => {
          const isDone = done.includes(idea.id);
          const image = ideaImage(idea);
          const showLink = isSafeUrl(idea.link) && idea.link !== image;
          return (
            <li key={idea.id} className={isDone ? 'is-done' : ''}>
              <button
                type="button"
                className="gl-box"
                role="checkbox"
                aria-checked={isDone}
                aria-label={`Marcar como hecho: ${idea.title}`}
                onClick={() => onToggle(idea.id)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 13l5 5L20 5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="gl-text">
                <span className="gl-num">{startNumber + i}.</span>
                <span className="gl-title">{idea.title}</span>
                {showLink && (
                  <a className="gl-link" href={idea.link} target="_blank" rel="noopener noreferrer">
                    <Icon name="arrowRight" /> {linkLabel(idea.link)}
                  </a>
                )}
              </div>
              {image && (
                <span className="gl-photo">
                  <Tape className="tape-top-left" />
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onError={(e) => {
                      if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.display = 'none';
                    }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function EmptyGoalsPage() {
  return (
    <div className="bp bp-empty">
      <BalloonBunch />
      <h3>Aún no hay planes en la lista</h3>
      <p>Pronto iré añadiendo ideas de cosas que quiero que hagamos juntos.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Final y relleno                                                     */
/* ------------------------------------------------------------------ */

export function FinalePage() {
  return (
    <div className="bp bp-finale">
      <Tape className="tape-tl" />
      <Tape className="tape-tr" />
      <Sunflower className="fin-flower" />
      <h2 className="fin-title">Gracias por estar en mi vida, Adi</h2>
      <p className="fin-text">
        Así como las flores buscan la luz del sol para florecer, cada día a tu lado se llena de alegría y calma. No importa a
        dónde vayamos, el mejor destino siempre será estar contigo.
      </p>
      <div className="fin-balloons" aria-hidden="true">
        {BALLOON_COLORS.map((c, i) => (
          <Balloon key={c} color={c} style={{ ['--i' as string]: i }} />
        ))}
      </div>
    </div>
  );
}

const NOTES_STATUS_LABEL: Record<NotesStatus, string> = {
  loading: 'Cargando…',
  idle: '',
  saving: 'Guardando…',
  saved: 'Guardado',
  local: 'Guardado solo en este dispositivo',
};

// Página principal de notas: la única del libro donde se puede escribir.
export function WritableNotesPage({
  text,
  status,
  maxLength,
  onChange,
}: {
  text: string;
  status: NotesStatus;
  maxLength: number;
  onChange: (text: string) => void;
}) {
  return (
    <div className="bp bp-notes bp-notes-main">
      <span className="bp-tag">Notas</span>
      <label htmlFor="bk-notes" className="bk-sr-only">
        Escribe tus notas
      </label>
      <textarea
        id="bk-notes"
        className="nt-input"
        value={text}
        maxLength={maxLength}
        placeholder="Escribe aquí lo que quieras…"
        disabled={status === 'loading'}
        onChange={(e) => onChange(e.target.value)}
        // Que seleccionar texto arrastrando no pase la página
        onPointerDown={(e) => e.stopPropagation()}
      />
      <span className="nt-status" aria-live="polite">
        {NOTES_STATUS_LABEL[status]}
      </span>
    </div>
  );
}

// Página de relleno (papel en blanco) para que cada capítulo empiece en página
// izquierda y la contraportada quede en su lugar.
export function BlankPage() {
  return <div className="bp bp-blank" aria-hidden="true" />;
}
