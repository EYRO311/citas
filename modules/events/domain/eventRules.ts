import type { EventItem } from '@/types/events';
import { parseMexicoCityDateTime } from './timezone';

export function getEventRevealTimestamp(event: EventItem | null | undefined): number {
  if (!event) return 0;
  const dateStr = (event.revealDate || event.date || '').trim();
  const timeStr = (event.revealTime || event.time || '19:30').trim();
  if (!dateStr) return 0;
  const parsed = parseMexicoCityDateTime(dateStr, timeStr);
  return isNaN(parsed) ? 0 : parsed;
}

export function isEventReadyToDisplay(event: EventItem | null | undefined): boolean {
  if (!event) return false;
  if (!event.isHidden) return true;
  if (event.forceReveal) return true;
  const revealTime = getEventRevealTimestamp(event);
  if (!revealTime) return false;
  return Date.now() >= revealTime;
}
