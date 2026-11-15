import { createContext, useContext } from 'react';
import type { Action } from './store';
import type { AppData, Note } from './types';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface AppApi {
  data: AppData;
  dispatch: (a: Action) => void;
  query: string;
  /** Ouvre l'éditeur sur une note existante, ou sur un brouillon (note pas encore ajoutée). */
  openEditor: (id: string | null, draft?: Note) => void;
  showToast: (t: Omit<Toast, 'id'>) => void;
  setTrashed: (ids: string[], trashed: boolean) => void;
  setArchived: (ids: string[], archived: boolean) => void;
  update: (id: string, patch: Partial<Note>, history?: boolean) => void;
}

export const AppContext = createContext<AppApi>(null as unknown as AppApi);
export const useApp = () => useContext(AppContext);
