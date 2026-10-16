export type LetterMode = 'letter' | 'poem';

export interface LetterContent {
  mode?: LetterMode;
  poemTitle?: string;
  peekSalutation: string;
  greeting: string;
  body: string;
  question: string;
  psLabel: string;
  psText: string;
  signIntro: string;
  signName: string;
}
