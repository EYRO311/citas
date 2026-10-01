export interface EventItem {
  id: number;
  badge: string;
  title: string;
  date: string;
  time: string;
  location: string;
  dressCode: string;
  description: string;
  secretHint: string;
  isHidden: boolean;
  secretCode: string;
  secretClue: string;
  revealDate?: string;
  revealTime?: string;
  forceReveal?: boolean;
  accepted: boolean;
  acceptedAt: string | null;
  createdAt?: string;
}

export type EventPayload = Partial<Omit<EventItem, 'id' | 'accepted' | 'acceptedAt'>>;
