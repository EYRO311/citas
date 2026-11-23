'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Memory } from '@/types/memories';

interface ReelsFeedProps {
  memories: Memory[];
  startId?: string | null;
  onClose: () => void;
}

// Vista de pantalla completa estilo TikTok: scroll vertical, un video a la vez,
// autoplay del que está centrado (IntersectionObserver) y mute/unmute al tocar.
export default function ReelsFeed({ memories, startId, onClose }: ReelsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [muted, setMuted] = useState(true);

  useLayoutEffect(() => {
    if (!startId) return;
    const el = itemRefs.current.get(startId);
    el?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [startId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-memory-id');
          const videoEl = id ? videoRefs.current.get(id) : null;
          if (!videoEl) continue;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        }
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [memories]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 1000,
      }}
    >
      <button
        type="button"
        aria-label="Cerrar Reels"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>

      <button
        type="button"
        aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        onClick={() => setMuted((m) => !m)}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <div
        ref={containerRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
        }}
      >
        {memories.map((memory) => {
          const poster =
            ('thumbUrl' in memory && memory.thumbUrl) ||
            ('imageBase64' in memory && memory.imageBase64) ||
            memory.imageUrl;

          return (
          <div
            key={memory.id}
            data-memory-id={memory.id}
            ref={(el) => {
              if (el) itemRefs.current.set(memory.id, el);
              else itemRefs.current.delete(memory.id);
            }}
            style={{
              height: '100%',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(memory.id, el);
                else videoRefs.current.delete(memory.id);
              }}
              src={memory.videoUrl}
              poster={poster}
              muted={muted}
              loop
              playsInline
              onClick={() => setMuted((m) => !m)}
              style={{ maxHeight: '100%', maxWidth: '100%', width: '100%', objectFit: 'contain', cursor: 'pointer' }}
            />

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '32px 20px 28px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
                color: '#fff',
                pointerEvents: 'none',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{memory.title}</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 4 }}>
                {[memory.date, memory.location].filter(Boolean).join(' · ')}
              </p>
              {memory.caption && <p style={{ fontSize: '0.9rem', opacity: 0.95 }}>{memory.caption}</p>}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
