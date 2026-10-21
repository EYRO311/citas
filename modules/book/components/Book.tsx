'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventItem } from '@/types/events';
import type { LocalMemory, Memory } from '@/types/memories';
import { isEventReadyToDisplay } from '@/modules/events/domain/eventRules';
import { setEventRSVP } from '@/modules/events/data/eventsService';
import { isEventSecretUnlocked, lockSecretEvent, unlockSecretEvent } from '@/modules/events/data/secretsRepository';
import { useLetter } from '@/modules/hero/hooks/useLetter';
import { useIdeas } from '@/modules/ideas/hooks/useIdeas';
import { useMemories } from '@/modules/gallery/hooks/useMemories';
import { useMemoriesSettings } from '@/modules/gallery/hooks/useMemoriesSettings';
import { sortMemories } from '@/modules/gallery/domain/sortMemories';
import Lightbox from '@/modules/gallery/components/Lightbox';
import UploadMemoryModal, { UploadMemoryModalHandle } from '@/modules/gallery/components/UploadMemoryModal';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import {
  AddMemoryPage,
  ChapterOpener,
  CountdownPage,
  CoverBack,
  CoverFront,
  Endpaper,
  EmptyAgendaPage,
  EmptyGoalsPage,
  EventPage,
  FinalePage,
  GoalsPage,
  ideaImage,
  LetterPage,
  LockedEventPage,
  MEMORY_PHOTOS_PER_PAGE,
  MemoryPage,
  BlankPage,
  WritableNotesPage,
} from './BookPages';
import { memoryPhotosCoverFirst } from '../domain/bookHelpers';
import { useBookNotes } from '../hooks/useBookNotes';
import { Icon } from '@/shared/icons/Icon';
import './book.css';

type SectionId = 'letter' | 'memories' | 'agenda' | 'goals';

const SECTIONS: { id: SectionId; label: string; color: string }[] = [
  { id: 'letter', label: 'Carta', color: '#b9824f' },
  { id: 'memories', label: 'Recuerdos', color: '#5f9198' },
  { id: 'agenda', label: 'Agenda', color: '#7d6890' },
  { id: 'goals', label: 'Metas', color: '#a9614b' },
];

const IDEAS_PAGE_CAPACITY = 5;
const GOALS_DONE_KEY = 'propuesta_book_goals_done';
const SPREAD_QUERY = '(min-width: 820px)';

interface PageDef {
  id: string;
  node: React.ReactNode;
  cover?: boolean;
}

function readSpread(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia(SPREAD_QUERY).matches;
}

function PageShell({ side, number, children }: { side: 'left' | 'right'; number: number | null; children: React.ReactNode }) {
  return (
    <div className={`pg pg-${side}`}>
      <div className="pg-frame">
        <div className="pg-inner">{children}</div>
        {number !== null && <span className="pg-number">{number}</span>}
      </div>
    </div>
  );
}

export default function Book({
  events,
  refreshEvents,
}: {
  events: EventItem[];
  refreshEvents: () => void;
}) {
  const { letter } = useLetter();
  const { memories, refresh: refreshMemories } = useMemories();
  const { settings: memoriesSettings } = useMemoriesSettings();
  const { ideas } = useIdeas();
  const notes = useBookNotes();

  const [selected, setSelected] = useState<Memory | null>(null);
  const uploadRef = useRef<UploadMemoryModalHandle>(null);
  const [doneGoals, setDoneGoals] = useState<number[]>([]);
  const [spread, setSpread] = useState<boolean>(readSpread);
  const [flipped, setFlipped] = useState(0);
  const previousSpread = useRef(spread);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  /* ------------------------------ eventos ------------------------------ */
  const visibleEvents = events.filter((e) => isEventReadyToDisplay(e));
  const lastVisibleCount = useRef(visibleEvents.length);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentReadyCount = events.filter((e) => isEventReadyToDisplay(e)).length;
      if (currentReadyCount !== lastVisibleCount.current) {
        lastVisibleCount.current = currentReadyCount;
        triggerGlobalBurst(window.innerWidth / 2, window.innerHeight * 0.4, 55);
        refreshEvents();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [events, refreshEvents]);

  function handleAccept(eventId: number, point: { x: number; y: number }) {
    setEventRSVP(eventId, true);
    triggerGlobalBurst(point.x, point.y, 50);
    setTimeout(() => {
      triggerGlobalBurst(window.innerWidth * 0.3, window.innerHeight * 0.4, 30);
      triggerGlobalBurst(window.innerWidth * 0.7, window.innerHeight * 0.4, 30);
    }, 300);
    refreshEvents();
  }

  function handleUndo(eventId: number) {
    setEventRSVP(eventId, false);
    refreshEvents();
  }

  function handleUnlock(eventId: number, point?: { x: number; y: number }) {
    unlockSecretEvent(eventId);
    triggerGlobalBurst(point?.x ?? window.innerWidth / 2, point?.y ?? window.innerHeight / 2, 60);
    setTimeout(() => {
      triggerGlobalBurst(window.innerWidth * 0.35, window.innerHeight * 0.4, 35);
      triggerGlobalBurst(window.innerWidth * 0.65, window.innerHeight * 0.4, 35);
    }, 350);
    refreshEvents();
  }

  function handleRelock(eventId: number) {
    lockSecretEvent(eventId);
    refreshEvents();
  }

  /* -------------------------- metas marcadas --------------------------- */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GOALS_DONE_KEY) || '[]');
      if (Array.isArray(saved)) setDoneGoals(saved.filter((n) => typeof n === 'number'));
    } catch {
      // ignorar almacenamiento no disponible
    }
  }, []);

  function toggleGoal(id: number) {
    setDoneGoals((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(GOALS_DONE_KEY, JSON.stringify(next));
      } catch {
        // ignorar
      }
      return next;
    });
  }

  /* --------------------------- armado del libro ------------------------- */
  const pages: PageDef[] = [];
  const sectionStart: Partial<Record<SectionId, number>> = {};
  const push = (id: string, node: React.ReactNode, cover = false) => pages.push({ id, node, cover });
  // Las aperturas de capítulo siempre caen en página izquierda (índice impar).
  const padToLeft = () => {
    if (pages.length % 2 === 0) push(`pad-${pages.length}`, <BlankPage />);
  };

  const chronological = sortMemories(memories, memoriesSettings);

  const goNext = useCallback(() => setFlipped((v) => v + 1), []);
  const restart = useCallback(() => setFlipped(0), []);

  push('cover-front', <CoverFront onOpen={goNext} />, true);
  push('endpaper', <Endpaper />);

  sectionStart.letter = pages.length;
  push('letter', <LetterPage letter={letter} />);

  padToLeft();
  sectionStart.memories = pages.length;
  push(
    'memories-opener',
    <ChapterOpener
      numeral="II"
      title="Nuestros recuerdos"
      subtitle="Cada foto guarda una sonrisa, una aventura y un momento especial que atesoro a tu lado."
      color="#3bb0c1"
    />
  );
  // Todas las fotos de cada recuerdo: si no caben en una página, siguen en la(s) siguiente(s).
  chronological.forEach((memory, i) => {
    const photos = memoryPhotosCoverFirst(memory);
    const parts = Math.max(1, Math.ceil(photos.length / MEMORY_PHOTOS_PER_PAGE));
    for (let part = 0; part < parts; part++) {
      push(
        part === 0 ? `memory-${memory.id}` : `memory-${memory.id}-${part}`,
        <MemoryPage
          memory={memory}
          number={i + 1}
          part={part}
          photos={photos.slice(part * MEMORY_PHOTOS_PER_PAGE, (part + 1) * MEMORY_PHOTOS_PER_PAGE)}
          onOpen={setSelected}
        />
      );
    }
  });
  push('memories-add', <AddMemoryPage empty={chronological.length === 0} onAdd={() => uploadRef.current?.open()} />);

  padToLeft();
  sectionStart.agenda = pages.length;
  push(
    'agenda-opener',
    <ChapterOpener
      numeral="III"
      title="Agenda"
      subtitle="Elegí dos planes increíbles para nosotros. Elige tu favorito o mejor aún... ¡vayamos a los dos!"
      color="#8d5fa8"
    />
  );
  push('agenda-countdown', <CountdownPage events={events} />);
  if (visibleEvents.length === 0) {
    push('agenda-empty', <EmptyAgendaPage />);
  }
  visibleEvents.forEach((event) => {
    const isHidden = !!event.isHidden;
    const isUnlocked = isHidden ? isEventSecretUnlocked(event.id) : true;
    if (isHidden && !isUnlocked) {
      push(`event-${event.id}`, <LockedEventPage event={event} onUnlock={handleUnlock} />);
    } else {
      push(
        `event-${event.id}`,
        <EventPage event={event} isRevealedSecret={isHidden && isUnlocked} onAccept={handleAccept} onUndo={handleUndo} onRelock={handleRelock} />
      );
    }
  });

  padToLeft();
  sectionStart.goals = pages.length;
  push(
    'goals-opener',
    <ChapterOpener
      numeral="IV"
      title="Metas y planes juntos"
      subtitle="Ideas que quiero que hagamos juntos, inspiradas en cosas que vi por ahí y me recordaron a ti."
      color="#e4572e"
    />
  );
  if (ideas.length === 0) {
    push('goals-empty', <EmptyGoalsPage />);
  }
  // Un plan con imagen ocupa el doble de espacio que uno solo de texto.
  for (let i = 0; i < ideas.length; ) {
    let end = i;
    let used = 0;
    while (end < ideas.length) {
      const weight = ideaImage(ideas[end]) ? 2 : 1;
      if (end > i && used + weight > IDEAS_PAGE_CAPACITY) break;
      used += weight;
      end++;
    }
    push(
      `goals-${i}`,
      <GoalsPage ideas={ideas.slice(i, end)} startNumber={i + 1} done={doneGoals} onToggle={toggleGoal} />
    );
    i = end;
  }
  push(
    'notes-main',
    <WritableNotesPage text={notes.text} status={notes.status} maxLength={notes.maxLength} onChange={notes.update} />
  );
  push('finale', <FinalePage />);

  // La contraportada es la cara trasera de la última hoja: debe quedar en índice impar.
  if (pages.length % 2 === 0) push(`pad-${pages.length}`, <BlankPage />);
  push('cover-back', <CoverBack onRestart={restart} />, true);

  const total = pages.length;
  const sheetCount = spread ? total / 2 : total;
  const maxFlipped = spread ? sheetCount : sheetCount - 1;
  const current = Math.min(flipped, maxFlipped);

  /* ---------------------------- navegación ----------------------------- */
  const goPrev = useCallback(() => setFlipped((v) => Math.max(v - 1, 0)), []);

  const jumpToPage = useCallback(
    (pageIndex: number) => {
      setFlipped(spread ? Math.ceil(pageIndex / 2) : pageIndex);
    },
    [spread]
  );

  // Mantener un tope si el libro se acorta (p. ej. se borra un recuerdo).
  useEffect(() => {
    setFlipped((v) => Math.min(v, maxFlipped));
  }, [maxFlipped]);

  // Cambio entre vista de dos páginas (escritorio) y de una página (móvil).
  useEffect(() => {
    const mql = window.matchMedia(SPREAD_QUERY);
    const onChange = () => setSpread(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (previousSpread.current === spread) return;
    previousSpread.current = spread;
    setFlipped((v) => (spread ? Math.ceil(v / 2) : v * 2));
  }, [spread]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  /* -------------------------- pantalla completa ------------------------- */
  // Usa la API de pantalla completa del navegador; donde no existe (Safari de iPhone)
  // el libro se fija sobre toda la ventana con CSS.
  const viewRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setFullscreen(active === viewRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // Salir con Escape también en el modo de respaldo (el nativo ya lo hace solo)
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement && !document.querySelector('dialog[open]')) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  async function toggleFullscreen() {
    const el = viewRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
    const nativeActive = document.fullscreenElement ?? doc.webkitFullscreenElement;

    if (fullscreen) {
      if (nativeActive) await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      setFullscreen(false);
      return;
    }
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else throw new Error('sin API');
    } catch {
      setFullscreen(true);
    }
  }

  /* ------------------------- páginas visibles -------------------------- */
  const leftIndex = spread ? (current > 0 ? current * 2 - 1 : -1) : -1;
  const rightIndex = spread ? (current < sheetCount ? current * 2 : -1) : current;
  const focusIndex = spread ? current * 2 : current;
  const isVisible = (idx: number) => idx === leftIndex || idx === rightIndex;
  const state = !spread ? 'single' : current === 0 ? 'front' : current === sheetCount ? 'back' : 'open';

  const referenceIndex = rightIndex >= 0 ? rightIndex : leftIndex;
  const activeSection = SECTIONS.filter((s) => (sectionStart[s.id] ?? Infinity) <= referenceIndex).pop()?.id ?? null;
  // Con la contraportada a la vista ya se pasaron todas las secciones.
  const atBackCover = state === 'back' || (!spread && current === total - 1);
  const activeIdx = atBackCover ? SECTIONS.length : SECTIONS.findIndex((s) => s.id === activeSection);

  let indicator: string;
  if (spread && current === 0) indicator = 'Portada';
  else if (spread && current === sheetCount) indicator = 'Contraportada';
  else if (spread) indicator = `Páginas ${leftIndex + 1}–${rightIndex + 1} de ${total}`;
  else indicator = `Página ${current + 1} de ${total}`;

  function renderFace(idx: number, faceClass: string) {
    const page = pages[idx];
    if (!page) return null;
    const near = Math.abs(idx - focusIndex) <= 5;
    const side: 'left' | 'right' = spread && idx % 2 === 1 ? 'left' : 'right';
    const number = !page.cover && idx > 1 && idx < total - 1 ? idx + 1 : null;
    const coverSide = idx === 0 ? 'cover-face-front' : 'cover-face-back';

    return (
      <div
        className={`book-face ${faceClass} ${page.cover ? `cover-face ${coverSide}` : ''}`}
        inert={!isVisible(idx)}
        aria-hidden={!isVisible(idx)}
      >
        {page.cover ? (
          near && page.node
        ) : (
          <PageShell side={side} number={number}>
            {near && page.node}
          </PageShell>
        )}
      </div>
    );
  }

  const sheets: React.ReactNode[] = [];
  for (let i = 0; i < sheetCount; i++) {
    const frontIdx = spread ? i * 2 : i;
    const backIdx = spread ? i * 2 + 1 : -1;
    const isFlipped = i < current;
    sheets.push(
      <div
        key={pages[frontIdx].id}
        className={`book-sheet ${isFlipped ? 'is-flipped' : ''}`}
        style={{ zIndex: isFlipped ? i + 1 : sheetCount - i }}
      >
        {renderFace(frontIdx, 'book-face-front')}
        {backIdx >= 0 && renderFace(backIdx, 'book-face-back')}
      </div>
    );
  }

  return (
    <div ref={viewRef} className={`book-view ${spread ? 'is-spread' : 'is-single'} ${fullscreen ? 'is-fullscreen' : ''}`}>
      <h1 className="bk-sr-only">Nuestro libro de aventuras</h1>

      <div
        className="book-stage"
        data-state={state}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return;
          swipeStart.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
            if (dx < 0) goNext();
            else goPrev();
          }
        }}
      >
        <div className="book">
          <div className="book-edge book-edge-left" aria-hidden="true" />
          <div className="book-edge book-edge-right" aria-hidden="true" />
          <nav className="book-tabs" aria-label="Secciones del libro">
            {SECTIONS.map((section, i) => {
              const position = i < activeIdx ? 'past' : i === activeIdx ? 'current' : 'future';
              const slot = position === 'past' ? i : i - activeIdx - 1;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`book-tab is-${position}`}
                  aria-current={position === 'current' ? 'true' : undefined}
                  style={{ ['--tab-color' as string]: section.color, ['--slot' as string]: slot }}
                  onClick={() => jumpToPage(sectionStart[section.id] ?? 0)}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>
          {sheets}
          {state !== 'front' && (state === 'open' || state === 'back') && spread && (
            <button type="button" className="book-corner book-corner-prev" aria-label="Página anterior" onClick={goPrev} />
          )}
          {spread && state === 'open' && (
            <button type="button" className="book-corner book-corner-next" aria-label="Página siguiente" onClick={goNext} />
          )}
        </div>
      </div>

      <div className="book-controls">
        <button type="button" className="book-nav" onClick={goPrev} disabled={current === 0} aria-label="Página anterior">
          <Icon name="arrowRight" className="book-nav-arrow-left" />
        </button>
        <span className="book-indicator" aria-live="polite">
          {indicator}
        </span>
        <button type="button" className="book-nav" onClick={goNext} disabled={current >= maxFlipped} aria-label="Página siguiente">
          <Icon name="arrowRight" />
        </button>
        <button
          type="button"
          className="book-nav book-fullscreen-btn"
          onClick={toggleFullscreen}
          aria-pressed={fullscreen}
          aria-label={fullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
          title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          <Icon name={fullscreen ? 'fullscreenExit' : 'fullscreen'} />
        </button>
      </div>

      <Lightbox memory={selected} onClose={() => setSelected(null)} onDeleted={refreshMemories} onUpdated={refreshMemories} />
      <UploadMemoryModal
        ref={uploadRef}
        mode="book"
        onSaved={(savedMemory) => {
          refreshMemories();
          const memStart = sectionStart.memories;
          if (savedMemory && typeof memStart === 'number') {
            setTimeout(() => {
              // Navegar al final de la sección recuerdos donde quedó pegada la nueva foto
              const targetPage =
                typeof sectionStart.agenda === 'number' ? Math.max(0, sectionStart.agenda - 1) : memStart + 1;
              jumpToPage(targetPage);
            }, 300);
          }
        }}
      />
    </div>
  );
}
