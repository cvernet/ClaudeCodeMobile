import type { AppData, Connector, Label, Note } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const NOTE_W = 240;
export const NOTE_H = 200;
const GAP = 32;

export type Action =
  | { type: 'addNote'; note: Note }
  | { type: 'updateNote'; id: string; patch: Partial<Note>; history?: boolean }
  | { type: 'updateNotes'; patches: { id: string; patch: Partial<Note> }[]; history?: boolean }
  | { type: 'deleteForever'; ids: string[] }
  | { type: 'emptyTrash' }
  | { type: 'addLabel'; label: Label }
  | { type: 'renameLabel'; id: string; name: string }
  | { type: 'deleteLabel'; id: string }
  | { type: 'addConnector'; connector: Connector }
  | { type: 'deleteConnectors'; ids: string[] }
  | { type: 'bringToFront'; ids: string[]; history?: boolean }
  | { type: 'replaceData'; data: AppData }
  | { type: 'checkpoint' }
  /** Fusionne en une seule étape d'annulation tout ce qui a suivi l'état `base`. */
  | { type: 'squash'; base: AppData }
  | { type: 'undo' }
  | { type: 'redo' };

export interface StoreState {
  data: AppData;
  past: AppData[];
  future: AppData[];
}

const HISTORY_LIMIT = 100;

export function isNoteEmpty(n: Pick<Note, 'title' | 'content' | 'items' | 'type'>) {
  if (n.title.trim()) return false;
  if (n.type === 'text') return !n.content.trim();
  return n.items.every((i) => !i.text.trim());
}

export function createNote(partial: Partial<Note> = {}): Note {
  const now = Date.now();
  return {
    id: uid(),
    title: '',
    content: '',
    type: 'text',
    items: [],
    color: 'default',
    pinned: false,
    archived: false,
    trashed: false,
    labels: [],
    x: 0,
    y: 0,
    w: NOTE_W,
    h: NOTE_H,
    z: 1,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w + GAP / 2 && b.x < a.x + a.w + GAP / 2 && a.y < b.y + b.h + GAP / 2 && b.y < a.y + a.h + GAP / 2;

/** Trouve un emplacement libre sur le tableau, en remplissant des rangées de 5 colonnes. */
export function findFreeSpot(notes: Note[], w = NOTE_W, h = NOTE_H) {
  const placed = notes.filter((n) => !n.trashed && !n.archived);
  for (let row = 0; row < 500; row++) {
    for (let col = 0; col < 5; col++) {
      const rect = { x: col * (NOTE_W + GAP), y: row * (NOTE_H + GAP), w, h };
      if (!placed.some((n) => overlaps(rect, n))) return { x: rect.x, y: rect.y };
    }
  }
  return { x: 0, y: 0 };
}

export const maxZ = (notes: Note[]) => notes.reduce((m, n) => Math.max(m, n.z), 0);

export function reduceData(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'addNote':
      return { ...data, notes: [...data.notes, { ...action.note, z: maxZ(data.notes) + 1 }] };
    case 'updateNote':
      return reduceData(data, { type: 'updateNotes', patches: [{ id: action.id, patch: action.patch }] });
    case 'updateNotes': {
      const map = new Map(action.patches.map((p) => [p.id, p.patch]));
      let changed = false;
      const notes = data.notes.map((n) => {
        const patch = map.get(n.id);
        if (!patch) return n;
        changed = true;
        return { ...n, ...patch };
      });
      return changed ? { ...data, notes } : data;
    }
    case 'deleteForever': {
      const ids = new Set(action.ids);
      return {
        ...data,
        notes: data.notes.filter((n) => !ids.has(n.id)),
        connectors: data.connectors.filter((c) => !ids.has(c.from) && !ids.has(c.to)),
      };
    }
    case 'emptyTrash':
      return reduceData(data, { type: 'deleteForever', ids: data.notes.filter((n) => n.trashed).map((n) => n.id) });
    case 'addLabel':
      return { ...data, labels: [...data.labels, action.label] };
    case 'renameLabel':
      return { ...data, labels: data.labels.map((l) => (l.id === action.id ? { ...l, name: action.name } : l)) };
    case 'deleteLabel':
      return {
        ...data,
        labels: data.labels.filter((l) => l.id !== action.id),
        notes: data.notes.map((n) =>
          n.labels.includes(action.id) ? { ...n, labels: n.labels.filter((l) => l !== action.id) } : n,
        ),
      };
    case 'addConnector': {
      const { from, to } = action.connector;
      const exists = data.connectors.some(
        (c) => (c.from === from && c.to === to) || (c.from === to && c.to === from),
      );
      if (exists || from === to) return data;
      return { ...data, connectors: [...data.connectors, action.connector] };
    }
    case 'deleteConnectors': {
      const ids = new Set(action.ids);
      return { ...data, connectors: data.connectors.filter((c) => !ids.has(c.id)) };
    }
    case 'bringToFront': {
      const ids = new Set(action.ids);
      const top = maxZ(data.notes);
      const targets = data.notes.filter((n) => ids.has(n.id)).sort((a, b) => a.z - b.z);
      if (targets.every((t, i) => t.z === top - targets.length + 1 + i)) return data;
      const newZ = new Map(targets.map((t, i) => [t.id, top + 1 + i]));
      return { ...data, notes: data.notes.map((n) => (newZ.has(n.id) ? { ...n, z: newZ.get(n.id)! } : n)) };
    }
    case 'replaceData':
      return action.data;
    default:
      return data;
  }
}

export function storeReducer(state: StoreState, action: Action): StoreState {
  const { data, past, future } = state;
  switch (action.type) {
    case 'checkpoint':
      if (past[past.length - 1] === data) return state;
      return { data, past: [...past, data].slice(-HISTORY_LIMIT), future: [] };
    case 'squash': {
      const idx = past.lastIndexOf(action.base);
      if (idx < 0 || idx === past.length - 1) return state;
      return { ...state, past: past.slice(0, idx + 1) };
    }
    case 'undo': {
      const p = [...past];
      // Ignore les points de sauvegarde sans modification ultérieure.
      while (p.length && p[p.length - 1] === data) p.pop();
      const prev = p.pop();
      if (!prev) return state;
      return { data: prev, past: p, future: [data, ...future] };
    }
    case 'redo': {
      const [next, ...rest] = future;
      if (!next) return state;
      return { data: next, past: [...past, data].slice(-HISTORY_LIMIT), future: rest };
    }
    default: {
      const next = reduceData(data, action);
      if (next === data) return state;
      const record = !('history' in action) || action.history !== false;
      return {
        data: next,
        past: record ? [...past, data].slice(-HISTORY_LIMIT) : past,
        future: [],
      };
    }
  }
}

/* ---------- Persistance ---------- */

const STORAGE_KEY = 'notes-board:data:v1';

export function isAppData(x: unknown): x is AppData {
  const d = x as AppData;
  return !!d && typeof d === 'object' && Array.isArray(d.notes) && Array.isArray(d.labels) && Array.isArray(d.connectors);
}

/** Normalise des données importées (champs manquants → valeurs par défaut). */
export function normalizeData(d: AppData): AppData {
  return {
    version: 1,
    labels: d.labels.filter((l) => l && typeof l.id === 'string').map((l) => ({ id: l.id, name: String(l.name ?? '') })),
    notes: d.notes.filter((n) => n && typeof n.id === 'string').map((n) => createNote(n)),
    connectors: d.connectors.filter((c) => c && c.from && c.to),
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isAppData(parsed)) return normalizeData(parsed);
    }
  } catch {
    /* stockage indisponible : on repart des données de démonstration */
  }
  return seedData();
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota dépassé ou stockage bloqué */
  }
}

export function seedData(): AppData {
  const ideas: Label = { id: uid(), name: 'Idées' };
  const perso: Label = { id: uid(), name: 'Perso' };
  const now = Date.now();
  const welcome = createNote({
    title: 'Bienvenue 👋',
    content:
      'Prenez des notes en un clic, puis organisez-les visuellement.\n\n• Vue « Grille » : vos notes comme des post-it.\n• Vue « Tableau » : un espace infini pour les disposer et les relier.',
    color: 'sand',
    pinned: true,
    x: 0,
    y: 0,
    w: 280,
    h: 230,
    createdAt: now,
  });
  const board = createNote({
    title: 'Astuces du tableau',
    content:
      'Double-clic sur le fond : nouvelle note\nGlisser le fond : se déplacer\nMolette / pincer : zoomer\nMaj + glisser : sélection multiple\nPoignées ● : relier deux notes',
    color: 'fog',
    x: 360,
    y: 0,
    w: 280,
    h: 230,
    labels: [ideas.id],
    createdAt: now - 1,
  });
  const todo = createNote({
    title: 'Courses',
    type: 'checklist',
    items: [
      { id: uid(), text: 'Pain', done: false },
      { id: uid(), text: 'Tomates', done: false },
      { id: uid(), text: 'Café', done: true },
    ],
    color: 'mint',
    x: 0,
    y: 300,
    labels: [perso.id],
    createdAt: now - 2,
  });
  const shortcuts = createNote({
    title: 'Raccourcis clavier',
    content: 'N : nouvelle note\n/ : rechercher\nCtrl+Z / Ctrl+Maj+Z : annuler / rétablir\nSuppr : supprimer la sélection\nÉchap : fermer',
    color: 'dusk',
    x: 360,
    y: 300,
    w: 280,
    h: 200,
    createdAt: now - 3,
  });
  return {
    version: 1,
    labels: [ideas, perso],
    notes: [welcome, board, todo, shortcuts].map((n, i) => ({ ...n, z: i + 1 })),
    connectors: [
      { id: uid(), from: welcome.id, to: board.id },
      { id: uid(), from: board.id, to: shortcuts.id },
    ],
  };
}

/* ---------- Recherche ---------- */

export function noteMatches(note: Note, query: string, labels: Label[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const labelNames = labels.filter((l) => note.labels.includes(l.id)).map((l) => l.name);
  return [note.title, note.content, ...note.items.map((i) => i.text), ...labelNames].some((s) =>
    s.toLowerCase().includes(q),
  );
}
