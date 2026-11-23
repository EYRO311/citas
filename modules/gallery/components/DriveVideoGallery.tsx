'use client';

import { useEffect, useState } from 'react';
import type { DriveVideoItem } from '@/types/driveVideoGallery';
import { fetchDriveVideos } from '../data/driveVideosApiClient';

function VideoCard({ video }: { video: DriveVideoItem }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="drive-video-card">
      <div className="drive-video-frame">
        {loaded ? (
          <iframe
            src={`https://drive.google.com/file/d/${video.id}/preview`}
            allow="autoplay; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            className="drive-video-play-btn"
            onClick={() => setLoaded(true)}
            aria-label={`Reproducir ${video.name}`}
          >
            {video.thumbnailLink ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumbnailLink} alt="" />
            ) : (
              <div className="drive-video-placeholder" />
            )}
            <span className="drive-video-play-icon">▶</span>
          </button>
        )}
      </div>
      <p className="drive-video-name">{video.name}</p>
    </div>
  );
}

export default function DriveVideoGallery() {
  const [videos, setVideos] = useState<DriveVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetchDriveVideos().then((res) => {
      if (cancelled) return;
      setVideos(res.videos);
      setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="drive-video-status">Cargando videos...</p>;
  }

  if (error) {
    return <p className="drive-video-status drive-video-status-error">No se pudieron cargar los videos ahora. Intenta de nuevo más tarde.</p>;
  }

  if (videos.length === 0) {
    return <p className="drive-video-status">Todavía no hay videos en la carpeta.</p>;
  }

  return (
    <div className="drive-video-grid">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
