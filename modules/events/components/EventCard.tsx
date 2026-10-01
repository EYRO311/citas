'use client';

import { useState } from 'react';
import type { EventItem } from '@/types/events';
import { Icon } from '@/shared/icons/Icon';

const SHY_PHRASES = [
  '¿Segura?',
  '¡Habrá tu postre favorito!',
  '¡No te hagas del rogar jeje!',
  '¡Prometo hacerte reír mucho!',
  '¡Di que sí por favor!',
  '¡Ya casi le das al Sí!',
];

function formatDate(dateStr: string) {
  if (!dateStr) return 'Próximamente';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const formatted = d.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
  } catch {
    // ignore
  }
  return dateStr;
}

function generateGoogleCalendarLink(event: EventItem) {
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    `${event.description}\n\n👗 Código de vestimenta: ${event.dressCode}\n🤫 Detalle: ${event.secretHint || ''}`
  );
  const location = encodeURIComponent(event.location);

  const dateFormatted = event.date.replace(/-/g, '');
  const time = event.time || '19:30';
  const timeFormatted = time.replace(/:/g, '') + '00';
  const startIso = `${dateFormatted}T${timeFormatted}`;
  const endHour = String(parseInt(time.split(':')[0]) + 3).padStart(2, '0');
  const endIso = `${dateFormatted}T${endHour}${time.split(':')[1]}00`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
}

export default function EventCard({
  event,
  isRevealedSecret,
  onAccept,
  onUndo,
  onEdit,
  onRelock,
}: {
  event: EventItem;
  isRevealedSecret: boolean;
  onAccept: (eventId: number, point: { x: number; y: number }) => void;
  onUndo: (eventId: number) => void;
  onEdit: (eventId: number) => void;
  onRelock: (eventId: number) => void;
}) {
  const [shyIndex, setShyIndex] = useState(0);
  const [shyOffset, setShyOffset] = useState({ x: 0, y: 0 });
  const isAccepted = event.accepted;

  function handleShy() {
    setShyIndex((i) => i + 1);
    setShyOffset({ x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 40 });
  }

  return (
    <article
      className={`event-card glass-panel ${isRevealedSecret ? 'card-secret-revealed' : ''} ${
        isAccepted ? 'card-accepted' : ''
      }`}
      data-event-id={event.id}
    >
      <div className="card-top-seal">
        <span className={`badge-event ${isRevealedSecret ? 'badge-secret' : ''}`}>
          {isRevealedSecret ? (
            <>
              <Icon name="sparkle" className="ui-icon-gold" /> SORPRESA REVELADA
            </>
          ) : (
            event.badge || `CITA #${event.id}`
          )}
        </span>
        {isAccepted ? (
          <span className="status-badge-accepted">
            <Icon name="heart" className="ui-icon-rose" /> ¡ACEPTADA!
          </span>
        ) : (
          <span className="status-badge-pending">
            <Icon name="envelope" className="ui-icon-blue" /> Invitación Abierta
          </span>
        )}
      </div>

      {isRevealedSecret && (
        <div className="secret-revealed-banner">
          <span>
            <Icon name="sparkle" className="ui-icon-gold" /> ¡Sorpresa desbloqueada! Aquí tienes todos los detalles
            mágicos:
          </span>
        </div>
      )}

      <h3 className="event-title">{event.title}</h3>
      <p className="event-description">{event.description}</p>

      <div className="event-details-box">
        <div className="detail-row">
          <span className="detail-icon">
            <Icon name="calendar" className="ui-icon-blue" />
          </span>
          <div className="detail-info">
            <span className="detail-label">Fecha</span>
            <strong className="detail-value">{formatDate(event.date)}</strong>
          </div>
        </div>
        <div className="detail-row">
          <span className="detail-icon">
            <Icon name="clock" className="ui-icon-blue" />
          </span>
          <div className="detail-info">
            <span className="detail-label">Hora</span>
            <strong className="detail-value">{event.time || '19:30'} hrs</strong>
          </div>
        </div>
        <div className="detail-row">
          <span className="detail-icon">
            <Icon name="location" className="ui-icon-rose" />
          </span>
          <div className="detail-info">
            <span className="detail-label">Lugar</span>
            <strong className="detail-value">{event.location}</strong>
          </div>
        </div>
        <div className="detail-row">
          <span className="detail-icon">
            <Icon name="dress" className="ui-icon-amber" />
          </span>
          <div className="detail-info">
            <span className="detail-label">Código de vestimenta</span>
            <strong className="detail-value">{event.dressCode}</strong>
          </div>
        </div>
        {event.secretHint && (
          <div className="detail-row highlight-row">
            <span className="detail-icon">
              <Icon name="sparkle" className="ui-icon-gold" />
            </span>
            <div className="detail-info">
              <span className="detail-label">Detalle secreto</span>
              <span className="detail-value-italic">{event.secretHint}</span>
            </div>
          </div>
        )}
      </div>

      <div className="event-actions">
        {isAccepted ? (
          <>
            <div className="accepted-banner">
              <div className="accepted-icon">
                <Icon name="heart" className="ui-icon-rose ui-icon-lg" />
              </div>
              <div>
                <strong>¡Aceptaste salir conmigo!</strong>
                <p>Estoy preparando todo para que sea un día perfecto.</p>
              </div>
            </div>
            <div className="calendar-actions">
              <a
                href={generateGoogleCalendarLink(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-calendar"
              >
                <Icon name="calendar" className="ui-icon-blue" /> Añadir a Google Calendar
              </a>
              <button type="button" className="btn-ghost-sm btn-undo-rsvp" onClick={() => onUndo(event.id)}>
                <Icon name="undo" className="ui-icon-blue" /> Cambiar respuesta
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rsvp-prompt">
              <span>¿Aceptas esta invitación especial?</span>
            </div>
            <div className="buttons-group">
              <button
                type="button"
                className="btn-accept btn-primary"
                onClick={(e) => onAccept(event.id, { x: e.clientX, y: e.clientY })}
              >
                <span className="btn-heart-icon">
                  <Icon name="heart" className="ui-icon-white" />
                </span>
                <span>¡Sí, acepto con todo mi amor!</span>
              </button>
              <button
                type="button"
                className="btn-shy btn-secondary"
                onMouseEnter={handleShy}
                onClick={handleShy}
                style={{ transform: `translate(${shyOffset.x}px, ${shyOffset.y}px) scale(${shyIndex ? 0.95 : 1})` }}
              >
                <span>{shyIndex === 0 ? 'Mmm... tal vez' : SHY_PHRASES[shyIndex % SHY_PHRASES.length]}</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card-footer-edit">
        {isRevealedSecret ? (
          <button type="button" className="btn-link-edit btn-relock-secret" onClick={() => onRelock(event.id)}>
            <Icon name="lock" className="ui-icon-amber" /> Volver a ocultar secreto
          </button>
        ) : (
          <button type="button" className="btn-link-edit" onClick={() => onEdit(event.id)}>
            <Icon name="edit" className="ui-icon-blue" /> Editar detalles de esta cita
          </button>
        )}
      </div>
    </article>
  );
}
