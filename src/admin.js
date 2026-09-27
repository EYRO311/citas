// ==============================================================================
// PANEL DE ADMINISTRACIÓN: GESTIÓN DE CITAS, EVENTOS OCULTOS & GOOGLE DRIVE 🌻✨
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

// Código fuente de Google Apps Script para copiarlo al portapapeles
const CODE_GS_CONTENT = `// ==============================================================================
// ÁLBUM DE NUESTRAS SALIDAS — Puente con Google Drive (Google Apps Script)
// ==============================================================================

const FOLDER_ID = 'PEGA_AQUI_EL_ID_DE_TU_CARPETA';

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET ?action=list → fotos de la carpeta
function doGet() {
  try {
    const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
    const out = [];

    while (files.hasNext()) {
      const file = files.next();
      if (file.isTrashed() || file.getMimeType().indexOf('image/') !== 0) continue;
      out.push({
        id: file.getId(),
        name: file.getName(),
        description: file.getDescription() || '',
        createdTime: file.getDateCreated().toISOString(),
        webViewLink: file.getUrl()
      });
    }

    return json({ files: out });
  } catch (err) {
    return json({ error: String(err) });
  }
}

// POST { name, title, date, location, caption, mimeType, base64 } → sube la foto
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(body.base64),
      body.mimeType || 'image/jpeg',
      body.name || ('recuerdo_' + Date.now() + '.jpg')
    );

    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setDescription(JSON.stringify({
      title: body.title || '',
      date: body.date || '',
      location: body.location || '',
      caption: body.caption || ''
    }));

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {}

    return json({ fileId: file.getId(), fileUrl: file.getUrl() });
  } catch (err) {
    return json({ error: String(err) });
  }
}`;

class AdminDashboard {
  constructor() {
    this.currentTab = 'events';
    this.currentFilter = 'all';
    this.editingEventId = null;
    this.petals = null;
    this.driveStatus = { connected: false, mode: 'local', memories: [] };
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
    this.bindNavEvents();
    this.bindFormEvents();
    this.bindFilterEvents();
    this.bindDriveEvents();
    this.bindModalEvents();
    this.initCodeGsPreview();

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
      this.checkDriveStatus(false);
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
  // 2. NAVEGACIÓN ENTRE PESTAÑAS (CITAS VS GOOGLE DRIVE)
  // ------------------------------------------------------------------------------
  bindNavEvents() {
    const btnTabEvents = document.getElementById('tab-btn-events');
    const btnTabDrive = document.getElementById('tab-btn-drive');
    const statCardDrive = document.getElementById('stat-card-drive-click');

    const switchTab = (tabName) => {
      sounds.playPop();
      this.currentTab = tabName;

      const eventsSec = document.getElementById('section-events-container');
      const driveSec = document.getElementById('section-drive-container');

      if (tabName === 'events') {
        if (btnTabEvents) btnTabEvents.classList.add('active');
        if (btnTabDrive) btnTabDrive.classList.remove('active');
        if (eventsSec) eventsSec.classList.remove('hidden');
        if (driveSec) driveSec.classList.add('hidden');
      } else {
        if (btnTabDrive) btnTabDrive.classList.add('active');
        if (btnTabEvents) btnTabEvents.classList.remove('active');
        if (driveSec) driveSec.classList.remove('hidden');
        if (eventsSec) eventsSec.classList.add('hidden');
        this.checkDriveStatus(false);
      }
    };

    if (btnTabEvents) btnTabEvents.addEventListener('click', () => switchTab('events'));
    if (btnTabDrive) btnTabDrive.addEventListener('click', () => switchTab('drive'));
    if (statCardDrive) statCardDrive.addEventListener('click', () => switchTab('drive'));
  }

  // ------------------------------------------------------------------------------
  // 3. FORMULARIO: CREAR Y EDITAR CITAS
  // ------------------------------------------------------------------------------
  bindFormEvents() {
    const isHiddenToggle = document.getElementById('event-is-hidden');
    const secretFields = document.getElementById('secret-fields-container');
    const toggleIcon = document.getElementById('toggle-state-icon');
    const form = document.getElementById('event-editor-form');
    const cancelEditBtn = document.getElementById('btn-cancel-edit');

    if (isHiddenToggle) {
      isHiddenToggle.addEventListener('change', () => {
        sounds.playPop();
        const checked = isHiddenToggle.checked;
        if (secretFields) secretFields.classList.toggle('hidden', !checked);
        if (toggleIcon) toggleIcon.textContent = checked ? '🔒' : '🔓';
      });
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        this.resetForm();
      });
    }

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
      const eventId = parseInt(idField.value);
      updateEvent(eventId, eventPayload);
      sounds.playCelebration();
      this.showToast('¡Cita actualizada exitosamente! ✨');
    } else {
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

    const isHidden = !!event.isHidden;
    const isHiddenToggle = document.getElementById('event-is-hidden');
    const secretFields = document.getElementById('secret-fields-container');
    const toggleIcon = document.getElementById('toggle-state-icon');

    if (isHiddenToggle) isHiddenToggle.checked = isHidden;
    if (secretFields) secretFields.classList.toggle('hidden', !isHidden);
    if (toggleIcon) toggleIcon.textContent = isHidden ? '🔒' : '🔓';

    document.getElementById('event-secret-code').value = event.secretCode || '';
    document.getElementById('event-secret-clue').value = event.secretClue || '';

    document.getElementById('form-mode-icon').textContent = '✏️';
    document.getElementById('form-mode-title').textContent = `Editar Cita #${event.id}`;
    document.getElementById('form-mode-desc').textContent = `Modificando: "${event.title}"`;
    document.getElementById('btn-save-text').textContent = 'Actualizar Cita';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');

    const formSection = document.querySelector('.admin-form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ------------------------------------------------------------------------------
  // 4. RENDERIZADO Y ACTUALIZACIÓN DE CITAS
  // ------------------------------------------------------------------------------
  refreshData() {
    const events = getEvents();
    const total = events.length;
    const hiddenCount = events.filter(e => e.isHidden).length;
    const publicCount = total - hiddenCount;
    const acceptedCount = events.filter(e => e.accepted).length;

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
            <button class="btn-action-icon btn-toggle-visibility" data-id="${event.id}" title="${isHidden ? 'Hacer pública esta cita' : 'Ocultar esta cita (Hacer secreta)'}">
              <span>${isHidden ? '🔓 Hacer Pública' : '🔒 Hacer Oculta'}</span>
            </button>

            <button class="btn-action-icon btn-edit-event" data-id="${event.id}" title="Editar contenido">
              <span>✏️ Editar</span>
            </button>

            <button class="btn-action-icon btn-toggle-rsvp" data-id="${event.id}" title="${isAccepted ? 'Marcar como pendiente' : 'Marcar como aceptada'}">
              <span>${isAccepted ? '↩️ Marcar Pendiente' : '💖 Marcar Aceptada'}</span>
            </button>

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

    container.querySelectorAll('.btn-edit-event').forEach(btn => {
      btn.addEventListener('click', () => {
        const eventId = parseInt(btn.dataset.id);
        this.editEvent(eventId);
      });
    });

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
  // 5. GESTIÓN Y CONEXIÓN DE GOOGLE DRIVE EN ADMIN
  // ------------------------------------------------------------------------------
  bindDriveEvents() {
    const webhookInput = document.getElementById('drive-webhook-input');
    const folderInput = document.getElementById('drive-folder-input');
    const driveForm = document.getElementById('drive-settings-form');
    const btnTestDrive = document.getElementById('btn-test-drive');
    const btnClearDrive = document.getElementById('btn-clear-drive');
    const btnCopyCodeGs = document.getElementById('btn-copy-code-gs');

    // Cargar valores guardados en localStorage
    if (webhookInput) {
      webhookInput.value = localStorage.getItem('propuesta_drive_webhook_url') || '';
    }
    if (folderInput) {
      folderInput.value = localStorage.getItem('propuesta_drive_folder_id') || '';
    }

    // Botón probar conexión
    if (btnTestDrive) {
      btnTestDrive.addEventListener('click', () => {
        sounds.playPop();
        this.checkDriveStatus(true);
      });
    }

    // Guardar configuración de Drive
    if (driveForm) {
      driveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const webhookUrl = (webhookInput?.value || '').trim();
        let folderVal = (folderInput?.value || '').trim();

        // Extraer ID si pegó la URL completa de Drive
        const folderMatch = folderVal.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (folderMatch) folderVal = folderMatch[1];

        if (webhookUrl) {
          localStorage.setItem('propuesta_drive_webhook_url', webhookUrl);
        } else {
          localStorage.removeItem('propuesta_drive_webhook_url');
        }

        if (folderVal) {
          localStorage.setItem('propuesta_drive_folder_id', folderVal);
        } else {
          localStorage.removeItem('propuesta_drive_folder_id');
        }

        sounds.playCelebration();
        this.showToast('Configuración de Google Drive guardada 💾');
        this.checkDriveStatus(true);
      });
    }

    // Desconectar Drive
    if (btnClearDrive) {
      btnClearDrive.addEventListener('click', () => {
        if (confirm('¿Deseas desconectar Google Drive? La app volverá al modo de álbum local.')) {
          sounds.playPop();
          localStorage.removeItem('propuesta_drive_webhook_url');
          localStorage.removeItem('propuesta_drive_folder_id');
          if (webhookInput) webhookInput.value = '';
          if (folderInput) folderInput.value = '';
          this.showToast('Google Drive desconectado. Modo local activo.');
          this.checkDriveStatus(true);
        }
      });
    }

    // Copiar código de Code.gs
    if (btnCopyCodeGs) {
      btnCopyCodeGs.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(CODE_GS_CONTENT);
          sounds.playCelebration();
          const feedback = document.getElementById('copy-code-feedback');
          if (feedback) {
            feedback.classList.remove('hidden');
            setTimeout(() => feedback.classList.add('hidden'), 3500);
          }
          this.showToast('¡Código copiado al portapapeles! 📋✨');
        } catch {
          alert('No se pudo copiar automáticamente. Por favor selecciónalo desde la vista previa de abajo.');
        }
      });
    }

    // Prueba de subida de imagen a Drive
    this.setupTestDriveUpload();
  }

  initCodeGsPreview() {
    const previewEl = document.getElementById('preview-code-gs');
    if (previewEl) {
      previewEl.textContent = CODE_GS_CONTENT;
    }
  }

  async checkDriveStatus(showToastFeedback = false) {
    const banner = document.getElementById('drive-status-banner');
    const headline = document.getElementById('drive-status-headline');
    const detail = document.getElementById('drive-status-detail');
    const dot = document.getElementById('drive-status-indicator-dot');
    const modeTag = document.getElementById('drive-status-mode-tag');
    const navDot = document.getElementById('drive-nav-dot');
    const statDrive = document.getElementById('stat-drive-status');
    const countBadge = document.getElementById('drive-photos-count-badge');
    const openFolderBtn = document.getElementById('btn-open-drive-folder');

    // Obtener parámetros de localStorage
    const webhook = (localStorage.getItem('propuesta_drive_webhook_url') || '').trim();
    const folderId = (localStorage.getItem('propuesta_drive_folder_id') || '').trim();

    const params = new URLSearchParams();
    if (webhook) params.set('webhookUrl', webhook);
    if (folderId) params.set('folderId', folderId);
    const queryStr = params.toString() ? `?${params.toString()}` : '';

    if (headline) headline.textContent = 'Verificando conexión con Google Drive...';
    if (dot) dot.className = 'status-dot yellow';

    try {
      const res = await fetch(`/api/drive${queryStr}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.driveStatus = data;

      if (data.connected) {
        if (banner) {
          banner.className = 'drive-status-box drive-status-connected';
        }
        if (headline) headline.textContent = '¡Google Drive Conectado y Sincronizado! ☁️✨';
        if (dot) dot.className = 'status-dot green';
        if (navDot) navDot.className = 'status-dot-sm green';
        if (statDrive) statDrive.textContent = '🟢 Conectado';
        if (modeTag) modeTag.textContent = `Modo ${data.mode || 'Webhook'}`;
        if (detail) {
          detail.textContent = `Conexión exitosa. Se detectaron ${data.memories.length} fotos en tu carpeta de Drive listas para el álbum.`;
        }
        if (countBadge) countBadge.textContent = `${data.memories.length} fotos en Drive`;

        // Botón abrir carpeta
        if (openFolderBtn) {
          if (folderId) {
            openFolderBtn.href = `https://drive.google.com/drive/folders/${folderId}`;
            openFolderBtn.classList.remove('hidden');
          } else {
            openFolderBtn.classList.add('hidden');
          }
        }

        this.renderDrivePhotos(data.memories || []);
        if (showToastFeedback) this.showToast(`¡Conexión verificada! ${data.memories.length} fotos encontradas.`);
      } else {
        if (banner) {
          banner.className = 'drive-status-box drive-status-local';
        }
        if (headline) headline.textContent = 'Álbum en Modo Local (Sin Drive)';
        if (dot) dot.className = 'status-dot yellow';
        if (navDot) navDot.className = 'status-dot-sm yellow';
        if (statDrive) statDrive.textContent = '🟡 Local';
        if (modeTag) modeTag.textContent = 'Modo Local';
        if (detail) {
          detail.textContent = data.message || 'Las fotos se guardan en el navegador. Sigue los pasos de la derecha para conectar tu carpeta de Google Drive.';
        }
        if (countBadge) countBadge.textContent = '0 fotos en Drive';
        if (openFolderBtn) openFolderBtn.classList.add('hidden');
        this.renderDrivePhotos([]);
        if (showToastFeedback) this.showToast('Operando en modo local (sin Drive conectado).');
      }
    } catch (err) {
      if (banner) banner.className = 'drive-status-box drive-status-error';
      if (headline) headline.textContent = 'Error al consultar Google Drive';
      if (dot) dot.className = 'status-dot red';
      if (navDot) navDot.className = 'status-dot-sm red';
      if (statDrive) statDrive.textContent = '🔴 Error';
      if (detail) detail.textContent = `No se pudo conectar: ${err.message}. Verifica que la URL del Webhook sea correcta.`;
      if (showToastFeedback) this.showToast('Error al conectar con Google Drive ⚠️');
    }
  }

  renderDrivePhotos(memories) {
    const grid = document.getElementById('admin-drive-photos-grid');
    if (!grid) return;

    if (!memories || memories.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 24px 16px; color: #64748b;">
          <span style="font-size: 2rem; display: block; margin-bottom: 8px;">📷</span>
          <p style="font-weight: 600;">No hay fotos sincronizadas de Google Drive por el momento</p>
          <p style="font-size: 0.85rem; margin-top: 4px;">Las fotos que subas a la carpeta de Drive o mediante el formulario aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = memories.map(m => `
      <div class="admin-drive-photo-item">
        <img 
          src="${m.thumbUrl || m.imageUrl || '/img/fondo.jpg'}" 
          alt="${m.title || 'Foto de recuerdo'}" 
          class="admin-drive-photo-thumb" 
          loading="lazy" 
          onerror="this.src='/img/fondo.jpg';"
        />
        <div class="admin-drive-photo-info">
          <div class="admin-drive-photo-title" title="${m.title}">${m.title}</div>
          <div class="admin-drive-photo-meta">
            <span>${m.date || 'Sin fecha'}</span>
            ${m.driveUrl ? `<a href="${m.driveUrl}" target="_blank" rel="noopener" class="admin-drive-photo-link">Ver en Drive ↗</a>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  setupTestDriveUpload() {
    const btn = document.getElementById('btn-trigger-test-upload');
    const input = document.getElementById('drive-test-file-input');
    const status = document.getElementById('drive-test-upload-status');

    if (btn && input) {
      btn.addEventListener('click', () => input.click());

      input.addEventListener('change', async () => {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        if (status) {
          status.style.color = '#2563eb';
          status.textContent = '⏳ Subiendo foto de prueba a Drive...';
        }

        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result;
            const webhookUrl = localStorage.getItem('propuesta_drive_webhook_url') || undefined;
            const folderId = localStorage.getItem('propuesta_drive_folder_id') || undefined;

            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: file.name,
                title: 'Foto de prueba admin',
                date: new Date().toISOString().split('T')[0],
                location: 'Panel Admin',
                caption: 'Prueba de sincronización desde el panel de creador',
                mimeType: file.type || 'image/jpeg',
                imageBase64: base64,
                webhookUrl,
                folderId
              })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (status) {
              status.style.color = '#16a34a';
              status.textContent = '✅ ¡Foto subida exitosamente a Google Drive!';
            }
            sounds.playCelebration();
            this.showToast('¡Foto de prueba subida a Google Drive! ✨');
            setTimeout(() => this.checkDriveStatus(false), 800);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          if (status) {
            status.style.color = '#dc2626';
            status.textContent = `❌ Error: ${err.message}`;
          }
        }
      });
    }
  }

  // ------------------------------------------------------------------------------
  // 6. MODAL CAMBIAR PIN
  // ------------------------------------------------------------------------------
  bindModalEvents() {
    const btnChangePin = document.getElementById('btn-change-pin');
    const modalChangePin = document.getElementById('modal-change-pin');
    const formChangePin = document.getElementById('change-pin-form');
    const errorMsg = document.getElementById('change-pin-error');

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
