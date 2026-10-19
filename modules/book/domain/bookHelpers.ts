import type { Memory } from '@/types/memories';

/** Todas las fotos de un recuerdo con la portada primero. */
export function memoryPhotosCoverFirst(memory: Memory): string[] {
  let photos: string[] = [];
  if (memory.images && memory.images.length > 0) {
    photos = memory.images;
  } else {
    const single = ('imageBase64' in memory && memory.imageBase64) || memory.imageUrl || ('thumbUrl' in memory && memory.thumbUrl);
    if (single) photos = [single];
  }
  if (photos.length === 0) return [];

  const coverIndex = Math.min(Math.max(memory.coverIndex || 0, 0), photos.length - 1);
  return [photos[coverIndex], ...photos.filter((_, i) => i !== coverIndex)];
}

/** "2026-10-18" -> "18 de octubre de 2026"; cualquier otro texto se deja tal cual. */
export function formatShortDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return value || '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export interface DateParts {
  day: string;
  month: string;
  weekday: string;
  year: string;
}

export function getDateParts(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '').toUpperCase(),
    weekday: date.toLocaleDateString('es-MX', { weekday: 'long' }),
    year: String(date.getFullYear()),
  };
}
