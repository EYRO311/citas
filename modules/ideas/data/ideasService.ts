import type { IdeaItem, IdeaPayload } from '@/types/ideas';
import { addCloudIdea, deleteCloudIdea, fetchCloudIdeas, updateCloudIdea } from './ideasApiClient';
import {
  addIdea as addLocalIdea,
  cacheIdeas,
  deleteIdea as deleteLocalIdea,
  getIdeas as getLocalIdeas,
  updateIdea as updateLocalIdea,
} from './ideasRepository';

export interface LoadIdeasResult {
  ideas: IdeaItem[];
  connected: boolean;
}

// Supabase es la fuente de verdad cuando esta conectado; si no, usamos el
// respaldo local (mismo comportamiento que antes de tener nube).
export async function loadIdeas(): Promise<LoadIdeasResult> {
  const cloud = await fetchCloudIdeas();
  if (cloud.connected) {
    cacheIdeas(cloud.ideas);
    return { ideas: cloud.ideas, connected: true };
  }
  return { ideas: getLocalIdeas(), connected: false };
}

export async function createIdea(payload: IdeaPayload): Promise<IdeaItem> {
  const created = await addCloudIdea(payload);
  if (created) return created;
  return addLocalIdea(payload);
}

export async function editIdea(id: number, payload: IdeaPayload): Promise<IdeaItem | null> {
  const updated = await updateCloudIdea(id, payload);
  if (updated) return updated;
  return updateLocalIdea(id, payload);
}

export async function removeIdea(id: number): Promise<void> {
  const ok = await deleteCloudIdea(id);
  if (!ok) deleteLocalIdea(id);
}
