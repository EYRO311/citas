'use client';

import { useEffect, useRef, useState } from 'react';
import type { LocalMemory, Memory, MemoryMeta } from '@/types/memories';
import { deleteMemory as deleteLocalMemory, saveMemory as saveLocalMemory } from '../data/memoriesLocalRepository';
import { deleteCloudMemory, updateCloudMemory } from '../data/memoriesApiClient';
import { Icon } from '@/shared/icons/Icon';

const FALLBACK_IMG = '/img/fondo.jpg';

export default function Lightbox({
  memory,
  onClose,
  onDeleted,
  onUpdated,
}: {
  memory: Memory | null;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<MemoryMeta>({ title: '', date: '', location: '', caption: '' });

  useEffect(() => {
    if (memory) {
      setActiveIndex(memory.coverIndex || 0);
      setEditing(false);
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
  const canEditText = !driveFileId;

  async function handleSaveEdit() {
    if (!memory) return;
    const cleaned: MemoryMeta = {
      title: meta.title.trim() || 'Recuerdo de nuestra salida',
      date: meta.date,
      location: meta.location.trim(),
      caption: meta.caption.trim(),
    };

    setSaving(true);

    if (storageId) {
      const updated = await updateCloudMemory(storageId, cleaned);
      if (!updated) {
        alert('No se pudo guardar los cambios en la nube. Inténtalo de nuevo.');
        setSaving(false);
        return;
      }
    }

    await saveLocalMemory({
      ...memory,
      ...cleaned,
      id: memory.id,
      isLocal: 'isLocal' in memory ? memory.isLocal : false,
      timestamp: memory.timestamp || Date.now(),
    } as LocalMemory);

    setMeta(cleaned);
    setSaving(false);
    setEditing(false);
    onUpdated();
  }

  const gallery = memory.images && memory.images.length > 0 ? memory.images : null;
  const singleFallback = ('imageBase64' in memory && memory.imageBase64) || memory.imageUrl || FALLBACK_IMG;
  const displayImg = gallery ? gallery[Math.min(activeIndex, gallery.length - 1)] : singleFallback;

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
    onDeleted();
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
                {activeIndex + 1} / {gallery.length}
              </span>
            </>
          )}
        </div>

        {gallery && gallery.length > 1 && (
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
          {canEditText && !editing && (
            <button type="button" className="btn-ghost-sm" onClick={() => setEditing(true)}>
              <Icon name="edit" className="ui-icon-blue" /> Editar texto
            </button>
          )}
          {editing && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-ghost-sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveEdit} disabled={saving}>
                <span>{saving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          )}
          {!driveFileId && !editing && (
            <button type="button" className="btn-ghost-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={handleDelete}>
              <Icon name="trash" className="ui-icon-rose" /> Eliminar foto
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
