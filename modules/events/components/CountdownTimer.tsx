'use client';

import { useEffect, useRef, useState } from 'react';
import type { EventItem } from '@/types/events';
import { isEventReadyToDisplay } from '../domain/eventRules';
import { formatMexicoCityDateTimeInput, parseMexicoCityDateTime } from '../domain/timezone';
import { Icon } from '@/shared/icons/Icon';

const QUOTES = [
  'Contando cada segundo para volver a verte sonreír',
  'El tiempo se hace eterno cuando no estás, y vuela cuando estamos juntos',
  'Tengo mil cosas que contarte y más ganas de abrazarte',
  'Cada segundo que pasa es un segundo más cerca de nuestro momento',
  '¡Prometo que esta salida será inolvidable!',
];

function calculateNextDate(events: EventItem[]) {
  const now = Date.now();
  const visibleEvents = events.filter((e) => isEventReadyToDisplay(e));

  const futureEvents = visibleEvents
    .map((e) => {
      const time = parseMexicoCityDateTime(e.date, e.time || '19:00');
      return { ...e, timestamp: isNaN(time) ? now + 86400000 * 3 : time };
    })
    .filter((e) => e.timestamp > now)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (futureEvents.length > 0) {
    return { targetDate: futureEvents[0].timestamp, title: futureEvents[0].title };
  }
  return { targetDate: now + 86400000 * 5, title: 'Nuestra Próxima Cita Mágica' };
}

export default function CountdownTimer({ events }: { events: EventItem[] }) {
  const [target, setTarget] = useState<{ targetDate: number; title: string }>(() => calculateNextDate(events));
  // null hasta montar en el cliente: evita un desajuste de hidratación, ya que
  // Date.now() nunca coincide exactamente entre el render del servidor y el del cliente.
  const [now, setNow] = useState<number | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const customTargetRef = useRef(false);

  useEffect(() => {
    if (!customTargetRef.current) {
      setTarget(calculateNextDate(events));
    }
  }, [events]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const distance = now === null ? 0 : target.targetDate - now;
  const arrived = now !== null && distance <= 0;
  const days = arrived ? 0 : Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = arrived ? 0 : Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = arrived ? 0 : Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = arrived ? 0 : Math.floor((distance % (1000 * 60)) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  function openDatePicker() {
    const form = dialogRef.current?.querySelector<HTMLInputElement>('#edit-target-datetime');
    if (form) {
      form.value = formatMexicoCityDateTimeInput(target.targetDate);
    }
    dialogRef.current?.showModal();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dateTimeInput = (e.currentTarget.elements.namedItem('datetime') as HTMLInputElement)?.value;
    const titleInput = (e.currentTarget.elements.namedItem('title') as HTMLInputElement)?.value.trim();
    const [datePart, timePart] = (dateTimeInput || '').split('T');
    const time = parseMexicoCityDateTime(datePart, timePart);
    if (!isNaN(time)) {
      customTargetRef.current = true;
      setTarget({ targetDate: time, title: titleInput || 'Nuestra Próxima Cita 💖' });
    }
    dialogRef.current?.close();
  }

  return (
    <div className="countdown-card glass-panel" id="countdown-section">
      <div className="countdown-header">
        <div className="badge-mini">
          <span className="pulse-dot"></span>
          <span>TIEMPO PARA NUESTRA CITA</span>
        </div>
        <h2 className="countdown-title">{target.title}</h2>
        <p className="countdown-quote" style={{ opacity: quoteVisible ? 1 : 0 }}>
          &quot;{QUOTES[quoteIndex]}&quot;
        </p>
      </div>

      <div className="countdown-grid">
        <div className="countdown-box">
          <span className="countdown-number">{pad(days)}</span>
          <span className="countdown-label">DÍAS</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-box">
          <span className="countdown-number">{pad(hours)}</span>
          <span className="countdown-label">HORAS</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-box">
          <span className="countdown-number">{pad(minutes)}</span>
          <span className="countdown-label">MINUTOS</span>
        </div>
        <div className="countdown-separator">:</div>
        <div className="countdown-box pulse-box">
          <span className="countdown-number">{pad(seconds)}</span>
          <span className="countdown-label">SEGUNDOS</span>
        </div>
      </div>

      <div className="countdown-footer">
        <button type="button" className="btn-ghost-sm" onClick={openDatePicker}>
          <span>
            <Icon name="calendar" className="ui-icon-blue" /> Ajustar fecha u hora
          </span>
        </button>
        <div className="countdown-status-text">
          {arrived ? (
            <span className="arrived-pulse">🎉 ¡Llegó el día de nuestra cita! A disfrutar cada momento 💖</span>
          ) : (
            <span>
              <Icon name="sparkle" className="ui-icon-gold" /> Cuenta regresiva en tiempo real
            </span>
          )}
        </div>
      </div>

      <dialog ref={dialogRef} id="modal-edit-date">
        <div className="modal-card">
          <button type="button" className="modal-close-btn" aria-label="Cerrar" onClick={() => dialogRef.current?.close()}>
            &times;
          </button>
          <div className="modal-header-styled">
            <h3 className="modal-title-styled">
              Ajustar Fecha de Nuestra Cita <Icon name="calendar" className="ui-icon-blue" />
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Selecciona el día y la hora para actualizar el cronómetro en vivo.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-target-datetime">
                Fecha y Hora
              </label>
              <input id="edit-target-datetime" name="datetime" type="datetime-local" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-date-title">
                Título del Momento
              </label>
              <input id="edit-date-title" name="title" type="text" className="form-input" placeholder="Ej: Nuestra Cena Romántica" />
            </div>
            <button type="submit" className="btn-primary">
              <span>Guardar y actualizar cronómetro</span>
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
