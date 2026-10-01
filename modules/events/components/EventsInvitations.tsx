'use client';

import { useEffect, useRef, useState } from 'react';
import type { EventItem } from '@/types/events';
import { isEventReadyToDisplay } from '../domain/eventRules';
import { updateEvent, updateEventRSVP } from '../data/eventsRepository';
import { isEventSecretUnlocked, lockSecretEvent, unlockSecretEvent } from '../data/secretsRepository';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { Icon } from '@/shared/icons/Icon';
import EventCard from './EventCard';
import LockedSecretCard from './LockedSecretCard';

export default function EventsInvitations({ events, refresh }: { events: EventItem[]; refresh: () => void }) {
  const visibleEvents = events.filter((e) => isEventReadyToDisplay(e));
  const lastVisibleCount = useRef(visibleEvents.length);

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentReadyCount = events.filter((e) => isEventReadyToDisplay(e)).length;
      if (currentReadyCount !== lastVisibleCount.current) {
        lastVisibleCount.current = currentReadyCount;
        triggerGlobalBurst(window.innerWidth / 2, window.innerHeight * 0.4, 55);
        refresh();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [events, refresh]);

  function handleAccept(eventId: number, point: { x: number; y: number }) {
    updateEventRSVP(eventId, true);
    triggerGlobalBurst(point.x, point.y, 50);
    setTimeout(() => {
      triggerGlobalBurst(window.innerWidth * 0.3, window.innerHeight * 0.4, 30);
      triggerGlobalBurst(window.innerWidth * 0.7, window.innerHeight * 0.4, 30);
    }, 300);
    refresh();
  }

  function handleUndo(eventId: number) {
    updateEventRSVP(eventId, false);
    refresh();
  }

  function handleUnlock(eventId: number, point?: { x: number; y: number }) {
    unlockSecretEvent(eventId);
    const x = point?.x ?? window.innerWidth / 2;
    const y = point?.y ?? window.innerHeight / 2;
    triggerGlobalBurst(x, y, 60);
    setTimeout(() => {
      triggerGlobalBurst(window.innerWidth * 0.35, window.innerHeight * 0.4, 35);
      triggerGlobalBurst(window.innerWidth * 0.65, window.innerHeight * 0.4, 35);
    }, 350);
    refresh();
  }

  function handleRelock(eventId: number) {
    lockSecretEvent(eventId);
    refresh();
  }

  function openEdit(eventId: number) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    setEditingEvent(event);
    dialogRef.current?.showModal();
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingEvent) return;
    const form = e.currentTarget;
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement)?.value.trim() || '';

    updateEvent(editingEvent.id, {
      title: get('title'),
      date: get('date'),
      time: get('time'),
      location: get('location'),
      dressCode: get('dressCode'),
      description: get('description'),
      secretHint: get('secretHint'),
    });
    refresh();
    dialogRef.current?.close();
    setEditingEvent(null);
  }

  if (visibleEvents.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 'var(--radius-lg)' }}>
        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 10 }}>
          <Icon name="flower" className="ui-icon-gold ui-icon-xl" />
        </span>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#1e3a8a', marginBottom: 8 }}>
          No hay citas programadas por el momento
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Pronto habrá nuevas sorpresas y momentos mágicos preparados para ti.
        </p>
      </div>
    );
  }

  return (
    <div id="events-container">
      <div className="events-grid">
        {visibleEvents.map((event) => {
          const isHidden = !!event.isHidden;
          const isUnlocked = isHidden ? isEventSecretUnlocked(event.id) : true;

          if (isHidden && !isUnlocked) {
            return <LockedSecretCard key={event.id} event={event} onUnlock={handleUnlock} />;
          }

          return (
            <EventCard
              key={event.id}
              event={event}
              isRevealedSecret={isHidden && isUnlocked}
              onAccept={handleAccept}
              onUndo={handleUndo}
              onEdit={openEdit}
              onRelock={handleRelock}
            />
          );
        })}
      </div>

      <dialog ref={dialogRef} id="modal-edit-event" onClose={() => setEditingEvent(null)}>
        <div className="modal-card">
          <button type="button" className="modal-close-btn" aria-label="Cerrar" onClick={() => dialogRef.current?.close()}>
            &times;
          </button>
          <div className="modal-header-styled">
            <h3 className="modal-title-styled">
              Personalizar Detalles de la Cita <Icon name="edit" className="ui-icon-blue" />
            </h3>
          </div>
          {editingEvent && (
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-event-title">
                  Título
                </label>
                <input id="edit-event-title" name="title" defaultValue={editingEvent.title} className="form-input" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-event-date">
                    Fecha
                  </label>
                  <input id="edit-event-date" name="date" type="date" defaultValue={editingEvent.date} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-event-time">
                    Hora
                  </label>
                  <input id="edit-event-time" name="time" type="time" defaultValue={editingEvent.time || '19:30'} className="form-input" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-event-location">
                  Lugar
                </label>
                <input id="edit-event-location" name="location" defaultValue={editingEvent.location} className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-event-dress">
                  Código de vestimenta
                </label>
                <input id="edit-event-dress" name="dressCode" defaultValue={editingEvent.dressCode} className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-event-desc">
                  Mensaje de invitación
                </label>
                <textarea id="edit-event-desc" name="description" defaultValue={editingEvent.description} className="form-textarea" rows={3} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-event-hint">
                  Detalle secreto (opcional)
                </label>
                <input id="edit-event-hint" name="secretHint" defaultValue={editingEvent.secretHint || ''} className="form-input" />
              </div>
              <button type="submit" className="btn-primary">
                <span>Actualizar cita</span>
              </button>
            </form>
          )}
        </div>
      </dialog>
    </div>
  );
}
