// ==============================================================================
// COMPONENTE: ÁLBUM DE RECUERDOS DE NUESTRAS SALIDAS (SUPABASE + GOOGLE DRIVE)
// Muestra juntos los recuerdos guardados en este navegador, los de Supabase
// Storage y las fotos de la carpeta de Google Drive.
// ==============================================================================

import { getMemories, deleteMemory } from '../utils/storage.js';
import { sounds } from '../utils/audio.js';
import { icons } from '../utils/icons.js';

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
    this.cloudStatus = { connected: false };
    this.cloudMemories = [];
    this.memories = [];
    this.init();
  }

  async init() {
    // Primero lo local (instantáneo), luego lo que haya en la nube
    await this.render();
    await this.refresh();

    // Al volver a la pestaña (p. ej. después de subir fotos desde la app de Drive), refrescar
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refresh();
    });
  }

  async refresh() {
    await Promise.all([this.loadFromDrive(), this.loadFromCloud()]);
    await this.render();
  }

  async loadFromCloud() {
    try {
      const res = await fetch('/api/memories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.cloudStatus = data;
      this.cloudMemories = data.memories || [];
    } catch (e) {
      console.warn('API de recuerdos (Supabase) no disponible:', e);
      this.cloudStatus = { connected: false };
      this.cloudMemories = [];
    }
  }

  async loadFromDrive() {
    try {
      const webhook = (localStorage.getItem('propuesta_drive_webhook_url') || '').trim();
      const folderId = (localStorage.getItem('propuesta_drive_folder_id') || '').trim();
      const params = new URLSearchParams();
      if (webhook) params.set('webhookUrl', webhook);
      if (folderId) params.set('folderId', folderId);
      const url = '/api/drive' + (params.toString() ? `?${params.toString()}` : '');

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.driveStatus = data;
      this.driveMemories = data.memories || [];
    } catch (e) {
      console.warn('API Drive no disponible en este entorno, operando en modo local:', e);
      this.driveStatus = { connected: false, mode: 'local', message: '' };
      this.driveMemories = [];
    }
  }

  // Une recuerdos locales, de Supabase y de Drive sin duplicar los que ya se sincronizaron
  async getAllMemories() {
    const local = await getMemories();
    const remoteByKey = new Map([
      ...this.cloudMemories.map(m => [`sb:${m.storageId}`, m]),
      ...this.driveMemories.map(m => [`drive:${m.driveFileId}`, m])
    ]);

    const merged = local.map(memory => {
      const key = memory.storageId ? `sb:${memory.storageId}` : memory.driveFileId ? `drive:${memory.driveFileId}` : null;
      const remote = key && remoteByKey.get(key);
      if (!remote) return memory;
      remoteByKey.delete(key);
      // Conservar la copia local para mostrarla al instante en este dispositivo
      return { ...remote, id: memory.id, imageBase64: memory.imageBase64 };
    });

    const all = [...merged, ...remoteByKey.values()];
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
        <span>Sincronizando fotos... ${icons.cloud('ui-icon-blue')}</span>
      `;
    } else if (this.cloudStatus.connected || this.driveStatus.connected) {
      const count = this.cloudMemories.length + this.driveMemories.length;
      badgeEl.className = 'drive-badge drive-connected';
      badgeEl.innerHTML = `
        <span class="status-dot green"></span>
        <span>Álbum en la nube · ${count} fotos ${icons.cloud('ui-icon-blue')}</span>
      `;
    } else {
      badgeEl.className = 'drive-badge drive-local';
      badgeEl.innerHTML = `
        <span class="status-dot green"></span>
        <span>Álbum de Recuerdos ${icons.camera('ui-icon-rose')}</span>
      `;
    }
    badgeEl.title = this.driveStatus.error || this.driveStatus.message || 'Álbum de recuerdos de nuestras citas';
  }

  async render() {
    if (!this.container) return;
    this.memories = await this.getAllMemories();
    const memories = this.memories;

    this.container.innerHTML = `
      <div class="gallery-header-bar">
        <div>
          <h2 class="section-title">Álbum de Nuestras Salidas ${icons.camera('ui-icon-blue')}</h2>
          <p class="section-subtitle">Cada foto guarda una sonrisa, una aventura y un momento especial que atesoro a tu lado.</p>
        </div>
        <div class="gallery-actions-bar">
          <div id="drive-status-badge" class="drive-badge drive-local"></div>
          <button id="btn-add-memory" class="btn-primary">
            <span>${icons.plus('ui-icon-white')} Añadir nuevo recuerdo</span>
          </button>
        </div>
      </div>

      <div class="memories-grid" id="memories-grid">
        ${memories.length === 0 ? `
          <div class="empty-gallery-card glass-panel">
            <span class="empty-icon">${icons.camera('ui-icon-gold ui-icon-xl')}</span>
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
              <span class="drive-sync-indicator" title="Guardada en la nube">${icons.cloud('ui-icon-blue')} Nube</span>
            ` : ''}
          </div>
          <div class="polaroid-meta">
            <h4 class="polaroid-title">${title}</h4>
            <div class="polaroid-tags">
              <span class="polaroid-date">${icons.calendar('ui-icon-blue')} ${escapeHtml(memory.date || 'Recuerdo especial')}</span>
              ${memory.location ? `<span class="polaroid-location">${icons.location('ui-icon-rose')} ${escapeHtml(memory.location)}</span>` : ''}
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

    // Clic en badge de Google Drive: refrescar fotos
    const badgeEl = document.getElementById('drive-status-badge');
    if (badgeEl) {
      badgeEl.addEventListener('click', () => {
        sounds.playPop();
        this.refresh();
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
    if (date) date.innerHTML = memory.date ? `${icons.calendar('ui-icon-blue')} ${escapeHtml(memory.date)}` : '';
    if (loc) loc.innerHTML = memory.location ? `${icons.location('ui-icon-rose')} ${escapeHtml(memory.location)}` : '';
    if (caption) caption.textContent = memory.caption || '';

    if (driveBtn) {
      if (memory.driveUrl) {
        driveBtn.href = memory.driveUrl;
        driveBtn.classList.remove('hidden');
      } else {
        driveBtn.classList.add('hidden');
      }
    }

    // Las fotos de Drive se administran desde la carpeta; aquí se borran las locales y las de Supabase
    if (deleteBtn) {
      if (memory.driveFileId) {
        deleteBtn.classList.add('hidden');
        deleteBtn.onclick = null;
      } else {
        deleteBtn.classList.remove('hidden');
        deleteBtn.onclick = async () => {
          if (!confirm('¿Deseas eliminar este recuerdo de la galería?')) return;
          if (memory.storageId) {
            const res = await fetch(`/api/memories?id=${encodeURIComponent(memory.storageId)}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 404) {
              alert('No se pudo borrar la foto de la nube. Inténtalo de nuevo.');
              return;
            }
          }
          await deleteMemory(memory.id);
          modal.close();
          await this.refresh();
        };
      }
    }

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }
}
