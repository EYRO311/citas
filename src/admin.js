// ==============================================================================
// PANEL DE ADMINISTRACIÓN: GESTIÓN DE CITAS & SORPRESAS SECRETAS (A + E) 🌻✨
// ==============================================================================

import { PetalsCanvas } from './components/petals.js';
import { sounds } from './utils/audio.js';
import {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  updateEventRSVP,
  getAdminPIN,
  setAdminPIN
} from './utils/storage.js';

class AdminDashboard {
  constructor() {
    this.currentFilter = 'all';
    this.editingEventId = null;
    this.petals = null;
    this.init();
  }

  init() {
    // Canvas de pétalos y corazones flotantes
    this.petals = new PetalsCanvas('petals-canvas');
    window.petalsInstance = this.petals;

    // Verificar si ya está autenticado en esta sesión
    this.checkAuth();

    // Enlazar eventos de la interfaz
    this.bindAuthEvents();
    this.bindFormEvents();
    this.bindFilterEvents();
    this.bindModalEvents();

    // Fecha predeterminada para el formulario (hoy)
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('event-date');
    if (dateInput) dateInput.value = today;

    // Escuchar actualizaciones de eventos externas
    window.addEventListener('events_updated', () => {
      this.refreshData();
    });
  }

  // ------------------------------------------------------------------------------
  // 1. SEGURIDAD Y AUTENTICACIÓN POR PIN
  // ------------------------------------------------------------------------------
  checkAuth() {
    const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
    const lockScreen = document.getElementById('admin-pin-lock');
    const mainContent = document.getElementById('admin-main-content');

    if (isAuth) {
      if (lockScreen) lockScreen.classList.add('hidden');
      if (mainContent) mainContent.classList.remove('hidden');
      this.refreshData();
    } else {
      if (lockScreen) lockScreen.classList.remove('hidden');
      if (mainContent) mainContent.classList.add('hidden');
      const pinInput = document.getElementById('admin-pin-input');
      if (pinInput) setTimeout(() => pinInput.focus(), 300);
    }
  }

  bindAuthEvents() {
    const pinForm = document.getElementById('admin-pin-form');
    const pinInput = document.getElementById('admin-pin-input');
    const pinError = document.getElementById('pin-error-msg');
    const logoutBtn = document.getElementById('btn-admin-logout');

    if (pinForm) {
      pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPin = (pinInput.value || '').trim();
        const actualPin = getAdminPIN();

        if (enteredPin === actualPin) {
          sounds.playCelebration();
          sessionStorage.setItem('admin_authenticated', 'true');
          if (pinError) pinError.classList.add('hidden');
          pinInput.value = '';
          if (this.petals) {
            this.petals.triggerBurst(window.innerWidth / 2, window.innerHeight / 2, 45);
          }
          this.checkAuth();
        } else {
          sounds.playPop();
          if (pinError) {
            pinError.classList.remove('hidden');
            pinError.textContent = 'PIN incorrecto. Revisa el código e intenta de nuevo 🌻';
          }
          pinInput.value = '';
          pinInput.focus();
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sounds.playPop();
        sessionStorage.removeItem('admin_authenticated');
        this.checkAuth();
      });
    }
  }

  // ------------------------------------------------------------------------------
  // 2. FORMULARIO: CREAR Y EDITAR CITAS
  // ------------------------------------------------------------------------------
  bindFormEvents() {
    const isHiddenToggle = document.getElementById('event-is-hidden');
    const secretFields = document.getElementById('secret-fields-container');
    const toggleIcon = document.getElementById('toggle-state-icon');
    const form = document.getElementById('event-editor-form');
    const cancelEditBtn = document.getElementById('btn-cancel-edit');

    // Cambiar campos de cita oculta al activar el interruptor
    if (isHiddenToggle) {
      isHiddenToggle.addEventListener('change', () => {
        sounds.playPop();
        const checked = isHiddenToggle.checked;
        if (secretFields) secretFields.classList.toggle('hidden', !checked);
        if (toggleIcon) toggleIcon.textContent = checked ? '🔒' : '🔓';
      });
    }

    // Cancelar edición
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        this.resetForm();
      });
    }

    // Guardar / Actualizar cita
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }
  }

  handleFormSubmit() {
    const idField = document.getElementById('event-form-id');
    const title = document.getElementById('event-title').value.trim();
    const badge = document.getElementById('event-badge').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const location = document.getElementById('event-location').value.trim();
    const dressCode = document.getElementById('event-dress').value.trim();
    const description = document.getElementById('event-desc').value.trim();
    const secretHint = document.getElementById('event-hint').value.trim();

    // Campos de cita secreta / oculta
    const isHidden = document.getElementById('event-is-hidden').checked;
    const secretCode = document.getElementById('event-secret-code').value.trim();
    const secretClue = document.getElementById('event-secret-clue').value.trim();

    const eventPayload = {
      title,
      badge: badge || (isHidden ? '🔒 CITA SECRETA' : 'CITA ESPECIAL'),
      date,
      time,
      location,
      dressCode,
      description,
      secretHint,
      isHidden,
      secretCode,
      secretClue
    };

    if (idField.value && idField.value !== '') {
      // Modo Edición
      const eventId = parseInt(idField.value);
      updateEvent(eventId, eventPayload);
      sounds.playCelebration();
      this.showToast('¡Cita actualizada exitosamente! ✨');
    } else {
      // Modo Creación
      addEvent(eventPayload);
      sounds.playCelebration();
      if (this.petals) {
        this.petals.triggerBurst(window.innerWidth / 2, window.innerHeight * 0.4, 50);
      }
      this.showToast(isHidden ? '¡Sorpresa secreta creada con éxito! 🔒💖' : '¡Nueva cita creada con éxito! 💌');
    }

    this.resetForm();
    this.refreshData();
  }

  resetForm() {
    this.editingEventId = null;
    const form = document.getElementById('event-editor-form');
    if (form) form.reset();

    document.getElementById('event-form-id').value = '';
    document.getElementById('form-mode-icon').textContent = '✨';
    document.getElementById('form-mode-title').textContent = 'Crear Nueva Cita';
    document.getElementById('form-mode-desc').textContent = 'Completa los detalles para preparar la invitación';
    document.getElementById('btn-save-text').textContent = '💾 Guardar Cita';
    document.getElementById('btn-cancel-edit').classList.add('hidden');

    const isHiddenToggle = document.getElementById('event-is-hidden');
    const secretFields = document.getElementById('secret-fields-container');
    const toggleIcon = document.getElementById('toggle-state-icon');

    if (isHiddenToggle) isHiddenToggle.checked = false;
    if (secretFields) secretFields.classList.add('hidden');
    if (toggleIcon) toggleIcon.textContent = '🔓';

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('event-date');
    if (dateInput) dateInput.value = today;
  }

  editEvent(eventId) {
    sounds.playPop();
    const events = getEvents();
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    this.editingEventId = eventId;
    document.getElementById('event-form-id').value = event.id;
    document.getElementById('event-title').value = event.title || '';
    document.getElementById('event-badge').value = event.badge || '';
    document.getElementById('event-date').value = event.date || '';
    document.getElementById('event-time').value = event.time || '19:30';
    document.getElementById('event-location').value = event.location || '';
    document.getElementById('event-dress').value = event.dressCode || '';
    document.getElementById('event-desc').value = event.description || '';
    document.getElementById('event-hint').value = event.secretHint || '';

    // Cita oculta
    const isHidden = !!event.isHidden;
    const isHiddenToggle = document.getElementById('event-is-hidden');
    const secretFields = document.getElementById('secret-fields-container');
    const toggleIcon = document.getElementById('toggle-state-icon');

    if (isHiddenToggle) isHiddenToggle.checked = isHidden;
    if (secretFields) secretFields.classList.toggle('hidden', !isHidden);
    if (toggleIcon) toggleIcon.textContent = isHidden ? '🔒' : '🔓';

    document.getElementById('event-secret-code').value = event.secretCode || '';
    document.getElementById('event-secret-clue').value = event.secretClue || '';

    // Encabezado de modo edición
    document.getElementById('form-mode-icon').textContent = '✏️';
    document.getElementById('form-mode-title').textContent = `Editar Cita #${event.id}`;
    document.getElementById('form-mode-desc').textContent = `Modificando: "${event.title}"`;
    document.getElementById('btn-save-text').textContent = 'Actualizar Cita';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');

    // Desplazar suavemente hacia el formulario
    const formSection = document.querySelector('.admin-form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ------------------------------------------------------------------------------
  // 3. RENDERIZADO Y ACTUALIZACIÓN DE DATOS
  // ------------------------------------------------------------------------------
  refreshData() {
    const events = getEvents();
    const total = events.length;
    const hiddenCount = events.filter(e => e.isHidden).length;
    const publicCount = total - hiddenCount;
    const acceptedCount = events.filter(e => e.accepted).length;

    // Actualizar contadores
    const elTotal = document.getElementById('stat-total-events');
    const elPublic = document.getElementById('stat-public-events');
    const elSecret = document.getElementById('stat-secret-events');
    const elAccepted = document.getElementById('stat-accepted-events');

    if (elTotal) elTotal.textContent = total;
    if (elPublic) elPublic.textContent = publicCount;
    if (elSecret) elSecret.textContent = hiddenCount;
    if (elAccepted) elAccepted.textContent = acceptedCount;

    const elCountAll = document.getElementById('count-all');
    const elCountPublic = document.getElementById('count-public');
    const elCountHidden = document.getElementById('count-hidden');

    if (elCountAll) elCountAll.textContent = total;
    if (elCountPublic) elCountPublic.textContent = publicCount;
    if (elCountHidden) elCountHidden.textContent = hiddenCount;

    // Filtrar según pestaña activa
    let filteredEvents = events;
    if (this.currentFilter === 'public') {
      filteredEvents = events.filter(e => !e.isHidden);
    } else if (this.currentFilter === 'hidden') {
      filteredEvents = events.filter(e => e.isHidden);
    }

    this.renderEventsList(filteredEvents);
  }

  renderEventsList(events) {
    const container = document.getElementById('admin-events-list');
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">🌻</div>
          <h3>No hay citas en esta categoría</h3>
          <p>Usa el formulario de la izquierda para planificar un nuevo momento romántico.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(event => {
      const isAccepted = event.accepted;
      const isHidden = event.isHidden;
      const dateFormatted = this.formatDate(event.date);

      return `
        <div class="admin-event-card ${isHidden ? 'admin-card-secret' : ''} ${isAccepted ? 'admin-card-accepted' : ''}" data-id="${event.id}">
          <div class="admin-card-top">
            <div class="admin-badge-group">
              <span class="badge-event ${isHidden ? 'badge-secret' : ''}">${event.badge || `CITA #${event.id}`}</span>
              ${isHidden ? `
                <span class="status-badge-secret">🔒 Oculta / Secreta</span>
              ` : `
                <span class="status-badge-public">💌 Pública</span>
              `}
            </div>
            <div class="admin-rsvp-tag">
              ${isAccepted ? `
                <span class="rsvp-accepted">💖 Aceptada por Adi</span>
              ` : `
                <span class="rsvp-pending">⏳ Invitación Pendiente</span>
              `}
            </div>
          </div>

          <h3 class="admin-card-title">${event.title}</h3>
          <p class="admin-card-desc">${event.description}</p>

          <div class="admin-meta-grid">
            <div class="admin-meta-item">
              <span class="meta-icon">📅</span>
              <span>${dateFormatted} (${event.time || '19:30'} hrs)</span>
            </div>
            <div class="admin-meta-item">
              <span class="meta-icon">📍</span>
              <span>${event.location}</span>
            </div>
            <div class="admin-meta-item">
              <span class="meta-icon">👗</span>
              <span>${event.dressCode}</span>
            </div>
            ${event.secretHint ? `
              <div class="admin-meta-item">
                <span class="meta-icon">🤫</span>
                <span style="font-style: italic;">${event.secretHint}</span>
              </div>
            ` : ''}
          </div>

          ${isHidden ? `
            <div class="admin-secret-info-box">
              <div class="secret-info-title">🔒 Configuración de Cita Oculta:</div>
              <div class="secret-info-row">
                <strong>Palabra mágica para Adi:</strong> 
                <code>${event.secretCode || '(Sin palabra requerida, revela al pulsar)'}</code>
              </div>
              ${event.secretClue ? `
                <div class="secret-info-row">
                  <strong>Pista visible para ella:</strong> 
                  <em>"${event.secretClue}"</em>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- BARRA DE ACCIONES RÁPIDAS -->
          <div class="admin-card-actions">
            <!-- Alternar Visibilidad -->
            <button class="btn-action-icon btn-toggle-visibility" data-id="${event.id}" title="${isHidden ? 'Hacer pública esta cita' : 'Ocultar esta cita (Hacer secreta)'}">
              <span>${isHidden ? '🔓 Hacer Pública' : '🔒 Hacer Oculta'}</span>
            </button>

            <!-- Editar -->
            <button class="btn-action-icon btn-edit-event" data-id="${event.id}" title="Editar contenido">
              <span>✏️ Editar</span>
            </button>

            <!-- Alternar RSVP (Simular Aceptación) -->
            <button class="btn-action-icon btn-toggle-rsvp" data-id="${event.id}" title="${isAccepted ? 'Marcar como pendiente' : 'Marcar como aceptada'}">
              <span>${isAccepted ? '↩️ Marcar Pendiente' : '💖 Marcar Aceptada'}</span>
            </button>

            <!-- Eliminar -->
            <button class="btn-action-icon btn-action-delete btn-delete-event" data-id="${event.id}" title="Eliminar cita">
              <span>🗑️ Eliminar</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.attachCardEventListeners(container);
  }

  attachCardEventListeners(container) {
    // Alternar visibilidad
    container.querySelectorAll('.btn-toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playPop();
        const eventId = parseInt(btn.dataset.id);
        const events = getEvents();
        const event = events.find(e => e.id === eventId);
        if (event) {
          const updated = updateEvent(eventId, { isHidden: !event.isHidden });
          this.showToast(updated.isHidden ? 'La cita ahora es secreta / oculta 🔒' : 'La cita ahora es visible públicamente 💌');
          this.refreshData();
        }
      });
    });

    // Editar
    container.querySelectorAll('.btn-edit-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = parseInt(btn.dataset.id);
        this.editEvent(eventId);
      });
    });

    // Alternar RSVP
    container.querySelectorAll('.btn-toggle-rsvp').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playPop();
        const eventId = parseInt(btn.dataset.id);
        const events = getEvents();
        const event = events.find(e => e.id === eventId);
        if (event) {
          updateEventRSVP(eventId, !event.accepted);
          if (!event.accepted && this.petals) {
            this.petals.triggerBurst(window.innerWidth / 2, window.innerHeight / 2, 40);
          }
          this.refreshData();
        }
      });
    });

    // Eliminar
    container.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = parseInt(btn.dataset.id);
        const events = getEvents();
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        const confirmMsg = `¿Estás seguro de que deseas eliminar "${event.title}"? Esta acción no se puede deshacer.`;
        if (confirm(confirmMsg)) {
          sounds.playPop();
          deleteEvent(eventId);
          if (this.editingEventId === eventId) this.resetForm();
          this.showToast('Cita eliminada correctamente 🗑️');
          this.refreshData();
        }
      });
    });
  }

  // ------------------------------------------------------------------------------
  // 4. FILTROS
  // ------------------------------------------------------------------------------
  bindFilterEvents() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sounds.playPop();
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFilter = tab.dataset.filter || 'all';
        this.refreshData();
      });
    });
  }

  // ------------------------------------------------------------------------------
  // 5. MODAL CAMBIAR PIN
  // ------------------------------------------------------------------------------
  bindModalEvents() {
    const btnChangePin = document.getElementById('btn-change-pin');
    const modalChangePin = document.getElementById('modal-change-pin');
    const formChangePin = document.getElementById('change-pin-form');
    const errorMsg = document.getElementById('change-pin-error');

    // Cierre de modales nativos
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal && typeof modal.close === 'function') modal.close();
      });
    });

    if (btnChangePin && modalChangePin) {
      btnChangePin.addEventListener('click', () => {
        sounds.playPop();
        if (formChangePin) formChangePin.reset();
        if (errorMsg) errorMsg.classList.add('hidden');
        if (typeof modalChangePin.showModal === 'function') modalChangePin.showModal();
      });
    }

    if (formChangePin) {
      formChangePin.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPin = (document.getElementById('pin-current').value || '').trim();
        const newPin = (document.getElementById('pin-new').value || '').trim();
        const confirmPin = (document.getElementById('pin-confirm').value || '').trim();

        if (currentPin !== getAdminPIN()) {
          sounds.playPop();
          errorMsg.textContent = 'El PIN actual no es correcto.';
          errorMsg.classList.remove('hidden');
          return;
        }

        if (newPin.length < 4) {
          sounds.playPop();
          errorMsg.textContent = 'El nuevo PIN debe tener al menos 4 caracteres.';
          errorMsg.classList.remove('hidden');
          return;
        }

        if (newPin !== confirmPin) {
          sounds.playPop();
          errorMsg.textContent = 'La confirmación del PIN no coincide.';
          errorMsg.classList.remove('hidden');
          return;
        }

        setAdminPIN(newPin);
        sounds.playCelebration();
        alert('🎉 ¡PIN de seguridad actualizado con éxito!');
        if (typeof modalChangePin.close === 'function') modalChangePin.close();
      });
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return 'Fecha por definir';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  }

  showToast(message) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'admin-toast';
      toast.className = 'admin-toast-banner';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new AdminDashboard();
});
