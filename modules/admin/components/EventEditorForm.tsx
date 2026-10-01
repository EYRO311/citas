'use client';

import { useEffect, useState } from 'react';
import type { EventItem } from '@/types/events';
import { addEvent, updateEvent } from '@/modules/events/data/eventsRepository';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { Icon } from '@/shared/icons/Icon';

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  title: '',
  badge: '',
  date: today(),
  time: '19:30',
  location: '',
  dressCode: '',
  description: '',
  secretHint: '',
  isHidden: false,
  secretCode: '',
  secretClue: '',
  revealDate: today(),
  revealTime: '19:30',
  forceReveal: false,
};

type FormState = typeof emptyForm;

export default function EventEditorForm({
  editingEvent,
  onCancelEdit,
  onSaved,
}: {
  editingEvent: EventItem | null;
  onCancelEdit: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (editingEvent) {
      setForm({
        title: editingEvent.title || '',
        badge: editingEvent.badge || '',
        date: editingEvent.date || '',
        time: editingEvent.time || '19:30',
        location: editingEvent.location || '',
        dressCode: editingEvent.dressCode || '',
        description: editingEvent.description || '',
        secretHint: editingEvent.secretHint || '',
        isHidden: !!editingEvent.isHidden,
        secretCode: editingEvent.secretCode || '',
        secretClue: editingEvent.secretClue || '',
        revealDate: editingEvent.revealDate || editingEvent.date || today(),
        revealTime: editingEvent.revealTime || editingEvent.time || '19:30',
        forceReveal: !!editingEvent.forceReveal,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingEvent]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      title: form.title,
      badge: form.badge || (form.isHidden ? '🔒 CITA SECRETA' : undefined),
      date: form.date,
      time: form.time,
      location: form.location,
      dressCode: form.dressCode,
      description: form.description,
      secretHint: form.secretHint,
      isHidden: form.isHidden,
      secretCode: form.secretCode,
      secretClue: form.secretClue,
      revealDate: form.revealDate || form.date,
      revealTime: form.revealTime || form.time,
      forceReveal: form.forceReveal,
    };

    if (editingEvent) {
      updateEvent(editingEvent.id, payload);
      onSaved('¡Cita actualizada exitosamente! ✨');
    } else {
      addEvent(payload);
      triggerGlobalBurst(window.innerWidth / 2, window.innerHeight * 0.4, 50);
      onSaved(form.isHidden ? '¡Sorpresa secreta creada con éxito! 🔒💖' : '¡Nueva cita creada con éxito! 💌');
    }

    setForm(emptyForm);
    onCancelEdit();
  }

  function handleCancel() {
    setForm(emptyForm);
    onCancelEdit();
  }

  return (
    <section className="admin-form-section">
      <div className="glass-panel admin-form-card">
        <div className="admin-form-header">
          <div className="header-icon">
            <Icon name={editingEvent ? 'edit' : 'sparkle'} className="ui-icon-lg ui-icon-gold" />
          </div>
          <div>
            <h2 className="admin-section-title">{editingEvent ? `Editar Cita #${editingEvent.id}` : 'Crear Nueva Cita'}</h2>
            <p className="admin-section-subtitle">
              {editingEvent ? `Modificando: "${editingEvent.title}"` : 'Completa los detalles para preparar la invitación'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-event-form">
          <div className="secret-toggle-card">
            <div className="toggle-info">
              <div className="toggle-icon-wrap">
                <Icon name={form.isHidden ? 'lock' : 'unlock'} className="ui-icon-amber" />
              </div>
              <div>
                <label className="toggle-title" htmlFor="event-is-hidden">
                  ¿Es una Cita Oculta (Sorpresa Secreta)?
                </label>
                <p className="toggle-desc">
                  Permanecerá sin mostrarse a Adi hasta que el reloj alcance la fecha y hora programada. Al llegar
                  esa hora, aparecerá automáticamente.
                </p>
              </div>
            </div>
            <label className="switch-control" htmlFor="event-is-hidden">
              <input
                type="checkbox"
                id="event-is-hidden"
                checked={form.isHidden}
                onChange={(e) => set('isHidden', e.target.checked)}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          {form.isHidden && (
            <div className="secret-config-panel">
              <div className="secret-panel-glow"></div>
              <div className="secret-panel-inner">
                <div className="secret-panel-header">
                  <span className="secret-badge">
                    <Icon name="lock" className="ui-icon-amber" /> Revelación Programada por Hora
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="event-reveal-date">
                      Fecha en que se mostrará *
                    </label>
                    <input
                      type="date"
                      id="event-reveal-date"
                      className="form-input form-input-secret"
                      value={form.revealDate}
                      onChange={(e) => set('revealDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="event-reveal-time">
                      Hora en que se revelará *
                    </label>
                    <input
                      type="time"
                      id="event-reveal-time"
                      className="form-input form-input-secret"
                      value={form.revealTime}
                      onChange={(e) => set('revealTime', e.target.value)}
                    />
                  </div>
                </div>
                <p className="field-help-text" style={{ color: '#4338ca', fontWeight: 600, marginBottom: 10 }}>
                  <Icon name="clock" className="ui-icon-blue" /> <strong>Sin mostrarse:</strong> Esta cita no
                  aparecerá en la página hasta que llegue este momento exacto.
                </p>

                <div
                  className="form-group"
                  style={{ background: 'rgba(255,255,255,0.7)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #c7d2fe' }}
                >
                  <label
                    htmlFor="event-force-reveal"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#1e3a8a', margin: 0 }}
                  >
                    <input
                      type="checkbox"
                      id="event-force-reveal"
                      checked={form.forceReveal}
                      onChange={(e) => set('forceReveal', e.target.checked)}
                    />
                    <span>
                      <Icon name="eye" className="ui-icon-blue" /> <strong>Forzar revelación inmediata</strong>{' '}
                      (mostrar desde ya a Adi, ignorando la hora)
                    </span>
                  </label>
                </div>

                <div className="form-group" style={{ marginTop: 10 }}>
                  <label className="form-label" htmlFor="event-secret-code">
                    <span>Palabra mágica de desbloqueo (Opcional)</span>
                    <span className="label-hint">(Lo que Adi debe escribir al revelarse)</span>
                  </label>
                  <input
                    type="text"
                    id="event-secret-code"
                    className="form-input"
                    placeholder="Ej: girasol, nuestro cafe (o dejar vacío para revelación directa)"
                    value={form.secretCode}
                    onChange={(e) => set('secretCode', e.target.value)}
                  />
                  <p className="field-help-text">
                    Si lo dejas vacío, al llegar la hora se revelará directamente. Si pones una palabra, le pedirá
                    adivinarla.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="event-secret-clue">
                    <span>Pista misteriosa para Adi</span>
                    <span className="label-hint">(Visible en la tarjeta bloqueada)</span>
                  </label>
                  <input
                    type="text"
                    id="event-secret-clue"
                    className="form-input"
                    placeholder="Ej: Nuestra flor favorita cuando cae la tarde... 🌻"
                    value={form.secretClue}
                    onChange={(e) => set('secretClue', e.target.value)}
                  />
                  <p className="field-help-text">Una pista divertida y romántica para que intente adivinar la sorpresa.</p>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="event-title">
              Título de la cita *
            </label>
            <input
              type="text"
              id="event-title"
              className="form-input"
              placeholder="Ej: Noche de Películas & Postre Especial 🍨✨"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="event-badge">
                Etiqueta destacada
              </label>
              <input
                type="text"
                id="event-badge"
                className="form-input"
                placeholder="Ej: CITA ESPECIAL #3, SORPRESA"
                value={form.badge}
                onChange={(e) => set('badge', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="event-time">
                Hora aproximada *
              </label>
              <input
                type="time"
                id="event-time"
                className="form-input"
                required
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="event-date">
                Fecha de la cita *
              </label>
              <input
                type="date"
                id="event-date"
                className="form-input"
                required
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="event-dress">
                Código de vestimenta *
              </label>
              <input
                type="text"
                id="event-dress"
                className="form-input"
                placeholder="Ej: Cómodo, Elegante casual"
                required
                value={form.dressCode}
                onChange={(e) => set('dressCode', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-location">
              Lugar o punto de encuentro *
            </label>
            <input
              type="text"
              id="event-location"
              className="form-input"
              placeholder="Ej: Un rincón especial con luces cálidas"
              required
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-desc">
              Mensaje de invitación romántico *
            </label>
            <textarea
              id="event-desc"
              className="form-textarea"
              rows={3}
              placeholder="Escribe lo que sientes y por qué quieres compartir este momento con ella..."
              required
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-hint">
              Detalle secreto opcional
            </label>
            <input
              type="text"
              id="event-hint"
              className="form-input"
              placeholder="Ej: Tengo guardada tu canción favorita para el camino 🎶"
              value={form.secretHint}
              onChange={(e) => set('secretHint', e.target.value)}
            />
            <p className="field-help-text">Se mostrará en la tarjeta con un icono confidencial (🤫).</p>
          </div>

          <div className="form-actions-group">
            <button type="submit" className="btn-primary">
              <span>
                <Icon name="save" className="ui-icon-white" /> {editingEvent ? 'Actualizar Cita' : 'Guardar Cita'}
              </span>
            </button>
            {editingEvent && (
              <button type="button" className="btn-ghost-sm" onClick={handleCancel}>
                <span>Cancelar edición</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
