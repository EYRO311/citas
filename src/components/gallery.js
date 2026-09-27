// ==============================================================================
// COMPONENTE: ÁLBUM DE RECUERDOS DE NUESTRAS SALIDAS (CON GOOGLE DRIVE)
// Muestra juntos los recuerdos guardados en este navegador y las fotos de la
// carpeta de Google Drive (subidas desde la app o directo desde Drive).
// ==============================================================================

import { getMemories, deleteMemory } from '../utils/storage.js';
import { sounds } from '../utils/audio.js';

const FALLBACK_IMG = '/img/fondo.jpg';

// Títulos y mensajes pueden venir de Drive: escaparlos antes de pintarlos
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

export class DateMemoriesGallery {
  constructor(containerId = 'gallery-container') {
    this.container = document.getElementById(containerId);
    this.driveStatus = { connected: false, mode: 'loading', message: '' };
    this.driveMemories = [];
    this.memories = [];
    this.init();
  }

  async init() {
    // Primero lo local (instantáneo), luego lo que haya en Drive
    await this.render();
    await this.refreshFromDrive();

    // Al volver a la pestaña (p. ej. después de subir fotos desde la app de Drive), refrescar
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refreshFromDrive();
    });
  }

  async refreshFromDrive() {
    try {
      const res = await fetch('/api/drive');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.driveStatus = data;
      this.driveMemories = data.memories || [];
    } catch (e) {
      console.warn('API Drive no disponible en este entorno, operando en modo local:', e);
      this.driveStatus = { connected: false, mode: 'local', message: '' };
      this.driveMemories = [];
    }
    await this.render();
  }

  // Une recuerdos locales y de Drive sin duplicar los que ya se sincronizaron
  async getAllMemories() {
    const local = await getMemories();
    const remoteById = new Map(this.driveMemories.map(m => [m.driveFileId, m]));

    const merged = local.map(memory => {
      const remote = memory.driveFileId && remoteById.get(memory.driveFileId);
      if (!remote) return memory;
      remoteById.delete(memory.driveFileId);
      // Conservar la copia local para mostrarla al instante en este dispositivo
      return { ...remote, id: memory.id, imageBase64: memory.imageBase64 };
    });

    const all = [...merged, ...remoteById.values()];
    all.sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || (b.timestamp || 0) - (a.timestamp || 0)
    );
    return all;
  }

  updateDriveStatusBadge() {
    const badgeEl = document.getElementById('drive-status-badge');
    if (!badgeEl) return;

    if (this.driveStatus.mode === 'loading') {
      badgeEl.className = 'drive-badge drive-local';
      badgeEl.innerHTML = `
        <span class="status-dot yellow"></span>
        <span>Buscando fotos en Drive... ☁️</span>
      `;
    } else if (this.driveStatus.connected) {
      badgeEl.className = 'drive-badge drive-connected';
      badgeEl.innerHTML = `
        <span class="status-dot green"></span>
        <span>Google Drive conectado · ${this.driveMemories.length} fotos ☁️✨</span>
      `;
    } else {
      badgeEl.className = 'drive-badge drive-local';
      badgeEl.innerHTML = `
        <span class="status-dot yellow"></span>
        <span>Álbum Local Activo (Clic para conectar Drive) 💾</span>
      `;
    }
    badgeEl.title = this.driveStatus.error || this.driveStatus.message || 'Estado de la conexión con Google Drive';
  }

  async render() {
    if (!this.container) return;
    this.memories = await this.getAllMemories();
    const memories = this.memories;

    this.container.innerHTML = `
      <div class="gallery-header-bar">
        <div>
          <h2 class="section-title">Álbum de Nuestras Salidas 📸🌻</h2>
          <p class="section-subtitle">Cada foto guarda una sonrisa, una aventura y un momento especial que atesoro a tu lado.</p>
        </div>
        <div class="gallery-actions-bar">
          <div id="drive-status-badge" class="drive-badge drive-local"></div>
          <button id="btn-add-memory" class="btn-primary">
            <span>📸 Añadir nuevo recuerdo</span>
          </button>
        </div>
      </div>

      <div class="memories-grid" id="memories-grid">
        ${memories.length === 0 ? `
          <div class="empty-gallery-card glass-panel">
            <span class="empty-icon">🌻</span>
            <h3>Aún no hay fotos añadidas</h3>
            <p>Toca "Añadir nuevo recuerdo" o sube fotos directo a nuestra carpeta de Google Drive y aparecerán aquí.</p>
          </div>
        ` : memories.map(memory => this.renderMemoryCard(memory)).join('')}
      </div>
    `;

    this.updateDriveStatusBadge();
    this.attachEventListeners();
  }

  renderMemoryCard(memory) {
    const displayImg = memory.imageBase64 || memory.thumbUrl || memory.imageUrl || FALLBACK_IMG;
    const title = escapeHtml(memory.title);

    return `
      <div class="polaroid-card" data-memory-id="${escapeHtml(memory.id)}">
        <div class="polaroid-inner">
          <div class="polaroid-photo-frame">
            <img src="${escapeHtml(displayImg)}" alt="${title}" loading="lazy"
                 onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
            ${memory.driveUrl ? `
              <span class="drive-sync-indicator" title="Guardada en Google Drive">☁️ Drive</span>
            ` : ''}
          </div>
          <div class="polaroid-meta">
            <h4 class="polaroid-title">${title}</h4>
            <div class="polaroid-tags">
              <span class="polaroid-date">📅 ${escapeHtml(memory.date || 'Recuerdo especial')}</span>
              ${memory.location ? `<span class="polaroid-location">📍 ${escapeHtml(memory.location)}</span>` : ''}
            </div>
            <p class="polaroid-caption">${escapeHtml(memory.caption || '')}</p>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Botón añadir recuerdo
    const addBtn = document.getElementById('btn-add-memory');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        sounds.playPop();
        this.openUploadModal();
      });
    }

    // Clic en badge de Google Drive: refrescar y abrir modal de información
    const badgeEl = document.getElementById('drive-status-badge');
    if (badgeEl) {
      badgeEl.addEventListener('click', () => {
        sounds.playPop();
        this.refreshFromDrive();
        this.openDriveModal();
      });
    }

    // Clic en cada polaroid para ver detalle / lightbox
    this.container.querySelectorAll('.polaroid-card').forEach(card => {
      card.addEventListener('click', () => {
        const memory = this.memories.find(m => m.id === card.dataset.memoryId);
        if (memory) {
          sounds.playSparkle();
          this.openLightbox(memory);
        }
      });
    });
  }

  openUploadModal() {
    const modal = document.getElementById('modal-upload-memory');
    if (!modal) return;

    // Resetear formulario
    const form = document.getElementById('upload-memory-form');
    if (form) form.reset();

    const preview = document.getElementById('image-upload-preview');
    if (preview) {
      preview.src = '';
      preview.classList.add('hidden');
    }
    const dropzoneText = document.getElementById('dropzone-prompt');
    if (dropzoneText) dropzoneText.classList.remove('hidden');

    const dateInput = document.getElementById('memory-date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }

  openLightbox(memory) {
    const modal = document.getElementById('modal-lightbox');
    if (!modal) return;

    const img = document.getElementById('lightbox-img');
    const title = document.getElementById('lightbox-title');
    const date = document.getElementById('lightbox-date');
    const loc = document.getElementById('lightbox-location');
    const caption = document.getElementById('lightbox-caption');
    const driveBtn = document.getElementById('lightbox-drive-btn');
    const deleteBtn = document.getElementById('lightbox-delete-btn');

    if (img) {
      img.onerror = () => { img.onerror = null; img.src = FALLBACK_IMG; };
      img.src = memory.imageBase64 || memory.imageUrl || FALLBACK_IMG;
    }
    if (title) title.textContent = memory.title;
    if (date) date.textContent = memory.date ? `📅 ${memory.date}` : '';
    if (loc) loc.textContent = memory.location ? `📍 ${memory.location}` : '';
    if (caption) caption.textContent = memory.caption || '';

    if (driveBtn) {
      if (memory.driveUrl) {
        driveBtn.href = memory.driveUrl;
        driveBtn.classList.remove('hidden');
      } else {
        driveBtn.classList.add('hidden');
      }
    }

    // Las fotos de Drive se administran desde la carpeta; aquí solo se borran las locales
    if (deleteBtn) {
      if (memory.driveFileId) {
        deleteBtn.classList.add('hidden');
        deleteBtn.onclick = null;
      } else {
        deleteBtn.classList.remove('hidden');
        deleteBtn.onclick = async () => {
          if (confirm('¿Deseas eliminar este recuerdo de la galería?')) {
            await deleteMemory(memory.id);
            modal.close();
            await this.render();
          }
        };
      }
    }

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }

  openDriveModal() {
    const modal = document.getElementById('modal-drive-info');
    if (!modal) return;
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }
}
