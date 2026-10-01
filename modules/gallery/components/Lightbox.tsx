'use client';

import { useEffect, useRef, useState } from 'react';
import type { Memory } from '@/types/memories';
import { deleteMemory as deleteLocalMemory } from '../data/memoriesLocalRepository';
import { deleteCloudMemory } from '../data/memoriesApiClient';
import { Icon } from '@/shared/icons/Icon';

const FALLBACK_IMG = '/img/fondo.jpg';

export default function Lightbox({
  memory,
  onClose,
  onDeleted,
}: {
  memory: Memory | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (memory) {
      setActiveIndex(memory.coverIndex || 0);
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [memory]);

  if (!memory) return null;

  const driveFileId = 'driveFileId' in memory ? memory.driveFileId : undefined;
  const driveUrl = 'driveUrl' in memory ? memory.driveUrl : undefined;
  const storageId = 'storageId' in memory ? memory.storageId : undefined;

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

        <div className="modal-header-styled" style={{ textAlign: 'left', marginTop: 12, marginBottom: 12 }}>
          <h3 className="modal-title-styled" style={{ fontSize: '1.4rem' }}>
            {memory.title}
          </h3>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            {memory.date && (
              <span>
                <Icon name="calendar" className="ui-icon-blue" /> {memory.date}
              </span>
            )}
            {memory.location && (
              <span>
                <Icon name="location" className="ui-icon-rose" /> {memory.location}
              </span>
            )}
          </div>
        </div>
        <p style={{ color: '#334155', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: 20 }}>{memory.caption || ''}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          {driveUrl && (
            <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="btn-calendar">
              <Icon name="cloud" className="ui-icon-blue" /> Abrir en Google Drive
            </a>
          )}
          {!driveFileId && (
            <button type="button" className="btn-ghost-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={handleDelete}>
              <Icon name="trash" className="ui-icon-rose" /> Eliminar foto
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
