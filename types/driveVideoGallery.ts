export interface DriveVideoItem {
  id: string;
  name: string;
  thumbnailLink?: string;
  createdTime: string;
}

export interface DriveVideosResponse {
  videos: DriveVideoItem[];
  error?: string;
}
