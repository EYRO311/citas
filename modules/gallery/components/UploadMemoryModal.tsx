'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { compressImage } from '../domain/compressImage';
import { saveMemory } from '../data/memoriesLocalRepository';
import { checkVideoUploadAvailable, uploadMemoryToCloud, uploadVideoMemory } from '../data/memoriesApiClient';
import { triggerGlobalBurst } from '@/modules/petals/registry';
import { Icon } from '@/shared/icons/Icon';
import type { LocalMemory } from '@/types/memories';
import { MAX_VIDEO_BYTES, MAX_VIDEO_DURATION_SEC } from '@/types/memories';
import MemoryAlbumAnimation from './MemoryAlbumAnimation';

export interface UploadMemoryModalHandle {
  open: () => void;
}

const MAX_PHOTOS = 6;

interface SelectedPhoto {
  dataUrl: string;
  mimeType: string;
  name: string;
}

interface SelectedVideo {
  file: File;
  posterDataUrl: string;
  durationSec: number;
}

/** Lee duración y captura un frame de portada de un video seleccionado, sin subir nada aún. */
function readVideoMeta(file: File): Promise<{ durationSec: number; posterDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const durationSec = video.duration;
      video.currentTime = Math.min(0.5, durationSec / 2 || 0);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No se pudo generar la miniatura del video');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const posterDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        cleanup();
        resolve({ durationSec: video.duration, posterDataUrl });
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('No se pudo leer el archivo de video'));
    };
  });
}

interface UploadMemoryModalProps {
  onSaved: (savedMemory?: LocalMemory) => void;
  mode?: 'album' | 'book';
}

const UploadMemoryModal = forwardRef<UploadMemoryModalHandle, UploadMemoryModalProps>(function UploadMemoryModal(
  { onSaved, mode = 'album' },
  ref
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [mediaTab, setMediaTab] = useState<'photo' | 'video'>('photo');
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{ text: string; color: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [animationMemory, setAnimationMemory] = useState<LocalMemory | null>(null);
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [videoAvailable, setVideoAvailable] = useState<{ ok: boolean; message?: string } | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useImperativeHandle(ref, () => ({
    open: () => {
      setPhotos([]);
      setCoverIndex(0);
      setStatus(null);
      setMediaTab('photo');
      setVideo(null);
      setVideoProgress(0);
      dialogRef.current?.showModal();
      checkVideoUploadAvailable().then((res) => setVideoAvailable({ ok: res.available, message: res.message }));
    },
  }));

  async function handleVideoSelect(file: File) {
    if (file.size > MAX_VIDEO_BYTES) {
      alert(`El video pesa demasiado (máximo ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB).`);
      return;
    }
    try {
      const meta = await readVideoMeta(file);
      if (meta.durationSec > MAX_VIDEO_DURATION_SEC) {
        alert(`El video dura demasiado (máximo ${Math.round(MAX_VIDEO_DURATION_SEC / 60)} minutos).`);
        return;
      }
      setVideo({ file, posterDataUrl: meta.posterDataUrl, durationSec: meta.durationSec });
    } catch (err) {
      alert((err as Error).message || 'No se pudo procesar el video seleccionado.');
    }
  }

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

  async function handleVideoSubmit(form: HTMLFormElement) {
    if (!video) {
      alert('Por favor selecciona un video para guardar.');
      return;
    }

    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    const date = (form.elements.namedItem('date') as HTMLInputElement).value;
    const location = (form.elements.namedItem('location') as HTMLInputElement).value.trim();
    const caption = (form.elements.namedItem('caption') as HTMLTextAreaElement).value.trim();

    setSubmitting(true);
    setVideoProgress(0);
    setStatus({ text: 'Subiendo video a la nube... 0%', color: '#d97706' });

    try {
      const memory = await uploadVideoMemory(
        video.file,
        {
          title: title || 'Recuerdo de nuestra salida',
          date: date || new Date().toISOString().split('T')[0],
          location,
          caption,
          durationSec: Math.round(video.durationSec),
        },
        { base64: video.posterDataUrl, mimeType: 'image/jpeg', name: 'poster.jpg' },
        (sent, total) => {
          const pct = total ? Math.round((sent / total) * 100) : 0;
          setVideoProgress(pct);
          setStatus({ text: `Subiendo video a la nube... ${pct}%`, color: '#d97706' });
        }
      );

      const newMemory: LocalMemory = {
        id: memory.id,
        title: memory.title,
        date: memory.date,
        location: memory.location,
        caption: memory.caption,
        kind: 'video',
        images: [video.posterDataUrl],
        coverIndex: 0,
        imageBase64: video.posterDataUrl,
        videoDriveId: memory.videoDriveId,
        videoUrl: memory.videoUrl,
        durationSec: memory.durationSec,
        storageId: memory.storageId,
        driveUrl: null,
        driveFileId: null,
        isLocal: false,
        timestamp: Date.now(),
      };
      await saveMemory(newMemory);

      dialogRef.current?.close();
      setAnimationMemory(newMemory);
      setSubmitting(false);
      setStatus(null);
      form.reset();
      setVideo(null);
      setVideoProgress(0);
      onSaved(newMemory);
    } catch (err) {
      console.warn('Error subiendo video:', err);
      setStatus({ text: 'No se pudo subir el video. Intenta de nuevo.', color: '#dc2626' });
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    if (mediaTab === 'video') {
      await handleVideoSubmit(form);
      return;
    }

    if (photos.length === 0) {
      alert('Por favor selecciona al menos una foto para guardar.');
      return;
    }

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

    // Cerrar el modal y lanzar la animación del recuerdo de inmediato
    dialogRef.current?.close();
    setAnimationMemory(newMemory);
    setSubmitting(false);
    setStatus(null);
    form.reset();
    setPhotos([]);
    setCoverIndex(0);

    // Sincronización en segundo plano con la nube
    (async () => {
      try {
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
          onSaved(newMemory);
        } else if (data.driveFileId) {
          newMemory.driveUrl = data.driveUrl || `https://drive.google.com/file/d/${data.driveFileId}/view`;
          newMemory.driveFileId = data.driveFileId;
          newMemory.isLocal = false;
          await saveMemory(newMemory);
          onSaved(newMemory);
        }
      } catch (err) {
        console.warn('Aviso: Recuerdo almacenado en álbum local (nube pendiente):', err);
      }
    })();
  }

  return (
    <>
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
              {mediaTab === 'photo'
                ? 'Puedes subir varias fotos; elige cuál será la portada que se ve en el álbum.'
                : 'Sube un video corto de recuerdo; se guarda en Google Drive y aparece en Reels.'}
            </p>
          </div>

          <div className="media-tab-switch" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              className={`btn-tab ${mediaTab === 'photo' ? 'is-active' : ''}`}
              onClick={() => setMediaTab('photo')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: mediaTab === 'photo' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: mediaTab === 'photo' ? '#eff6ff' : '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📷 Foto
            </button>
            <button
              type="button"
              className={`btn-tab ${mediaTab === 'video' ? 'is-active' : ''}`}
              onClick={() => videoAvailable?.ok && setMediaTab('video')}
              disabled={!videoAvailable?.ok}
              title={videoAvailable?.ok ? undefined : videoAvailable?.message}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: mediaTab === 'video' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: mediaTab === 'video' ? '#eff6ff' : '#fff',
                fontWeight: 600,
                cursor: videoAvailable?.ok ? 'pointer' : 'not-allowed',
                opacity: videoAvailable?.ok ? 1 : 0.5,
              }}
            >
              🎬 Video
            </button>
          </div>

          {mediaTab === 'video' && !videoAvailable?.ok && videoAvailable?.message && (
            <p style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: 12 }}>{videoAvailable.message}</p>
          )}

          <form onSubmit={handleSubmit}>
            {mediaTab === 'photo' ? (
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
            ) : (
              <div className="form-group">
                <label className="form-label">Video de la cita</label>
                <div
                  className="photo-dropzone"
                  onClick={() => videoInputRef.current?.click()}
                >
                  {video ? (
                    <>
                      <img
                        src={video.posterDataUrl}
                        alt="Portada del video"
                        style={{ maxHeight: 160, borderRadius: 10, marginBottom: 8 }}
                      />
                      <strong>
                        {video.file.name} · {Math.round(video.durationSec)}s ·{' '}
                        {Math.round(video.file.size / 1024 / 1024)}MB
                      </strong>
                      <p style={{ fontSize: '0.8rem', color: '#78716c', marginTop: 4 }}>Toca para elegir otro video</p>
                    </>
                  ) : (
                    <>
                      <span className="dropzone-icon">
                        <Icon name="camera" className="ui-icon-xl ui-icon-blue" />
                      </span>
                      <strong>Toca aquí para elegir un video</strong>
                      <p style={{ fontSize: '0.8rem', color: '#78716c', marginTop: 4 }}>
                        MP4, WEBM o MOV · hasta {Math.round(MAX_VIDEO_DURATION_SEC / 60)} min /{' '}
                        {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoSelect(file);
                    e.target.value = '';
                  }}
                />
                {submitting && (
                  <div
                    style={{
                      marginTop: 10,
                      height: 8,
                      borderRadius: 4,
                      background: '#e2e8f0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${videoProgress}%`,
                        background: '#2563eb',
                        transition: 'width 0.2s',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {mediaTab === 'photo' && photos.length > 0 && (
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
                    mediaTab === 'video' ? `⏳ Subiendo... ${videoProgress}%` : '⏳ Guardando...'
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

      <MemoryAlbumAnimation
        memory={animationMemory}
        isOpen={!!animationMemory}
        mode={mode}
        onComplete={() => {
          const finished = animationMemory;
          setAnimationMemory(null);
          if (finished) {
            onSaved(finished);
          }
        }}
      />
    </>
  );
});

export default UploadMemoryModal;
