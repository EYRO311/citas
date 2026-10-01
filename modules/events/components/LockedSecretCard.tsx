'use client';

import { useState } from 'react';
import type { EventItem } from '@/types/events';
import { Icon } from '@/shared/icons/Icon';

export default function LockedSecretCard({
  event,
  onUnlock,
}: {
  event: EventItem;
  onUnlock: (eventId: number, point?: { x: number; y: number }) => void;
}) {
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const hasSecretCode = Boolean(event.secretCode && event.secretCode.trim().length > 0);

  function attemptUnlock(e: React.MouseEvent | React.KeyboardEvent) {
    const code = (event.secretCode || '').trim().toLowerCase();
    const normalizedGuess = guess.trim().toLowerCase();

    if (normalizedGuess === code || code === '') {
      onUnlock(event.id, { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
      return;
    }

    setError('Mmm... esa no es la palabra mágica. ¡Pídele una pista a Eyro! 😉🌻');
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <article className="event-card glass-panel event-card-secret locked" data-event-id={event.id}>
      <div className="card-top-seal">
        <span className="badge-event badge-secret">
          <Icon name="lock" className="ui-icon-amber" /> CITA SECRETA &amp; SORPRESA
        </span>
        <span className="status-badge-pending">
          <Icon name="sparkle" className="ui-icon-gold" /> Por Descubrir
        </span>
      </div>

      <div className="secret-card-inner">
        <div className="secret-lock-glow-icon">
          <span className="lock-emoji">
            <Icon name="lock" className="ui-icon-amber ui-icon-xl" />
          </span>
          <span className="sparkle-emoji">
            <Icon name="sparkle" className="ui-icon-gold ui-icon-lg" />
          </span>
        </div>

        <h3 className="event-title secret-card-title">Una Cita Secreta Te Espera...</h3>
        <p className="event-description secret-card-desc">
          Eyro ha preparado una sorpresa secreta para ti. Para descubrir el lugar, la hora y todos los detalles
          románticos, revela esta tarjeta.
        </p>

        {event.secretClue && (
          <div className="secret-clue-box">
            <span className="clue-icon">
              <Icon name="key" className="ui-icon-gold" />
            </span>
            <div className="clue-content">
              <span className="clue-label">Pista de Eyro para Adi:</span>
              <p className="clue-text">&quot;{event.secretClue}&quot;</p>
            </div>
          </div>
        )}

        <div className="secret-unlock-block">
          {hasSecretCode ? (
            <div className="unlock-form-wrap">
              <label className="unlock-input-label" htmlFor={`secret-input-${event.id}`}>
                Ingresa la palabra mágica para revelar la sorpresa:
              </label>
              <div className="unlock-input-row">
                <input
                  type="text"
                  id={`secret-input-${event.id}`}
                  className={`form-input secret-guess-input ${shake ? 'input-shake' : ''}`}
                  placeholder="Escribe la palabra mágica aquí..."
                  autoComplete="off"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      attemptUnlock(e);
                    }
                  }}
                />
                <button type="button" className="btn-primary btn-unlock-secret" onClick={attemptUnlock}>
                  <span>
                    <Icon name="key" className="ui-icon-white" /> Descubrir
                  </span>
                </button>
              </div>
              {error && <p className="secret-feedback-error">{error}</p>}
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <p className="unlock-direct-prompt">Toca el botón para abrir el sobre y descubrir la sorpresa:</p>
              <button type="button" className="btn-primary btn-unlock-direct" style={{ width: '100%' }} onClick={attemptUnlock}>
                <span>
                  <Icon name="unlock" className="ui-icon-white" /> ¡Abrir y Revelar Sorpresa!
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="secret-card-footer">
        <span>
          <Icon name="heart" className="ui-icon-rose" /> Preparada con amor por Eyro
        </span>
      </div>
    </article>
  );
}
