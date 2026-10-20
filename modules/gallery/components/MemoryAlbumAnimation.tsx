'use client';

import { useEffect, useState, useRef } from 'react';
import type { LocalMemory, Memory } from '@/types/memories';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { Icon } from '@/shared/icons/Icon';
import './memoryAlbumAnimation.css';

const FALLBACK_IMG = '/img/fondo.jpg';

interface MemoryAlbumAnimationProps {
  memory: LocalMemory | Memory | null;
  isOpen: boolean;
  onComplete: () => void;
  mode?: 'album' | 'book';
}

export default function MemoryAlbumAnimation({
  memory,
  isOpen,
  onComplete,
  mode = 'album',
}: MemoryAlbumAnimationProps) {
  const [phase, setPhase] = useState<'enter' | 'taping' | 'sealed' | 'flying' | 'done'>('enter');
  const [exiting, setExiting] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  function clearAllTimeouts() {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }

  function handleSkip() {
    clearAllTimeouts();
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 250);
  }

  useEffect(() => {
    if (!isOpen || !memory) {
      setPhase('enter');
      setExiting(false);
      clearAllTimeouts();
      return;
    }

    setPhase('enter');
    setExiting(false);
    clearAllTimeouts();

    // 1. Taping phase (cintas adhesivas se adhieren)
    const t1 = setTimeout(() => {
      setPhase('taping');
    }, 450);

    // 2. Sealed phase (sello de cera cae con impacto y lluvia de destellos)
    const t2 = setTimeout(() => {
      setPhase('sealed');
      // Destellos luminosos alrededor de la tarjeta
      const midX = window.innerWidth / 2;
      const midY = window.innerHeight / 2;
      triggerGlobalBurst(midX, midY, 40);
    }, 1100);

    // 3. Flying phase (la foto vuela y se asienta en el álbum)
    const t3 = setTimeout(() => {
      setPhase('flying');
    }, 2000);

    // 4. Complete
    const t4 = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        onComplete();
      }, 400);
    }, 2750);

    timeoutsRef.current = [t1, t2, t3, t4];

    return () => {
      clearAllTimeouts();
    };
  }, [isOpen, memory, onComplete]);

  if (!isOpen || !memory) return null;

  const displayImg =
    ('imageBase64' in memory && memory.imageBase64) ||
    ('thumbUrl' in memory && memory.thumbUrl) ||
    memory.imageUrl ||
    (memory.images && memory.images.length > 0 ? memory.images[0] : null) ||
    FALLBACK_IMG;

  const bannerText =
    phase === 'enter'
      ? 'Añadiendo a nuestro álbum... 📖'
      : phase === 'taping'
      ? 'Pegando con cinta adhesiva y amor... 🎀'
      : phase === 'sealed'
      ? '¡Sellado en nuestro álbum de aventuras! ✨'
      : mode === 'book'
      ? 'Colocando en las páginas del libro... 💖'
      : 'Acomodando en el álbum... 💖';

  return (
    <div
      className={`album-anim-overlay ${exiting ? 'is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Animación de recuerdo pegándose al álbum"
      onClick={handleSkip}
    >
      <button
        type="button"
        className="album-anim-skip-btn"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        aria-label="Saltar animación"
      >
        ✕ Continuar
      </button>

      <div className="album-anim-banner" onClick={(e) => e.stopPropagation()}>
        <Icon name="sparkle" className="ui-icon-gold" />
        <span>{bannerText}</span>
      </div>

      <div className="album-anim-stage" onClick={(e) => e.stopPropagation()}>
        {/* Destellos ambientales */}
        <span className="album-anim-sparkle sparkle-1" aria-hidden="true">✨</span>
        <span className="album-anim-sparkle sparkle-2" aria-hidden="true">⭐</span>
        <span className="album-anim-sparkle sparkle-3" aria-hidden="true">💖</span>

        {/* Tarjeta Polaroid */}
        <div
          className={`album-anim-polaroid ${phase === 'taping' || phase === 'sealed' ? 'has-taped' : ''} ${
            phase === 'flying' ? 'is-flying-to-album' : ''
          }`}
        >
          {/* Cinta adhesiva izquierda */}
          <div
            className={`album-anim-tape album-anim-tape-left ${
              phase !== 'enter' ? 'tape-active' : ''
            }`}
            aria-hidden="true"
          />

          {/* Cinta adhesiva derecha */}
          <div
            className={`album-anim-tape album-anim-tape-right ${
              phase !== 'enter' ? 'tape-active' : ''
            }`}
            aria-hidden="true"
          />

          {/* Sello de cera en la esquina inferior */}
          <div
            className={`album-anim-seal ${
              phase === 'sealed' || phase === 'flying' ? 'seal-active' : ''
            }`}
            aria-hidden="true"
          >
            <div className="album-anim-seal-inner">
              <span className="album-anim-seal-monogram">A ♥ E</span>
              <span>ÁLBUM</span>
            </div>
          </div>

          {/* Marco de la fotografía */}
          <div className="album-anim-photo-box">
            <img
              src={displayImg}
              alt={memory.title || 'Foto del recuerdo'}
              draggable={false}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMG;
              }}
            />
            <div className="album-anim-photo-sheen" />
          </div>

          {/* Pie de foto estilo Polaroid */}
          <div className="album-anim-caption-box">
            <h4 className="album-anim-title">{memory.title || 'Recuerdo de nuestra salida'}</h4>
            <div className="album-anim-sub">
              {memory.date && (
                <span>
                  <Icon name="calendar" className="ui-icon-blue" /> {memory.date}
                </span>
              )}
              {memory.location && (
                <span>
                  • <Icon name="location" className="ui-icon-rose" /> {memory.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
