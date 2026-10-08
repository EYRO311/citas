'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Memory } from '@/types/memories';
import type { DriveStatusResponse } from '@/types/drive';
import { getMemories } from '../data/memoriesLocalRepository';
import { fetchCloudMemories, fetchDriveStatus } from '../data/memoriesApiClient';
import { mergeMemories } from '../domain/mergeMemories';
import { Icon } from '@/shared/icons/Icon';
import MemoryCard from './MemoryCard';
import UploadMemoryModal, { UploadMemoryModalHandle } from './UploadMemoryModal';
import Lightbox from './Lightbox';

export default function Gallery() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [driveStatus, setDriveStatus] = useState<DriveStatusResponse>({ connected: false, mode: 'local', memories: [] });
  const [cloudConnected, setCloudConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Memory | null>(null);
  const uploadRef = useRef<UploadMemoryModalHandle>(null);

  const refresh = useCallback(async () => {
    const [local, cloud, drive] = await Promise.all([getMemories(), fetchCloudMemories(), fetchDriveStatus()]);
    setCloudConnected(cloud.connected);
    setDriveStatus(drive);
    setMemories(mergeMemories(local, cloud.memories, drive.memories));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const totalCloudCount = driveStatus.memories.length + (cloudConnected ? memories.filter((m) => 'source' in m && m.source === 'supabase').length : 0);

  return (
    <div id="gallery-container">
      <div className="gallery-header-bar">
        <div>
          <h2 className="section-title">
            Álbum de Nuestras Salidas <Icon name="camera" className="ui-icon-blue" />
          </h2>
          <p className="section-subtitle">
            Cada foto guarda una sonrisa, una aventura y un momento especial que atesoro a tu lado.
          </p>
        </div>
        <div className="gallery-actions-bar">
          <div className={`drive-badge ${cloudConnected || driveStatus.connected ? 'drive-connected' : 'drive-local'}`} onClick={refresh}>
            {loading ? (
              <>
                <span className="status-dot yellow"></span>
                <span>
                  Sincronizando fotos... <Icon name="cloud" className="ui-icon-blue" />
                </span>
              </>
            ) : cloudConnected || driveStatus.connected ? (
              <>
                <span className="status-dot green"></span>
                <span>
                  Álbum en la nube · {totalCloudCount} fotos <Icon name="cloud" className="ui-icon-blue" />
                </span>
              </>
            ) : (
              <>
                <span className="status-dot green"></span>
                <span>
                  Álbum de Recuerdos <Icon name="camera" className="ui-icon-rose" />
                </span>
              </>
            )}
          </div>
          <button type="button" className="btn-primary" onClick={() => uploadRef.current?.open()}>
            <span>
              <Icon name="plus" className="ui-icon-white" /> Añadir nuevo recuerdo
            </span>
          </button>
        </div>
      </div>

      <div className="memories-grid">
        {memories.length === 0 ? (
          <div className="empty-gallery-card glass-panel">
            <span className="empty-icon">
              <Icon name="camera" className="ui-icon-gold ui-icon-xl" />
            </span>
            <h3>Aún no hay fotos añadidas</h3>
            <p>Toca &quot;Añadir nuevo recuerdo&quot; o sube fotos directo a nuestra carpeta de Google Drive y aparecerán aquí.</p>
          </div>
        ) : (
          memories.map((memory) => <MemoryCard key={memory.id} memory={memory} onClick={() => setSelected(memory)} />)
        )}
      </div>

      <UploadMemoryModal ref={uploadRef} onSaved={refresh} />
      <Lightbox memory={selected} onClose={() => setSelected(null)} onDeleted={refresh} onUpdated={refresh} />
    </div>
  );
}
