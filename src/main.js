// ==============================================================================
// PUNTO DE ENTRADA PRINCIPAL: PROPUESTA ROMÁNTICA PARA ADI 🌻💖
// ==============================================================================

import { PetalsCanvas } from './components/petals.js';
import { CountdownTimer } from './components/countdown.js';
import { EventsInvitations } from './components/events.js';
import { DateMemoriesGallery } from './components/gallery.js';
import { sounds } from './utils/audio.js';
import { getEvents, saveEvents, saveMemory } from './utils/storage.js';

// Estado global
let countdownInstance = null;
let eventsInstance = null;
let galleryInstance = null;
let isVideoModeActive = false;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar Canvas de pétalos y corazones
  window.petalsInstance = new PetalsCanvas('petals-canvas');

  // 2. Inicializar Cronómetro regresivo
  countdownInstance = new CountdownTimer('countdown-section');

  // 3. Inicializar Invitaciones
  eventsInstance = new EventsInvitations('events-container', () => {
    // Al cambiar un RSVP, recalcular fecha más cercana
    if (countdownInstance) countdownInstance.calculateNextDate();
  });

  // 4. Inicializar Galería de recuerdos
  galleryInstance = new DateMemoriesGallery('gallery-container');

  // 5. Configurar controles y eventos
  setupHeroEnvelope();
  setupModalDismissals();
  setupUploadMemoryForm();
  setupDateEditorForm();
  setupEventEditorForm();
  setupFinalCelebrationButton();
});

// ==============================================================================
// 1. SOBRE INTERACTIVO (A + E)
// ==============================================================================
function setupHeroEnvelope() {
  const envelope = document.getElementById('envelope-trigger');
  const letterModal = document.getElementById('modal-letter');

  if (envelope && letterModal) {
    const openLetter = (e) => {
      sounds.playSparkle();
      envelope.classList.add('envelope-opened');

      // Centro del sobre para la explosión romántica de pétalos/globos
      const rect = envelope.getBoundingClientRect();
      const burstX = e && e.clientX ? e.clientX : rect.left + rect.width / 2;
      const burstY = e && e.clientY ? e.clientY : rect.top + rect.height / 2;

      if (window.petalsInstance) {
        window.petalsInstance.triggerBurst(burstX, burstY, 45);
      }

      setTimeout(() => {
        if (typeof letterModal.showModal === 'function') {
          letterModal.showModal();
        } else {
          letterModal.setAttribute('open', '');
        }
      }, 180);
    };

    envelope.addEventListener('click', openLetter);
    envelope.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLetter(e);
      }
    });

    // Al cerrar la carta, desvanecer estado abierto del sobre suavemente
    letterModal.addEventListener('close', () => {
      envelope.classList.remove('envelope-opened');
    });
  }
}

// ==============================================================================
// 3. CIERRE DE MODALES Y LIGHT-DISMISS
// ==============================================================================
function setupModalDismissals() {
  // Botones con atributo [data-close-modal="id"]
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      const modal = document.getElementById(modalId);
      if (modal) {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      }
    });
  });

  // Light dismiss: clic fuera de la tarjeta del diálogo
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    });
  });
}

// ==============================================================================
// 4. FORMULARIO DE SUBIDA DE FOTO A LA GALERÍA & GOOGLE DRIVE
// ==============================================================================
function setupUploadMemoryForm() {
  const form = document.getElementById('upload-memory-form');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('memory-file-input');
  const previewImg = document.getElementById('image-upload-preview');
  const dropzonePrompt = document.getElementById('dropzone-prompt');
  const statusIndicator = document.getElementById('upload-status-indicator');
  const submitBtn = document.getElementById('btn-submit-memory');

  let currentBase64 = null;
  let currentMimeType = 'image/jpeg';
  let currentFileName = '';

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.background = '#fde68a';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.background = '#fffbeb';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.background = '#fffbeb';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processSelectedFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        processSelectedFile(fileInput.files[0]);
      }
    });
  }

  async function processSelectedFile(file) {
    const compressed = await compressImage(file);
    currentBase64 = compressed.dataUrl;
    currentMimeType = compressed.mimeType;
    currentFileName = compressed.mimeType === 'image/jpeg'
      ? file.name.replace(/\.[^.]+$/, '') + '.jpg'
      : file.name;

    previewImg.src = currentBase64;
    previewImg.classList.remove('hidden');
    dropzonePrompt.classList.add('hidden');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentBase64) {
        alert('Por favor selecciona una foto para guardar.');
        return;
      }

      const title = document.getElementById('memory-title').value.trim();
      const date = document.getElementById('memory-date').value;
      const location = document.getElementById('memory-location').value.trim();
      const caption = document.getElementById('memory-caption').value.trim();

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ Guardando y subiendo a la nube...</span>';
      statusIndicator.classList.remove('hidden');
      statusIndicator.style.color = '#d97706';
      statusIndicator.textContent = 'Procesando foto...';

      const newMemory = {
        id: `mem_${Date.now()}`,
        title: title || 'Recuerdo de nuestra salida',
        date: date || new Date().toISOString().split('T')[0],
        location: location || '',
        caption: caption || '',
        imageBase64: currentBase64,
        driveUrl: null,
        driveFileId: null,
        isLocal: true,
        timestamp: Date.now()
      };

      // 1. Guardar de inmediato en almacenamiento local (IndexedDB)
      await saveMemory(newMemory);
      sounds.playCelebration();

      if (window.petalsInstance) {
        window.petalsInstance.triggerBurst(window.innerWidth / 2, window.innerHeight / 2, 45);
      }

      // Re-renderizar galería para que aparezca al instante
      if (galleryInstance) await galleryInstance.render();

      // 2. Intentar subir al endpoint de Google Drive en segundo plano
      try {
        statusIndicator.textContent = 'Subiendo a la nube ☁️...';
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: currentFileName || `salida_${Date.now()}.jpg`,
            title: newMemory.title,
            date: newMemory.date,
            location: newMemory.location,
            caption: newMemory.caption,
            mimeType: currentMimeType,
            imageBase64: currentBase64,
            webhookUrl: (localStorage.getItem('propuesta_drive_webhook_url') || '').trim() || undefined,
            folderId: (localStorage.getItem('propuesta_drive_folder_id') || '').trim() || undefined
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.storageId) {
            newMemory.storageId = data.storageId;
            newMemory.isLocal = false;
            await saveMemory(newMemory);
            if (galleryInstance) await galleryInstance.refresh();
          } else if (data.driveFileId) {
            newMemory.driveUrl = data.driveUrl || `https://drive.google.com/file/d/${data.driveFileId}/view`;
            newMemory.driveFileId = data.driveFileId;
            newMemory.isLocal = false;
            await saveMemory(newMemory);
            if (galleryInstance) await galleryInstance.refresh();
          }
        }
      } catch (err) {
        console.warn('Aviso: Foto almacenada en álbum local (Drive pendiente):', err);
      }

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>💾 Guardar recuerdo</span>';
      statusIndicator.textContent = '¡Recuerdo guardado con éxito! ✨';
      statusIndicator.style.color = '#16a34a';

      setTimeout(() => {
        const modal = document.getElementById('modal-upload-memory');
        if (modal) modal.close();
        statusIndicator.classList.add('hidden');
      }, 1200);
    });
  }
}

// Reduce la foto antes de subirla: las fotos del celular suelen pasar del
// límite de 4.5 MB por petición de Vercel. Si el navegador no puede leerla
// (p. ej. HEIC fuera de Safari), se envía tal cual.
function compressImage(file, maxSide = 2000, quality = 0.85) {
  const readRaw = () => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ dataUrl: e.target.result, mimeType: file.type || 'image/jpeg' });
    reader.readAsDataURL(file);
  });

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), mimeType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      readRaw().then(resolve);
    };
    img.src = url;
  });
}

// ==============================================================================
// 5. MODAL PARA AJUSTAR FECHA DEL CRONÓMETRO
// ==============================================================================
function setupDateEditorForm() {
  const form = document.getElementById('edit-date-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const datetimeInput = document.getElementById('edit-target-datetime').value;
      const titleInput = document.getElementById('edit-date-title').value.trim();

      if (datetimeInput && countdownInstance) {
        sounds.playPop();
        countdownInstance.setCustomTarget(datetimeInput, titleInput || 'Nuestra Próxima Cita 💖');
        const modal = document.getElementById('modal-edit-date');
        if (modal) modal.close();
      }
    });
  }
}

// ==============================================================================
// 6. MODAL PARA EDITAR DETALLES DE CITA
// ==============================================================================
function setupEventEditorForm() {
  const form = document.getElementById('edit-event-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = parseInt(document.getElementById('edit-event-id').value);
      const title = document.getElementById('edit-event-title').value.trim();
      const date = document.getElementById('edit-event-date').value;
      const time = document.getElementById('edit-event-time').value;
      const location = document.getElementById('edit-event-location').value.trim();
      const dressCode = document.getElementById('edit-event-dress').value.trim();
      const description = document.getElementById('edit-event-desc').value.trim();
      const secretHint = document.getElementById('edit-event-hint').value.trim();

      const events = getEvents();
      const index = events.findIndex(ev => ev.id === id);
      if (index !== -1) {
        events[index] = {
          ...events[index],
          title,
          date,
          time,
          location,
          dressCode,
          description,
          secretHint
        };
        saveEvents(events);
        sounds.playPop();

        if (eventsInstance) eventsInstance.render();
        if (countdownInstance) countdownInstance.calculateNextDate();

        const modal = document.getElementById('modal-edit-event');
        if (modal) modal.close();
      }
    });
  }
}

// ==============================================================================
// 7. BOTÓN FINAL DE LLUVIA DE GLOBOS Y CELEBRACIÓN 🎈✨
// ==============================================================================
function setupFinalCelebrationButton() {
  const btn = document.getElementById('btn-burst-celebration');
  if (btn) {
    btn.addEventListener('click', (e) => {
      sounds.playCelebration();
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (window.petalsInstance) {
            window.petalsInstance.triggerBurst(
              Math.random() * window.innerWidth,
              Math.random() * (window.innerHeight * 0.7),
              35
            );
          }
        }, i * 220);
      }
    });
  }
}
