'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { compressImage } from '../domain/compressImage';
import { saveMemory } from '../data/memoriesLocalRepository';
import { uploadMemoryToCloud } from '../data/memoriesApiClient';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { Icon } from '@/shared/icons/Icon';
import type { LocalMemory } from '@/types/memories';

export interface UploadMemoryModalHandle {
  open: () => void;
}

const MAX_PHOTOS = 6;

interface SelectedPhoto {
  dataUrl: string;
  mimeType: string;
  name: string;
}

const UploadMemoryModal = forwardRef<UploadMemoryModalHandle, { onSaved: () => void }>(function UploadMemoryModal(
  { onSaved },
  ref
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{ text: string; color: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useImperativeHandle(ref, () => ({
    open: () => {
      setPhotos([]);
      setCoverIndex(0);
      setStatus(null);
      dialogRef.current?.showModal();
    },
  }));

  async function processSelectedFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).slice(0, Math.max(0, MAX_PHOTOS - photos.length));
    if (files.length === 0) return;
    if (fileList.length > files.length) {
      alert(`Puedes subir hasta ${MAX_PHOTOS} fotos por recuerdo. Se tomaron solo las primeras disponibles.`);
    }

    const compressed = await Promise.all(
      files.map(async (file) => {
        const result = await compressImage(file, 1600, 0.75);
        const name =
          result.mimeType === 'image/jpeg' ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name;
        return { dataUrl: result.dataUrl, mimeType: result.mimeType, name };
      })
    );

    setPhotos((prev) => [...prev, ...compressed]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((prev) => {
      if (index === prev) return 0;
      return index < prev ? prev - 1 : prev;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (photos.length === 0) {
      alert('Por favor selecciona al menos una foto para guardar.');
      return;
    }

    const form = e.currentTarget;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const location = (form.elements.namedItem('location') as HTMLInputElement).value.trim();
    const caption = (form.elements.namedItem('caption') as HTMLTextAreaElement).value.trim();
    const safeCoverIndex = Math.min(coverIndex, photos.length - 1);

    setSubmitting(true);
    setStatus({ text: 'Procesando fotos...', color: '#d97706' });

    const newMemory: LocalMemory = {
      id: `mem_${Date.now()}`,
      title: title || 'Recuerdo de nuestra salida',
      date: date || new Date().toISOString().split('T')[0],
      location,
      caption,
      images: photos.map((p) => p.dataUrl),
      coverIndex: safeCoverIndex,
      imageBase64: photos[safeCoverIndex].dataUrl,
      driveUrl: null,
      driveFileId: null,
      isLocal: true,
      timestamp: Date.now(),
    };

    await saveMemory(newMemory);
    triggerGlobalBurst(window.innerWidth / 2, window.innerHeight / 2, 45);
    onSaved();

    try {
      setStatus({ text: 'Subiendo a la nube ☁️...', color: '#d97706' });
      const data = await uploadMemoryToCloud({
        images: photos.map((p) => ({ base64: p.dataUrl, mimeType: p.mimeType, name: p.name })),
        coverIndex: safeCoverIndex,
        title: newMemory.title,
        date: newMemory.date,
        location: newMemory.location,
        caption: newMemory.caption,
        webhookUrl: (localStorage.getItem('propuesta_drive_webhook_url') || '').trim() || undefined,
        folderId: (localStorage.getItem('propuesta_drive_folder_id') || '').trim() || undefined,
      });

      if (data.storageId) {
        newMemory.storageId = data.storageId;
        newMemory.isLocal = false;
        await saveMemory(newMemory);
        onSaved();
      } else if (data.driveFileId) {
        newMemory.driveUrl = data.driveUrl || `https://drive.google.com/file/d/${data.driveFileId}/view`;
        newMemory.driveFileId = data.driveFileId;
        newMemory.isLocal = false;
        await saveMemory(newMemory);
        onSaved();
      }
    } catch (err) {
      console.warn('Aviso: Recuerdo almacenado en álbum local (nube pendiente):', err);
    }

    setSubmitting(false);
    setStatus({ text: '¡Recuerdo guardado con éxito! ✨', color: '#16a34a' });

    setTimeout(() => {
      dialogRef.current?.close();
      setStatus(null);
      form.reset();
      setPhotos([]);
      setCoverIndex(0);
    }, 1200);
  }

  return (
    <dialog ref={dialogRef} id="modal-upload-memory">
      <div className="modal-card">
        <button type="button" className="modal-close-btn" aria-label="Cerrar" onClick={() => dialogRef.current?.close()}>
          &times;
        </button>
        <div className="modal-header-styled">
          <h3 className="modal-title-styled">
            Guardar Recuerdo de Nuestra Salida <Icon name="camera" className="ui-icon-blue" />
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Puedes subir varias fotos; elige cuál será la portada que se ve en el álbum.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Fotos de la cita</label>
            <div
              className="photo-dropzone"
              style={{ background: dragging ? '#fde68a' : undefined }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files?.length) processSelectedFiles(e.dataTransfer.files);
              }}
            >
              <span className="dropzone-icon">
                <Icon name="camera" className="ui-icon-xl ui-icon-blue" />
              </span>
              {photos.length === 0 ? (
                <strong>Toca aquí o arrastra una o varias fotos</strong>
              ) : (
                <strong>
                  Toca aquí para añadir más fotos ({photos.length}/{MAX_PHOTOS})
                </strong>
              )}
              <p style={{ fontSize: '0.8rem', color: '#78716c', marginTop: 4 }}>Formatos JPG, PNG, WEBP</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) processSelectedFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {photos.length > 0 && (
            <div className="form-group">
              <label className="form-label">Elige la foto de portada (se verá en el álbum)</label>
              <div className="cover-photo-picker">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className={`cover-photo-option ${index === coverIndex ? 'is-cover' : ''}`}
                    onClick={() => setCoverIndex(index)}
                  >
                    <img src={photo.dataUrl} alt={`Foto ${index + 1}`} />
                    {index === coverIndex && <span className="cover-photo-badge">Portada</span>}
                    <button
                      type="button"
                      className="cover-photo-remove"
                      aria-label="Quitar foto"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(index);
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="memory-title">
              Título del recuerdo
            </label>
            <input id="memory-title" name="title" className="form-input" placeholder="Nuestra salida especial" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="memory-date">
                Fecha
              </label>
              <input id="memory-date" name="date" type="date" className="form-input" defaultValue={today} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="memory-location">
                Lugar
              </label>
              <input id="memory-location" name="location" className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="memory-caption">
              Mensaje o recuerdo especial
            </label>
            <textarea id="memory-caption" name="caption" className="form-textarea" rows={3} />
          </div>

          {status && (
            <p style={{ color: status.color, marginBottom: 14, textAlign: 'center', fontWeight: 600 }}>{status.text}</p>
          )}

          <div className="form-actions-group">
            <button type="submit" className="btn-primary" disabled={submitting}>
              <span>
                {submitting ? (
                  '⏳ Guardando...'
                ) : (
                  <>
                    <Icon name="save" className="ui-icon-white" /> Guardar recuerdo
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
});

export default UploadMemoryModal;
