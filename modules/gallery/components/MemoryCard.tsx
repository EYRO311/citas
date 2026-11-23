'use client';

import type { Memory } from '@/types/memories';
import { Icon } from '@/shared/icons/Icon';

const FALLBACK_IMG = '/img/fondo.jpg';

export default function MemoryCard({
  memory,
  onClick,
  isHighlighted = false,
}: {
  memory: Memory;
  onClick: () => void;
  isHighlighted?: boolean;
}) {
  const displayImg =
    ('imageBase64' in memory && memory.imageBase64) ||
    ('thumbUrl' in memory && memory.thumbUrl) ||
    memory.imageUrl ||
    FALLBACK_IMG;
  const driveUrl = 'driveUrl' in memory ? memory.driveUrl : undefined;
  const isVideo = memory.kind === 'video';

  return (
    <div className={`polaroid-card ${isHighlighted ? 'is-just-added' : ''}`} onClick={onClick}>
      <div className="polaroid-inner">
        <div className="polaroid-photo-frame">
          <img
            src={displayImg}
            alt={memory.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMG;
            }}
          />
          {isVideo && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              ▶
            </span>
          )}
          {driveUrl && (
            <span className="drive-sync-indicator" title="Guardada en la nube">
              <Icon name="cloud" className="ui-icon-blue" /> Nube
            </span>
          )}
        </div>
        <div className="polaroid-meta">
          <h4 className="polaroid-title">{memory.title}</h4>
          <div className="polaroid-tags">
            <span className="polaroid-date">
              <Icon name="calendar" className="ui-icon-blue" /> {memory.date || 'Recuerdo especial'}
            </span>
            {memory.location && (
              <span className="polaroid-location">
                <Icon name="location" className="ui-icon-rose" /> {memory.location}
              </span>
            )}
          </div>
          <p className="polaroid-caption">{memory.caption || ''}</p>
        </div>
      </div>
    </div>
  );
}
