export interface BookNotes {
  text: string;
  updatedAt?: string;
}

/** Límite de caracteres de la página de notas del libro. */
export const NOTES_MAX_LENGTH = 5000;
