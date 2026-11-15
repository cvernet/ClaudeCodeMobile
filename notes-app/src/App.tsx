import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BoardView } from './components/BoardView';
import { GridView, type ComposerHandle } from './components/GridView';
import { NoteEditor } from './components/NoteEditor';
import { LabelsDialog, Sidebar, ToastView, TopBar } from './components/Shell';
import { AppContext, type AppApi, type Toast } from './context';
import { loadData, noteMatches, saveData, storeReducer } from './store';
import type { Layout, Note, View } from './types';

const PREFS_KEY = 'notes-board:prefs';

interface Prefs {
  layout: Layout;
  theme: 'light' | 'dark';
  collapsed: boolean;
}

function loadPrefs(): Prefs {
  const dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const defaults: Prefs = { layout: 'grid', theme: dark ? 'dark' : 'light', collapsed: false };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable="true"]');

export default function App() {
  const [store, dispatch] = useReducer(storeReducer, undefined, () => ({ data: loadData(), past: [], future: [] }));
  const { data } = store;
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [view, setView] = useState<View>({ kind: 'notes' });
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<{ id: string | null; draft?: Note; key: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [addSignal, setAddSignal] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<ComposerHandle>(null);

  // Sauvegarde différée dans le stockage local.
  useEffect(() => {
    const t = setTimeout(() => saveData(data), 250);
    return () => clearTimeout(t);
  }, [data]);
  useEffect(() => {
    const flush = () => saveData(data);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.theme = prefs.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', prefs.theme === 'dark' ? '#202124' : '#ffffff');
  }, [prefs]);

  // Un libellé supprimé ne peut plus être la vue courante.
  useEffect(() => {
    if (view.kind === 'label' && !data.labels.some((l) => l.id === view.id)) setView({ kind: 'notes' });
  }, [data.labels, view]);

  const showToast = useCallback((t: Omit<Toast, 'id'>) => setToast({ ...t, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const update = useCallback(
    (id: string, patch: Partial<Note>, history = true) =>
      dispatch({ type: 'updateNote', id, patch: { ...patch, updatedAt: Date.now() }, history }),
    [],
  );

  const setTrashed = useCallback(
    (ids: string[], trashed: boolean) => {
      if (!ids.length) return;
      dispatch({ type: 'updateNotes', patches: ids.map((id) => ({ id, patch: { trashed } })) });
      const n = ids.length;
      showToast({
        message: trashed ? (n > 1 ? `${n} notes placées dans la corbeille` : 'Note placée dans la corbeille') : n > 1 ? `${n} notes restaurées` : 'Note restaurée',
        actionLabel: 'Annuler',
        onAction: () => dispatch({ type: 'updateNotes', patches: ids.map((id) => ({ id, patch: { trashed: !trashed } })) }),
      });
    },
    [showToast],
  );

  const setArchived = useCallback(
    (ids: string[], archived: boolean) => {
      if (!ids.length) return;
      dispatch({ type: 'updateNotes', patches: ids.map((id) => ({ id, patch: { archived } })) });
      showToast({
        message: archived ? 'Note archivée' : 'Note désarchivée',
        actionLabel: 'Annuler',
        onAction: () => dispatch({ type: 'updateNotes', patches: ids.map((id) => ({ id, patch: { archived: !archived } })) }),
      });
    },
    [showToast],
  );

  const openEditor = useCallback((id: string | null, draft?: Note) => setEditor({ id, draft, key: Date.now() }), []);
  const closeEditor = useCallback(() => setEditor(null), []);

  const api: AppApi = useMemo(
    () => ({ data, dispatch, query, openEditor, showToast, setTrashed, setArchived, update }),
    [data, query, openEditor, showToast, setTrashed, setArchived, update],
  );

  /* ---------- Filtrage ---------- */
  const scoped = useMemo(() => {
    switch (view.kind) {
      case 'archive':
        return data.notes.filter((n) => n.archived && !n.trashed);
      case 'trash':
        return data.notes.filter((n) => n.trashed);
      case 'label':
        return data.notes.filter((n) => !n.archived && !n.trashed && n.labels.includes(view.id));
      default:
        return data.notes.filter((n) => !n.archived && !n.trashed);
    }
  }, [data.notes, view]);
  const filtered = useMemo(() => scoped.filter((n) => noteMatches(n, query, data.labels)), [scoped, query, data.labels]);

  const boardAvailable = view.kind === 'notes' || view.kind === 'label';
  const layout: Layout = boardAvailable ? prefs.layout : 'grid';
  const counts = {
    notes: data.notes.filter((n) => !n.archived && !n.trashed).length,
    archive: data.notes.filter((n) => n.archived && !n.trashed).length,
    trash: data.notes.filter((n) => n.trashed).length,
  };
  const labelName = view.kind === 'label' ? data.labels.find((l) => l.id === view.id)?.name : undefined;
  const title =
    view.kind === 'archive' ? 'Archives' : view.kind === 'trash' ? 'Corbeille' : view.kind === 'label' ? labelName ?? 'Notes' : 'Notes';

  const newNote = useCallback(() => {
    if (layout === 'board') setAddSignal((s) => s + 1);
    else if (boardAvailable) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      composerRef.current?.open();
    }
  }, [layout, boardAvailable]);

  /* ---------- Raccourcis globaux ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !isTyping(e.target) && !editor) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'y' && !isTyping(e.target) && !editor) {
        e.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (mod || e.altKey || isTyping(e.target) || editor || labelsOpen) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        newNote();
      } else if (e.key.toLowerCase() === 'g') {
        setPrefs((p) => ({ ...p, layout: 'grid' }));
      } else if (e.key.toLowerCase() === 't' && boardAvailable) {
        setPrefs((p) => ({ ...p, layout: 'board' }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, labelsOpen, newNote, boardAvailable]);

  const onMenu = () => {
    if (window.matchMedia('(max-width: 720px)').matches) setDrawerOpen((o) => !o);
    else setPrefs((p) => ({ ...p, collapsed: !p.collapsed }));
  };

  return (
    <AppContext.Provider value={api}>
      <div className={`app layout-${layout}`}>
        <TopBar
          ref={searchRef}
          onMenu={onMenu}
          query={query}
          setQuery={setQuery}
          layout={layout}
          setLayout={(l) => setPrefs((p) => ({ ...p, layout: l }))}
          boardAvailable={boardAvailable}
          canUndo={store.past.some((p) => p !== data)}
          canRedo={store.future.length > 0}
          theme={prefs.theme}
          toggleTheme={() => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
          title={title}
        />
        <div className="main">
          <Sidebar
            view={view}
            setView={setView}
            open={drawerOpen}
            collapsed={prefs.collapsed}
            onClose={() => setDrawerOpen(false)}
            onEditLabels={() => {
              setLabelsOpen(true);
              setDrawerOpen(false);
            }}
            counts={counts}
          />
          <main className="content">
            {layout === 'board' ? (
              <BoardView
                notes={scoped}
                labelId={view.kind === 'label' ? view.id : undefined}
                addSignal={addSignal}
              />
            ) : (
              <GridView
                notes={filtered}
                showComposer={boardAvailable}
                labelId={view.kind === 'label' ? view.id : undefined}
                composerRef={composerRef}
                emptyText={
                  view.kind === 'trash'
                    ? 'Aucune note dans la corbeille'
                    : view.kind === 'archive'
                      ? 'Vos notes archivées s’affichent ici'
                      : view.kind === 'label'
                        ? 'Aucune note avec ce libellé'
                        : 'Les notes que vous ajoutez s’affichent ici'
                }
                header={
                  view.kind === 'trash' && scoped.length > 0 ? (
                    <div className="trash-header">
                      <span>Les notes de la corbeille sont conservées jusqu'à ce que vous la vidiez.</span>
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => {
                          dispatch({ type: 'emptyTrash' });
                          showToast({ message: 'Corbeille vidée', actionLabel: 'Annuler', onAction: () => dispatch({ type: 'undo' }) });
                        }}
                      >
                        Vider la corbeille
                      </button>
                    </div>
                  ) : null
                }
              />
            )}
          </main>
        </div>
        {boardAvailable && layout === 'grid' && (
          <button type="button" className="fab" aria-label="Nouvelle note" onClick={newNote}>
            <Plus size={26} />
          </button>
        )}
        {editor && <NoteEditor key={editor.key} id={editor.id} draft={editor.draft} onClose={closeEditor} />}
        {labelsOpen && <LabelsDialog onClose={() => setLabelsOpen(false)} />}
        <ToastView toast={toast} onClose={() => setToast(null)} />
      </div>
    </AppContext.Provider>
  );
}
