// ==============================================================================
// COMPONENTE: INVITACIONES A CITAS ESPECIALES & CITAS SECRETAS / OCULTAS
// ==============================================================================

import {
  getEvents,
  updateEventRSVP,
  saveEvents,
  isEventSecretUnlocked,
  unlockSecretEvent,
  lockSecretEvent,
  isEventReadyToDisplay
} from '../utils/storage.js';
import { sounds } from '../utils/audio.js';

export class EventsInvitations {
  constructor(containerId = 'events-container', onRSVPChange = null) {
    this.container = document.getElementById(containerId);
    this.onRSVPChange = onRSVPChange;
    this.shyButtonCount = 0;
    this.lastVisibleCount = 0;
    this.shyPhrases = [
      '¿Segura? 🥺',
      '¡Habrá tu postre favorito! 🍰',
      '¡No te hagas del rogar jeje! 🥰',
      '¡Prometo hacerte reír mucho! ✨',
      '¡Di que sí por favor! 🌻',
      '¡Ya casi le das al Sí! 💖'
    ];
    this.init();
  }

  init() {
    this.render();

    // Re-renderizar si cambian los eventos o se desbloquea un secreto
    window.addEventListener('events_updated', () => this.render());
    window.addEventListener('secret_unlocked', () => this.render());
    window.addEventListener('secret_locked', () => this.render());

    // Verificador periódico: revela citas ocultas automáticamente en el momento exacto
    this.startTimeRevealWatcher();
  }

  startTimeRevealWatcher() {
    if (this.timeWatcherInterval) clearInterval(this.timeWatcherInterval);
    this.timeWatcherInterval = setInterval(() => {
      const events = getEvents();
      const currentReadyCount = events.filter(e => isEventReadyToDisplay(e)).length;
      if (currentReadyCount !== this.lastVisibleCount) {
        sounds.playCelebration();
        if (window.petalsInstance) {
          window.petalsInstance.triggerBurst(window.innerWidth / 2, window.innerHeight * 0.4, 55);
        }
        this.render();
        if (this.onRSVPChange) this.onRSVPChange();
      }
    }, 15000);
  }

  render() {
    if (!this.container) return;
    const events = getEvents();

    // FILTRADO ESTRICTO: Citas ocultas permanecen sin mostrarse hasta que se llegue a esa hora
    const visibleEvents = events.filter(event => isEventReadyToDisplay(event));
    this.lastVisibleCount = visibleEvents.length;

    if (visibleEvents.length === 0) {
      this.container.innerHTML = `
        <div class="glass-panel" style="text-align: center; padding: 40px 20px; border-radius: var(--radius-lg);">
          <span style="font-size: 2.5rem; display: block; margin-bottom: 10px;">🌻</span>
          <h3 style="font-family: var(--font-display); font-size: 1.4rem; color: #1e3a8a; margin-bottom: 8px;">
            No hay citas programadas por el momento
          </h3>
          <p style="color: #64748b; font-size: 0.95rem;">
            Pronto habrá nuevas sorpresas y momentos mágicos preparados para ti.
          </p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="events-grid">
        ${visibleEvents.map(event => this.renderEventCard(event)).join('')}
      </div>
    `;

    this.attachEventListeners();
  }

  renderEventCard(event) {
    const isHidden = !!event.isHidden;
    const isUnlocked = isHidden ? isEventSecretUnlocked(event.id) : true;

    // Si es un evento oculto y NO está desbloqueado por Adi, renderizar tarjeta misteriosa
    if (isHidden && !isUnlocked) {
      return this.renderLockedSecretCard(event);
    }

    // Si es evento público o secreto ya revelado
    return this.renderActiveEventCard(event, isHidden && isUnlocked);
  }

  // ------------------------------------------------------------------------------
  // TARJETA DE CITA OCULTA / SECRETA (BLOQUEADA CON CANDADO)
  // ------------------------------------------------------------------------------
  renderLockedSecretCard(event) {
    const hasSecretCode = Boolean(event.secretCode && event.secretCode.trim().length > 0);

    return `
      <article class="event-card glass-panel event-card-secret locked" data-event-id="${event.id}">
        <!-- Cinta superior de misterio -->
        <div class="card-top-seal">
          <span class="badge-event badge-secret">🔒 CITA SECRETA & SORPRESA</span>
          <span class="status-badge-pending">✨ Por Descubrir</span>
        </div>

        <div class="secret-card-inner">
          <div class="secret-lock-glow-icon">
            <span class="lock-emoji">🔒</span>
            <span class="sparkle-emoji">✨</span>
          </div>

          <h3 class="event-title secret-card-title">Una Cita Secreta Te Espera... 🤫</h3>
          <p class="event-description secret-card-desc">
            Eyro ha preparado una sorpresa secreta para ti. Para descubrir el lugar, la hora y todos los detalles románticos, revela esta tarjeta.
          </p>

          ${event.secretClue ? `
            <div class="secret-clue-box">
              <span class="clue-icon">🌻</span>
              <div class="clue-content">
                <span class="clue-label">Pista de Eyro para Adi:</span>
                <p class="clue-text">"${event.secretClue}"</p>
              </div>
            </div>
          ` : ''}

          <!-- Interacción de desbloqueo -->
          <div class="secret-unlock-block">
            ${hasSecretCode ? `
              <div class="unlock-form-wrap">
                <label class="unlock-input-label" for="secret-input-${event.id}">
                  Ingresa la palabra mágica para revelar la sorpresa:
                </label>
                <div class="unlock-input-row">
                  <input 
                    type="text" 
                    id="secret-input-${event.id}" 
                    class="form-input secret-guess-input" 
                    placeholder="Escribe la palabra mágica aquí..." 
                    autocomplete="off" 
                    data-event-id="${event.id}" 
                  />
                  <button class="btn-primary btn-unlock-secret" data-event-id="${event.id}">
                    <span>Descubrir ✨</span>
                  </button>
                </div>
                <p id="secret-feedback-${event.id}" class="secret-feedback-error hidden"></p>
              </div>
            ` : `
              <div style="text-align: center; margin-top: 10px;">
                <p class="unlock-direct-prompt">Toca el botón para abrir el sobre y descubrir la sorpresa:</p>
                <button class="btn-primary btn-unlock-direct" data-event-id="${event.id}" style="width: 100%;">
                  <span>🎁 ¡Abrir y Revelar Sorpresa! ✨</span>
                </button>
              </div>
            `}
          </div>
        </div>

        <!-- Pie de tarjeta secreta -->
        <div class="secret-card-footer">
          <span>💌 Preparada con amor por Eyro</span>
        </div>
      </article>
    `;
  }

  // ------------------------------------------------------------------------------
  // TARJETA DE CITA ACTIVA (PÚBLICA O SECRETO REVELADO)
  // ------------------------------------------------------------------------------
  renderActiveEventCard(event, isRevealedSecret = false) {
    const isAccepted = event.accepted;
    const dateFormatted = this.formatDate(event.date);

    return `
      <article class="event-card glass-panel ${isRevealedSecret ? 'card-secret-revealed' : ''} ${isAccepted ? 'card-accepted' : ''}" data-event-id="${event.id}">
        
        <!-- Cinta o sello superior -->
        <div class="card-top-seal">
          <span class="badge-event ${isRevealedSecret ? 'badge-secret' : ''}">
            ${isRevealedSecret ? '✨ SORPRESA REVELADA' : (event.badge || `CITA #${event.id}`)}
          </span>
          ${isAccepted 
            ? '<span class="status-badge-accepted">💖 ¡ACEPTADA!</span>' 
            : '<span class="status-badge-pending">💌 Invitación Abierta</span>'}
        </div>

        ${isRevealedSecret ? `
          <div class="secret-revealed-banner">
            <span>🎉 ¡Sorpresa desbloqueada! Aquí tienes todos los detalles mágicos:</span>
          </div>
        ` : ''}

        <h3 class="event-title">${event.title}</h3>
        <p class="event-description">${event.description}</p>

        <!-- Detalles de la Cita -->
        <div class="event-details-box">
          <div class="detail-row">
            <span class="detail-icon">📅</span>
            <div class="detail-info">
              <span class="detail-label">Fecha</span>
              <strong class="detail-value">${dateFormatted}</strong>
            </div>
          </div>
          <div class="detail-row">
            <span class="detail-icon">⏰</span>
            <div class="detail-info">
              <span class="detail-label">Hora</span>
              <strong class="detail-value">${event.time || '19:30'} hrs</strong>
            </div>
          </div>
          <div class="detail-row">
            <span class="detail-icon">📍</span>
            <div class="detail-info">
              <span class="detail-label">Lugar</span>
              <strong class="detail-value">${event.location}</strong>
            </div>
          </div>
          <div class="detail-row">
            <span class="detail-icon">👗</span>
            <div class="detail-info">
              <span class="detail-label">Código de vestimenta</span>
              <strong class="detail-value">${event.dressCode}</strong>
            </div>
          </div>
          ${event.secretHint ? `
            <div class="detail-row highlight-row">
              <span class="detail-icon">🤫</span>
              <div class="detail-info">
                <span class="detail-label">Detalle secreto</span>
                <span class="detail-value-italic">${event.secretHint}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Acciones RSVP -->
        <div class="event-actions">
          ${isAccepted ? `
            <div class="accepted-banner">
              <div class="accepted-icon">🎉</div>
              <div>
                <strong>¡Aceptaste salir conmigo! 💖</strong>
                <p>Estoy preparando todo para que sea un día perfecto.</p>
              </div>
            </div>
            <div class="calendar-actions">
              <a href="${this.generateGoogleCalendarLink(event)}" target="_blank" rel="noopener noreferrer" class="btn-calendar">
                📅 Añadir a Google Calendar
              </a>
              <button class="btn-ghost-sm btn-undo-rsvp" data-event-id="${event.id}">
                Cambiar respuesta
              </button>
            </div>
          ` : `
            <div class="rsvp-prompt">
              <span>¿Aceptas esta invitación especial? 🌻</span>
            </div>
            <div class="buttons-group">
              <button class="btn-accept btn-primary" data-event-id="${event.id}">
                <span class="btn-heart-icon">💖</span>
                <span>¡Sí, acepto con todo mi amor!</span>
              </button>
              <button class="btn-shy btn-secondary" data-event-id="${event.id}">
                <span>Mmm... tal vez 🤔</span>
              </button>
            </div>
          `}
        </div>

        <!-- Botón de pie: Editar o Volver a bloquear secreto -->
        <div class="card-footer-edit">
          ${isRevealedSecret ? `
            <button class="btn-link-edit btn-relock-secret" data-event-id="${event.id}" title="Volver a poner candado a esta sorpresa">
              🔒 Volver a ocultar secreto
            </button>
          ` : `
            <button class="btn-link-edit" data-event-id="${event.id}">
              ✏️ Editar detalles de esta cita
            </button>
          `}
        </div>
      </article>
    `;
  }

  attachEventListeners() {
    // 1. Botones Aceptar RSVP
    this.container.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = parseInt(btn.dataset.eventId);
        this.handleAccept(eventId, e);
      });
    });

    // 2. Botones "Mmm... tal vez" juguetones
    this.container.querySelectorAll('.btn-shy').forEach(btn => {
      const moveHandler = () => {
        sounds.playPop();
        this.shyButtonCount++;
        const phrase = this.shyPhrases[this.shyButtonCount % this.shyPhrases.length];
        btn.querySelector('span').textContent = phrase;

        // Desplazamiento juguetón
        const randomX = (Math.random() - 0.5) * 80;
        const randomY = (Math.random() - 0.5) * 40;
        btn.style.transform = `translate(${randomX}px, ${randomY}px) scale(0.95)`;
      };

      btn.addEventListener('mouseenter', moveHandler);
      btn.addEventListener('click', moveHandler);
    });

    // 3. Botones deshacer RSVP
    this.container.querySelectorAll('.btn-undo-rsvp').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = parseInt(btn.dataset.eventId);
        updateEventRSVP(eventId, false);
        this.render();
        if (this.onRSVPChange) this.onRSVPChange();
      });
    });

    // 4. Botones editar detalles
    this.container.querySelectorAll('.btn-link-edit:not(.btn-relock-secret)').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = parseInt(btn.dataset.eventId);
        this.openEditEventModal(eventId);
      });
    });

    // 5. Botones volver a bloquear secreto
    this.container.querySelectorAll('.btn-relock-secret').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playPop();
        const eventId = parseInt(btn.dataset.eventId);
        lockSecretEvent(eventId);
        this.render();
      });
    });

    // 6. Desbloqueo de eventos ocultos con palabra mágica
    this.container.querySelectorAll('.btn-unlock-secret').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = parseInt(btn.dataset.eventId);
        this.attemptUnlockSecret(eventId, e);
      });
    });

    this.container.querySelectorAll('.secret-guess-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const eventId = parseInt(input.dataset.eventId);
          this.attemptUnlockSecret(eventId, e);
        }
      });
    });

    // 7. Desbloqueo directo de eventos ocultos (sin palabra mágica requerida)
    this.container.querySelectorAll('.btn-unlock-direct').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = parseInt(btn.dataset.eventId);
        this.doUnlock(eventId, e);
      });
    });
  }

  attemptUnlockSecret(eventId, e) {
    const input = document.getElementById(`secret-input-${eventId}`);
    const feedback = document.getElementById(`secret-feedback-${eventId}`);
    if (!input) return;

    const events = getEvents();
    const event = events.find(ev => ev.id === eventId);
    if (!event) return;

    const guess = (input.value || '').trim().toLowerCase();
    const code = (event.secretCode || '').trim().toLowerCase();

    // Si coincide con la palabra mágica
    if (guess === code || code === '') {
      this.doUnlock(eventId, e);
    } else {
      sounds.playPop();
      if (feedback) {
        feedback.textContent = 'Mmm... esa no es la palabra mágica. ¡Pídele una pista a Eyro! 😉🌻';
        feedback.classList.remove('hidden');
      }
      input.classList.add('input-shake');
      setTimeout(() => input.classList.remove('input-shake'), 600);
      input.focus();
    }
  }

  doUnlock(eventId, clickEvent) {
    sounds.playCelebration();
    unlockSecretEvent(eventId);

    if (window.petalsInstance) {
      const clientX = clickEvent?.clientX || window.innerWidth / 2;
      const clientY = clickEvent?.clientY || window.innerHeight / 2;
      window.petalsInstance.triggerBurst(clientX, clientY, 60);
      setTimeout(() => {
        window.petalsInstance.triggerBurst(window.innerWidth * 0.35, window.innerHeight * 0.4, 35);
        window.petalsInstance.triggerBurst(window.innerWidth * 0.65, window.innerHeight * 0.4, 35);
      }, 350);
    }

    this.render();
    if (this.onRSVPChange) this.onRSVPChange();
  }

  handleAccept(eventId, clickEvent) {
    sounds.playCelebration();
    updateEventRSVP(eventId, true);

    // Lanzar confeti en la posición del clic
    if (window.petalsInstance) {
      window.petalsInstance.triggerBurst(clickEvent.clientX, clickEvent.clientY, 50);
      setTimeout(() => {
        window.petalsInstance.triggerBurst(window.innerWidth * 0.3, window.innerHeight * 0.4, 30);
        window.petalsInstance.triggerBurst(window.innerWidth * 0.7, window.innerHeight * 0.4, 30);
      }, 300);
    }

    this.render();
    if (this.onRSVPChange) this.onRSVPChange();
  }

  formatDate(dateStr) {
    if (!dateStr) return 'Próximamente';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formatted = d.toLocaleDateString('es-ES', options);
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
    } catch (e) {}
    return dateStr;
  }

  generateGoogleCalendarLink(event) {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(`${event.description}\n\n👗 Código de vestimenta: ${event.dressCode}\n🤫 Detalle: ${event.secretHint || ''}`);
    const location = encodeURIComponent(event.location);

    // Fechas YYYYMMDDTHHMMSSZ
    const dateFormatted = event.date.replace(/-/g, '');
    const timeFormatted = (event.time || '19:30').replace(/:/g, '') + '00';
    const startIso = `${dateFormatted}T${timeFormatted}`;
    // Duración de 3 horas
    const endHour = String(parseInt((event.time || '19:30').split(':')[0]) + 3).padStart(2, '0');
    const endIso = `${dateFormatted}T${endHour}${(event.time || '19:30').split(':')[1]}00`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  }

  openEditEventModal(eventId) {
    const events = getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const modal = document.getElementById('modal-edit-event');
    if (!modal) return;

    document.getElementById('edit-event-id').value = event.id;
    document.getElementById('edit-event-title').value = event.title;
    document.getElementById('edit-event-date').value = event.date;
    document.getElementById('edit-event-time').value = event.time || '19:30';
    document.getElementById('edit-event-location').value = event.location;
    document.getElementById('edit-event-dress').value = event.dressCode;
    document.getElementById('edit-event-desc').value = event.description;
    document.getElementById('edit-event-hint').value = event.secretHint || '';

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }
}
