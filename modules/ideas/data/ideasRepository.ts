import type { IdeaItem, IdeaPayload } from '@/types/ideas';

const STORAGE_KEY = 'propuesta_ideas';

export function getIdeas(): IdeaItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as IdeaItem[];
  } catch {
    // ignore parse/storage errors, fall back to empty list
  }
  return [];
}

// Escribe en localStorage sin avisar a la UI; se usa para mantener el cache
// de respaldo al dia cuando los datos reales vienen de Supabase.
export function cacheIdeas(ideas: IdeaItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
  } catch {
    // storage unavailable (private mode, quota, etc.) — silently ignore
  }
}

export function saveIdeas(ideas: IdeaItem[]): void {
  cacheIdeas(ideas);
  try {
    window.dispatchEvent(new CustomEvent('ideas_updated', { detail: ideas }));
  } catch {
    // ignore
  }
}

export function addIdea(payload: IdeaPayload): IdeaItem {
  const ideas = getIdeas();
  const newIdea: IdeaItem = {
    id: Date.now(),
    title: payload.title?.trim() || 'Nuevo plan',
    link: (payload.link || '').trim(),
    createdAt: new Date().toISOString(),
  };
  ideas.unshift(newIdea);
  saveIdeas(ideas);
  return newIdea;
}

export function updateIdea(id: number, payload: IdeaPayload): IdeaItem | null {
  const ideas = getIdeas();
  const index = ideas.findIndex((i) => i.id === id);
  if (index === -1) return null;
  ideas[index] = {
    ...ideas[index],
    ...payload,
    title: payload.title !== undefined ? payload.title.trim() || ideas[index].title : ideas[index].title,
    link: payload.link !== undefined ? payload.link.trim() : ideas[index].link,
  };
  saveIdeas(ideas);
  return ideas[index];
}

export function deleteIdea(id: number): void {
  saveIdeas(getIdeas().filter((i) => i.id !== id));
}
