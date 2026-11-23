import type { DriveVideosResponse } from '@/types/driveVideoGallery';

export async function fetchDriveVideos(): Promise<DriveVideosResponse> {
  try {
    const res = await fetch('/api/drive-videos');
    const data = await res.json();
    return { videos: data.videos || [], error: data.error };
  } catch (error) {
    return { videos: [], error: (error as Error).message };
  }
}
