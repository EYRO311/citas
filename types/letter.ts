export type LetterMode = 'letter' | 'poem' | 'medal';

export interface LetterContent {
  mode?: LetterMode;
  poemTitle?: string;
  medalCaption?: string;
  peekSalutation: string;
  greeting: string;
  body: string;
  question: string;
  psLabel: string;
  psText: string;
  signIntro: string;
  signName: string;
}
