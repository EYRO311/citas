'use client';

import { useState } from 'react';
import type { EventItem } from '@/types/events';
import { deleteEvent, updateEvent, updateEventRSVP } from '@/modules/events/data/eventsRepository';
import { getEventRevealTimestamp, isEventReadyToDisplay } from '@/modules/events/domain/eventRules';
import { Icon } from '@/shared/icons/Icon';

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Fecha por definir';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }
  } catch {
    // ignore
  }
  return dateStr;
}

function formatTimeRemaining(targetTimestamp: number) {
  if (!targetTimestamp) return '';
  const diff = targetTimestamp - Date.now();
  if (diff <= 0) return 'Hora cumplida';
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  if (days > 0) return `(Faltan ${days}d ${hours % 24}h)`;
  return `(Faltan ${hours}h ${mins}m)`;
}

type Filter = 'all' | 'public' | 'hidden';

export default function EventsAdminList({
  events,
  onEdit,
  refresh,
  onShowToast,
  driveLabel,
  onDriveClick,
}: {
  events: EventItem[];
  onEdit: (eventId: number) => void;
  refresh: () => void;
  onShowToast: (msg: string) => void;
  driveLabel: string;
  onDriveClick: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const total = events.length;
  const hiddenCount = events.filter((e) => e.isHidden).length;
  const publicCount = total - hiddenCount;
  const acceptedCount = events.filter((e) => e.accepted).length;

  const filtered =
    filter === 'public' ? events.filter((e) => !e.isHidden) : filter === 'hidden' ? events.filter((e) => e.isHidden) : events;

  function toggleForceReveal(event: EventItem) {
    const willForce = !event.forceReveal;
    updateEvent(event.id, { forceReveal: willForce });
    onShowToast(willForce ? '¡Cita revelada inmediatamente para Adi! 👁️✨' : 'Cita bloqueada: no se mostrará hasta su hora programada ⏳');
    refresh();
  }

  function toggleVisibility(event: EventItem) {
    const updated = updateEvent(event.id, { isHidden: !event.isHidden });
    onShowToast(updated?.isHidden ? 'La cita ahora es secreta / oculta 🔒' : 'La cita ahora es visible públicamente 💌');
    refresh();
  }

  function toggleRsvp(event: EventItem) {
    updateEventRSVP(event.id, !event.accepted);
    refresh();
  }

  function handleDelete(event: EventItem) {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${event.title}"? Esta acción no se puede deshacer.`)) return;
    deleteEvent(event.id);
    onShowToast('Cita eliminada correctamente 🗑️');
    refresh();
  }

  return (
    <>
      <section className="admin-stats-grid" aria-label="Resumen de Citas y Álbum">
        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <Icon name="calendar" className="ui-icon-lg ui-icon-blue" />
          </div>
          <div className="stat-data">
            <span className="stat-number">{total}</span>
            <span className="stat-label">Total Citas</span>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <Icon name="envelope" className="ui-icon-lg ui-icon-rose" />
          </div>
          <div className="stat-data">
            <span className="stat-number">{publicCount}</span>
            <span className="stat-label">Públicas</span>
          </div>
        </div>
        <div className="stat-card glass-panel stat-card-secret">
          <div className="stat-icon">
            <Icon name="lock" className="ui-icon-lg ui-icon-amber" />
          </div>
          <div className="stat-data">
            <span className="stat-number">{hiddenCount}</span>
            <span className="stat-label">Ocultas (Secretas)</span>
          </div>
        </div>
        <div className="stat-card glass-panel stat-card-accepted">
          <div className="stat-icon">
            <Icon name="heart" className="ui-icon-lg ui-icon-rose" />
          </div>
          <div className="stat-data">
            <span className="stat-number">{acceptedCount}</span>
            <span className="stat-label">Aceptadas</span>
          </div>
        </div>
        <div className="stat-card glass-panel stat-card-drive" style={{ cursor: 'pointer' }} title="Ver estado de conexión con Google Drive" onClick={onDriveClick}>
          <div className="stat-icon">
            <Icon name="cloud" className="ui-icon-lg ui-icon-blue" />
          </div>
          <div className="stat-data">
            <span className="stat-number" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
              {driveLabel}
            </span>
            <span className="stat-label">Google Drive</span>
          </div>
        </div>
      </section>

      <section className="admin-list-section">
        <div className="glass-panel admin-list-card">
          <div className="list-header-bar">
            <div>
              <h2 className="admin-section-title">Citas Programadas</h2>
              <p className="admin-section-subtitle">Visualiza, edita o cambia la visibilidad en tiempo real</p>
            </div>

            <div className="admin-filter-tabs">
              <button type="button" className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                Todas ({total})
              </button>
              <button type="button" className={`filter-tab ${filter === 'public' ? 'active' : ''}`} onClick={() => setFilter('public')}>
                Públicas ({publicCount})
              </button>
              <button type="button" className={`filter-tab ${filter === 'hidden' ? 'active' : ''}`} onClick={() => setFilter('hidden')}>
                Ocultas <Icon name="lock" className="ui-icon-amber" /> ({hiddenCount})
              </button>
            </div>
          </div>

          <div className="admin-cards-grid">
            {filtered.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-icon">
                  <Icon name="calendar" className="ui-icon-gold ui-icon-xl" />
                </div>
                <h3>No hay citas en esta categoría</h3>
                <p>Usa el formulario de la izquierda para planificar un nuevo momento romántico.</p>
              </div>
            ) : (
              filtered.map((event) => {
                const isAccepted = event.accepted;
                const isHidden = event.isHidden;
                const isReady = isEventReadyToDisplay(event);
                const revealTs = getEventRevealTimestamp(event);
                const dateFormatted = formatDate(event.date);
                const timeRemaining = isHidden ? formatTimeRemaining(revealTs) : '';

                return (
                  <div key={event.id} className={`admin-event-card ${isHidden ? 'admin-card-secret' : ''} ${isAccepted ? 'admin-card-accepted' : ''}`}>
                    <div className="admin-card-top">
                      <div className="admin-badge-group">
                        <span className={`badge-event ${isHidden ? 'badge-secret' : ''}`}>{event.badge || `CITA #${event.id}`}</span>
                        {isHidden ? (
                          isReady ? (
                            <span className="status-badge-secret" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#047857', borderColor: '#6ee7b7' }}>
                              <Icon name="sparkle" className="ui-icon-emerald" /> Ya visible para Adi
                            </span>
                          ) : (
                            <span className="status-badge-secret" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#b91c1c', borderColor: '#fca5a5' }}>
                              <Icon name="hourglass" className="ui-icon-amber" /> Oculta (Sin mostrarse a Adi)
                            </span>
                          )
                        ) : (
                          <span className="status-badge-public">
                            <Icon name="envelope" className="ui-icon-blue" /> Pública
                          </span>
                        )}
                      </div>
                      <div className="admin-rsvp-tag">
                        {isAccepted ? (
                          <span className="rsvp-accepted">
                            <Icon name="heart" className="ui-icon-rose" /> Aceptada por Adi
                          </span>
                        ) : (
                          <span className="rsvp-pending">
                            <Icon name="hourglass" className="ui-icon-amber" /> Invitación Pendiente
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="admin-card-title">{event.title}</h3>
                    <p className="admin-card-desc">{event.description}</p>

                    <div className="admin-meta-grid">
                      <div className="admin-meta-item">
                        <span className="meta-icon">
                          <Icon name="calendar" className="ui-icon-blue" />
                        </span>
                        <span>
                          {dateFormatted} ({event.time || '19:30'} hrs)
                        </span>
                      </div>
                      <div className="admin-meta-item">
                        <span className="meta-icon">
                          <Icon name="location" className="ui-icon-rose" />
                        </span>
                        <span>{event.location}</span>
                      </div>
                      <div className="admin-meta-item">
                        <span className="meta-icon">
                          <Icon name="dress" className="ui-icon-amber" />
                        </span>
                        <span>{event.dressCode}</span>
                      </div>
                      {event.secretHint && (
                        <div className="admin-meta-item">
                          <span className="meta-icon">
                            <Icon name="sparkle" className="ui-icon-gold" />
                          </span>
                          <span style={{ fontStyle: 'italic' }}>{event.secretHint}</span>
                        </div>
                      )}
                    </div>

                    {isHidden && (
                      <div className="admin-secret-info-box">
                        <div className="secret-info-title">
                          <Icon name="lock" className="ui-icon-amber" /> Configuración de Cita Oculta:
                        </div>
                        <div className="secret-info-row">
                          <strong>Palabra mágica para Adi:</strong> <code>{event.secretCode || '(Sin palabra requerida, revela al pulsar)'}</code>
                        </div>
                        {event.secretClue && (
                          <div className="secret-info-row">
                            <strong>Pista visible para ella:</strong> <em>&quot;{event.secretClue}&quot;</em>
                          </div>
                        )}

                        <div
                          className="secret-info-row"
                          style={{
                            marginTop: 8,
                            padding: '10px 12px',
                            background: !isReady ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.1)',
                            borderRadius: 8,
                            borderLeft: `4px solid ${!isReady ? '#ef4444' : '#10b981'}`,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: !isReady ? '#b91c1c' : '#047857', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                            <span>
                              {!isReady ? (
                                <>
                                  <Icon name="lock" className="ui-icon-amber" /> SIN MOSTRARSE A ADI HASTA LA HORA
                                </>
                              ) : (
                                <>
                                  <Icon name="eye" className="ui-icon-emerald" /> YA MOSTRADA A ADI
                                </>
                              )}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#4b5563' }}>
                              {!isReady ? timeRemaining : event.forceReveal ? '(Revelación forzada)' : '(Hora alcanzada)'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: 4 }}>
                            {!isReady ? (
                              <>
                                Programada para aparecer en la página el <strong>{formatDate(event.revealDate || event.date)} a las {event.revealTime || event.time || '19:30'} hrs</strong>. Hasta ese momento exacto, la tarjeta y el contador están <strong>completamente invisibles</strong> para ella.
                              </>
                            ) : (
                              'La tarjeta ya está desbloqueada y visible en la página principal para Adi.'
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="admin-card-actions">
                      {isHidden && (
                        <button
                          type="button"
                          className="btn-action-icon btn-toggle-force-reveal"
                          title={event.forceReveal ? 'Volver a bloquear hasta la hora exacta' : 'Forzar que se muestre a Adi inmediatamente'}
                          onClick={() => toggleForceReveal(event)}
                        >
                          <span>
                            {event.forceReveal ? (
                              <>
                                <Icon name="hourglass" className="ui-icon-amber" /> Bloquear hasta la hora
                              </>
                            ) : (
                              <>
                                <Icon name="eye" className="ui-icon-blue" /> Mostrar a Adi ahora
                              </>
                            )}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-action-icon btn-toggle-visibility"
                        title={isHidden ? 'Hacer pública esta cita' : 'Ocultar esta cita (Hacer secreta)'}
                        onClick={() => toggleVisibility(event)}
                      >
                        <span>
                          {isHidden ? (
                            <>
                              <Icon name="unlock" className="ui-icon-blue" /> Hacer Pública
                            </>
                          ) : (
                            <>
                              <Icon name="lock" className="ui-icon-amber" /> Hacer Oculta
                            </>
                          )}
                        </span>
                      </button>

                      <button type="button" className="btn-action-icon btn-edit-event" title="Editar contenido" onClick={() => onEdit(event.id)}>
                        <span>
                          <Icon name="edit" className="ui-icon-blue" /> Editar
                        </span>
                      </button>

                      <button
                        type="button"
                        className="btn-action-icon btn-toggle-rsvp"
                        title={isAccepted ? 'Marcar como pendiente' : 'Marcar como aceptada'}
                        onClick={() => toggleRsvp(event)}
                      >
                        <span>
                          {isAccepted ? (
                            <>
                              <Icon name="undo" className="ui-icon-blue" /> Marcar Pendiente
                            </>
                          ) : (
                            <>
                              <Icon name="heart" className="ui-icon-rose" /> Marcar Aceptada
                            </>
                          )}
                        </span>
                      </button>

                      <button type="button" className="btn-action-icon btn-action-delete btn-delete-event" title="Eliminar cita" onClick={() => handleDelete(event)}>
                        <span>
                          <Icon name="trash" className="ui-icon-rose" /> Eliminar
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}
