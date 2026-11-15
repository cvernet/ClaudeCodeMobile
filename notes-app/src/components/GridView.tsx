import { CheckSquare, Lightbulb } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { createNote, findFreeSpot, isNoteEmpty } from '../store';
import type { Note } from '../types';
import { NoteBody } from './NoteBody';
import { NoteCard } from './NoteCard';
import { NoteToolbar, PinButton } from './NoteToolbar';

export interface ComposerHandle {
  open: () => void;
}

/** Barre « Créer une note… » qui se déplie comme dans Keep et enregistre au clic extérieur. */
export const Composer = forwardRef<ComposerHandle, { labelId?: string }>(function Composer({ labelId }, ref) {
  const { data, dispatch } = useApp();
  const [note, setNote] = useState<Note | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  const start = useCallback(
    (type: Note['type'] = 'text') =>
      setNote(
        createNote({ type, labels: labelId ? [labelId] : [] }),
      ),
    [labelId],
  );

  useImperativeHandle(ref, () => ({ open: () => start('text') }), [start]);

  const commit = useCallback(() => {
    const n = noteRef.current;
    if (n && !isNoteEmpty(n)) {
      const now = Date.now();
      dispatch({ type: 'addNote', note: { ...n, ...findFreeSpot(data.notes), createdAt: now, updatedAt: now } });
    }
    setNote(null);
  }, [data.notes, dispatch]);

  useEffect(() => {
    if (!note) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (boxRef.current?.contains(t) || t.closest('.popover')) return;
      commit();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && commit();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [note, commit]);

  if (!note) {
    return (
      <div className="composer collapsed" onClick={() => start('text')}>
        <span className="composer-placeholder">Créer une note…</span>
        <button
          type="button"
          className="icon-btn"
          title="Nouvelle liste"
          aria-label="Nouvelle liste"
          onClick={(e) => {
            e.stopPropagation();
            start('checklist');
          }}
        >
          <CheckSquare size={20} />
        </button>
      </div>
    );
  }

  const onChange = (patch: Partial<Note>) => setNote((n) => (n ? { ...n, ...patch } : n));
  return (
    <div ref={boxRef} className={`composer expanded note-color-${note.color}`}>
      <PinButton note={note} onChange={onChange} />
      <NoteBody note={note} onChange={onChange} autoFocus={note.type === 'text' ? 'content' : undefined} />
      {note.labels.length > 0 && (
        <div className="chips">
          {data.labels
            .filter((l) => note.labels.includes(l.id))
            .map((l) => (
              <span className="chip" key={l.id}>
                {l.name}
              </span>
            ))}
        </div>
      )}
      <div className="note-editor-footer">
        <NoteToolbar note={note} onChange={onChange} draft popoverPlacement="top" />
        <button type="button" className="text-btn" onClick={commit}>
          Fermer
        </button>
      </div>
    </div>
  );
});

/** Grille « maçonnerie » : remplit d'abord la colonne la plus courte, lecture ligne par ligne. */
function Masonry({ notes }: { notes: Note[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setCols(Math.max(1, Math.min(6, Math.floor((w + 16) / 256))) || 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns: Note[][] = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);
  for (const n of notes) {
    const text = n.type === 'text' ? n.content : n.items.slice(0, 8).map((i) => i.text).join('\n');
    const lines = Math.min(12, text.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / 28)), 0));
    const est = 70 + (n.title ? 28 : 0) + lines * 21 + (n.labels.length ? 30 : 0);
    const i = heights.indexOf(Math.min(...heights));
    columns[i].push(n);
    heights[i] += est;
  }

  return (
    <div className="masonry" ref={ref} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {columns.map((col, i) => (
        <div className="masonry-col" key={i}>
          {col.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function GridView({
  notes,
  showComposer,
  labelId,
  emptyText,
  composerRef,
  header,
}: {
  notes: Note[];
  showComposer: boolean;
  labelId?: string;
  emptyText: string;
  composerRef?: React.Ref<ComposerHandle>;
  header?: React.ReactNode;
}) {
  const { query } = useApp();
  const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);
  const pinned = sorted.filter((n) => n.pinned && !n.trashed);
  const others = sorted.filter((n) => !n.pinned || n.trashed);

  return (
    <div className="grid-view">
      {showComposer && <Composer ref={composerRef} labelId={labelId} />}
      {header}
      {!notes.length ? (
        <div className="empty-state">
          <Lightbulb size={96} strokeWidth={1} />
          <p>{query ? 'Aucun résultat' : emptyText}</p>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <>
              <h2 className="section-title">Épinglées</h2>
              <Masonry notes={pinned} />
              {others.length > 0 && <h2 className="section-title">Autres</h2>}
            </>
          )}
          <Masonry notes={others} />
        </>
      )}
    </div>
  );
}
