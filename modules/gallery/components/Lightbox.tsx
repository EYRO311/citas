'use client';

import { useEffect, useRef, useState } from 'react';
import type { EditPhotoInput, LocalMemory, Memory, MemoryMeta } from '@/types/memories';
import { deleteMemory as deleteLocalMemory, saveMemory as saveLocalMemory } from '../data/memoriesLocalRepository';
import { deleteCloudMemory, updateCloudMemory } from '../data/memoriesApiClient';
import { compressImage } from '../domain/compressImage';
import { Icon } from '@/shared/icons/Icon';

const FALLBACK_IMG = '/img/fondo.jpg';
const MAX_PHOTOS = 6;

interface DraftPhoto {
  src: string;
  /** Solo en fotos recién elegidas: hay que subirlas. */
  mimeType?: string;
  name?: string;
}

function memoryPhotos(memory: Memory): string[] {
  if (memory.images && memory.images.length > 0) return memory.images;
  const single = ('imageBase64' in memory && memory.imageBase64) || memory.imageUrl;
  return single ? [single] : [];
}

// Visor de un recuerdo. Editar (fotos y texto) y eliminar solo aparecen con `editable`,
// que se activa desde el panel admin; en la página pública es de solo lectura.
export default function Lightbox({
  memory,
  onClose,
  onDeleted,
  onUpdated,
  editable = false,
}: {
  memory: Memory | null;
  onClose: () => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
  editable?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<MemoryMeta>({ title: '', date: '', location: '', caption: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([]);
  const [draftCover, setDraftCover] = useState(0);

  useEffect(() => {
    if (memory) {
      setActiveIndex(memory.coverIndex || 0);
      setEditing(false);
      setPhotos(memoryPhotos(memory));
      setCoverIndex(memory.coverIndex || 0);
      setMeta({
        title: memory.title || '',
        date: memory.date || '',
        location: memory.location || '',
        caption: memory.caption || '',
      });
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [memory]);

  if (!memory) return null;

  const driveFileId = 'driveFileId' in memory ? memory.driveFileId : undefined;
  const driveUrl = 'driveUrl' in memory ? memory.driveUrl : undefined;
  const storageId = 'storageId' in memory ? memory.storageId : undefined;
  const canEdit = editable && !driveFileId;

  function startEditing() {
    const cover = Math.min(coverIndex, Math.max(photos.length - 1, 0));
    setDraftPhotos(photos.map((src) => ({ src })));
    setDraftCover(cover);
    setActiveIndex(cover);
    setEditing(true);
  }

  function cancelEditing() {
    setActiveIndex(Math.min(coverIndex, Math.max(photos.length - 1, 0)));
    setEditing(false);
  }

  async function addDraftPhotos(fileList: FileList) {
    const files = Array.from(fileList).slice(0, Math.max(0, MAX_PHOTOS - draftPhotos.length));
    if (files.length === 0) return;
    if (fileList.length > files.length) {
      alert(`Puedes tener hasta ${MAX_PHOTOS} fotos por recuerdo. Se tomaron solo las primeras disponibles.`);
    }

    const compressed = await Promise.all(
      files.map(async (file) => {
        const result = await compressImage(file, 1600, 0.75);
        const name = result.mimeType === 'image/jpeg' ? file.name.replace(/\.[^.]+$/, '') + '.jpg' : file.name;
        return { src: result.dataUrl, mimeType: result.mimeType, name };
      })
    );

    setDraftPhotos((prev) => [...prev, ...compressed]);
  }

  function removeDraftPhoto(index: number) {
    setDraftPhotos((prev) => prev.filter((_, i) => i !== index));
    setDraftCover((prev) => {
      if (index === prev) return 0;
      return index < prev ? prev - 1 : prev;
    });
    setActiveIndex(0);
  }

  async function handleSaveEdit() {
    if (!memory) return;
    if (draftPhotos.length === 0) {
      alert('El recuerdo necesita al menos una foto.');
      return;
    }

    const cleaned: MemoryMeta = {
      title: meta.title.trim() || 'Recuerdo de nuestra salida',
      date: meta.date,
      location: meta.location.trim(),
      caption: meta.caption.trim(),
    };
    const safeCover = Math.min(draftCover, draftPhotos.length - 1);
    const photosChanged =
      safeCover !== coverIndex ||
      draftPhotos.length !== photos.length ||
      draftPhotos.some((p, i) => p.src !== photos[i]);

    setSaving(true);

    let finalPhotos = draftPhotos.map((p) => p.src);
    let finalCover = safeCover;

    if (storageId) {
      // Las fotos que ya estaban en la nube se mandan por su URL; las que solo tenemos
      // en base64 (nuevas, o copia local de antes) se suben.
      const photosInput: EditPhotoInput[] = draftPhotos.map((p) =>
        p.src.startsWith('data:')
          ? { base64: p.src, mimeType: p.mimeType || p.src.slice(5, p.src.indexOf(';')), name: p.name }
          : { url: p.src }
      );
      const updated = await updateCloudMemory(
        storageId,
        cleaned,
        photosChanged ? { photos: photosInput, coverIndex: safeCover } : undefined
      );
      if (!updated) {
        alert('No se pudo guardar los cambios en la nube. Inténtalo de nuevo.');
        setSaving(false);
        return;
      }
      if (updated.images && updated.images.length > 0) {
        finalPhotos = updated.images;
        finalCover = updated.coverIndex || 0;
      }
    }

    await saveLocalMemory({
      ...memory,
      ...cleaned,
      images: finalPhotos,
      coverIndex: finalCover,
      imageBase64: finalPhotos[finalCover],
      id: memory.id,
      isLocal: 'isLocal' in memory ? memory.isLocal : false,
      timestamp: memory.timestamp || Date.now(),
    } as LocalMemory);

    setMeta(cleaned);
    setPhotos(finalPhotos);
    setCoverIndex(finalCover);
    setActiveIndex(finalCover);
    setSaving(false);
    setEditing(false);
    onUpdated?.();
  }

  const shown = editing ? draftPhotos.map((p) => p.src) : photos;
  const gallery = shown.length > 0 ? shown : null;
  const displayImg = gallery ? gallery[Math.min(activeIndex, gallery.length - 1)] : FALLBACK_IMG;

  function goTo(delta: number) {
    if (!gallery) return;
    setActiveIndex((i) => (i + delta + gallery.length) % gallery.length);
  }

  async function handleDelete() {
    if (!memory) return;
    if (!confirm('¿Deseas eliminar este recuerdo de la galería?')) return;
    if (storageId) {
      const ok = await deleteCloudMemory(storageId);
      if (!ok) {
        alert('No se pudo borrar la foto de la nube. Inténtalo de nuevo.');
        return;
      }
    }
    await deleteLocalMemory(memory.id);
    onClose();
    onDeleted?.();
  }

  return (
    <dialog ref={dialogRef} id="modal-lightbox" onClose={onClose}>
      <div className="modal-card lightbox-card">
        <button type="button" className="modal-close-btn" aria-label="Cerrar" onClick={() => dialogRef.current?.close()}>
          &times;
        </button>

        <div className="lightbox-img-wrapper" style={{ position: 'relative' }}>
          <img
            src={displayImg}
            alt={memory.title}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMG;
            }}
          />
          {gallery && gallery.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav-btn lightbox-nav-prev"
                aria-label="Foto anterior"
                onClick={() => goTo(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox-nav-btn lightbox-nav-next"
                aria-label="Foto siguiente"
                onClick={() => goTo(1)}
              >
                ›
              </button>
              <span className="lightbox-photo-counter">
                {Math.min(activeIndex, gallery.length - 1) + 1} / {gallery.length}
              </span>
            </>
          )}
        </div>

        {!editing && gallery && gallery.length > 1 && (
          <div className="lightbox-thumb-strip">
            {gallery.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Foto ${index + 1}`}
                className={`lightbox-thumb ${index === activeIndex ? 'is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        )}

        {editing ? (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">
              Fotos ({draftPhotos.length}/{MAX_PHOTOS}) · toca una para hacerla portada
            </label>
            <div className="cover-photo-picker" style={{ marginBottom: 14 }}>
              {draftPhotos.map((photo, index) => (
                <div
                  key={`${index}-${photo.src.slice(-32)}`}
                  className={`cover-photo-option ${index === draftCover ? 'is-cover' : ''}`}
                  onClick={() => {
                    setDraftCover(index);
                    setActiveIndex(index);
                  }}
                >
                  <img src={photo.src} alt={`Foto ${index + 1}`} />
                  {index === draftCover && <span className="cover-photo-badge">Portada</span>}
                  <button
                    type="button"
                    className="cover-photo-remove"
                    aria-label="Quitar foto"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDraftPhoto(index);
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {draftPhotos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  className="cover-photo-option cover-photo-add"
                  aria-label="Añadir fotos"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="plus" className="ui-icon-blue" />
                  <span>Añadir</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) addDraftPhotos(e.target.files);
                e.target.value = '';
              }}
            />

            <label className="form-label" htmlFor="lightbox-edit-title">
              Título
            </label>
            <input
              id="lightbox-edit-title"
              className="form-input"
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
            />
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="lightbox-edit-date">
                  Fecha
                </label>
                <input
                  id="lightbox-edit-date"
                  type="date"
                  className="form-input"
                  value={meta.date}
                  onChange={(e) => setMeta((m) => ({ ...m, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lightbox-edit-location">
                  Lugar
                </label>
                <input
                  id="lightbox-edit-location"
                  className="form-input"
                  value={meta.location}
                  onChange={(e) => setMeta((m) => ({ ...m, location: e.target.value }))}
                />
              </div>
            </div>
            <label className="form-label" htmlFor="lightbox-edit-caption">
              Mensaje o recuerdo especial
            </label>
            <textarea
              id="lightbox-edit-caption"
              className="form-textarea"
              rows={3}
              value={meta.caption}
              onChange={(e) => setMeta((m) => ({ ...m, caption: e.target.value }))}
            />
          </div>
        ) : (
          <>
            <div className="modal-header-styled" style={{ textAlign: 'left', marginTop: 12, marginBottom: 12 }}>
              <h3 className="modal-title-styled" style={{ fontSize: '1.4rem' }}>
                {meta.title}
              </h3>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                {meta.date && (
                  <span>
                    <Icon name="calendar" className="ui-icon-blue" /> {meta.date}
                  </span>
                )}
                {meta.location && (
                  <span>
                    <Icon name="location" className="ui-icon-rose" /> {meta.location}
                  </span>
                )}
              </div>
            </div>
            <p style={{ color: '#334155', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: 20 }}>{meta.caption || ''}</p>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          {driveUrl && (
            <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="btn-calendar">
              <Icon name="cloud" className="ui-icon-blue" /> Abrir en Google Drive
            </a>
          )}
          {canEdit && !editing && (
            <button type="button" className="btn-ghost-sm" onClick={startEditing}>
              <Icon name="edit" className="ui-icon-blue" /> Editar fotos y texto
            </button>
          )}
          {editing && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-ghost-sm" onClick={cancelEditing} disabled={saving}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                <span>{saving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          )}
          {canEdit && !editing && (
            <button type="button" className="btn-ghost-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={handleDelete}>
              <Icon name="trash" className="ui-icon-rose" /> Eliminar foto
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
