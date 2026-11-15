export const NOTE_COLORS = [
  'default',
  'coral',
  'peach',
  'sand',
  'mint',
  'sage',
  'fog',
  'storm',
  'dusk',
  'blossom',
  'clay',
  'chalk',
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export const COLOR_NAMES: Record<NoteColor, string> = {
  default: 'Par défaut',
  coral: 'Corail',
  peach: 'Pêche',
  sand: 'Sable',
  mint: 'Menthe',
  sage: 'Sauge',
  fog: 'Brume',
  storm: 'Orage',
  dusk: 'Crépuscule',
  blossom: 'Fleur',
  clay: 'Argile',
  chalk: 'Craie',
};

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'checklist';
  items: ChecklistItem[];
  color: NoteColor;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  labels: string[];
  /** Position et taille sur le tableau blanc (coordonnées monde). */
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  createdAt: number;
  updatedAt: number;
}

export interface Label {
  id: string;
  name: string;
}

export interface Connector {
  id: string;
  from: string;
  to: string;
}

export interface AppData {
  version: 1;
  notes: Note[];
  labels: Label[];
  connectors: Connector[];
}

export type View = { kind: 'notes' } | { kind: 'archive' } | { kind: 'trash' } | { kind: 'label'; id: string };

export type Layout = 'grid' | 'board';
