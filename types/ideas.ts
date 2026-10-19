export interface IdeaItem {
  id: number;
  title: string;
  /** Link a cualquier red o página (TikTok, Instagram, YouTube, Maps...). */
  link: string;
  /** URL de una imagen del plan (subida a Supabase o pegada como link). */
  image?: string;
  createdAt?: string;
}

export interface IdeaImageUpload {
  base64: string;
  mimeType?: string;
}

export interface IdeaPayload {
  title?: string;
  link?: string;
  /** URL de imagen; '' la quita. Se ignora si llega `imageUpload`. */
  image?: string;
  /** Imagen nueva elegida desde el dispositivo. */
  imageUpload?: IdeaImageUpload;
}
