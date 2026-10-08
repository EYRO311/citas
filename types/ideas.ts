export interface IdeaItem {
  id: number;
  title: string;
  link: string;
  createdAt?: string;
}

export type IdeaPayload = Partial<Omit<IdeaItem, 'id' | 'createdAt'>>;
