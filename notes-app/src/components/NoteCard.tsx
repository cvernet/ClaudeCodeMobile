import { X } from 'lucide-react';
import { useApp } from '../context';
import type { Note } from '../types';
import { NoteToolbar, PinButton } from './NoteToolbar';

export function LabelChips({ note, removable }: { note: Note; removable?: boolean }) {
  const { data, update } = useApp();
  const labels = data.labels.filter((l) => note.labels.includes(l.id));
  if (!labels.length) return null;
  return (
    <div className="chips">
      {labels.map((l) => (
        <span key={l.id} className="chip">
          {l.name}
          {removable && (
            <button
              type="button"
              aria-label={`Retirer le libellé ${l.name}`}
              onClick={(e) => {
                e.stopPropagation();
                update(note.id, { labels: note.labels.filter((x) => x !== l.id) });
              }}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

/** Aperçu du contenu d'une note (partagé entre la grille et le tableau). */
export function NotePreview({ note, maxItems = 8 }: { note: Note; maxItems?: number }) {
  const { update } = useApp();
  if (note.type === 'text') {
    return note.content ? <div className="note-preview-text">{note.content}</div> : null;
  }
  const todo = note.items.filter((i) => !i.done);
  const done = note.items.filter((i) => i.done);
  const shown = todo.slice(0, maxItems);
  return (
    <div className="note-preview-list">
      {shown.map((i) => (
        <label key={i.id} className="preview-item" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={false}
            disabled={note.trashed}
            onChange={() => update(note.id, { items: note.items.map((x) => (x.id === i.id ? { ...x, done: true } : x)) })}
          />
          <span>{i.text}</span>
        </label>
      ))}
      {todo.length > shown.length && <div className="muted small">… {todo.length - shown.length} de plus</div>}
      {done.length > 0 && (
        <div className="muted small">
          + {done.length} élément{done.length > 1 ? 's' : ''} coché{done.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export function NoteCard({ note }: { note: Note }) {
  const { openEditor, update } = useApp();
  const onChange = (patch: Partial<Note>) => update(note.id, patch);
  return (
    <article
      className={`note-card note-color-${note.color}`}
      tabIndex={0}
      data-note={note.id}
      onClick={() => openEditor(note.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) openEditor(note.id);
      }}
    >
      <PinButton note={note} onChange={onChange} />
      {note.title && <h3 className="note-card-title">{note.title}</h3>}
      <NotePreview note={note} />
      {!note.title && !note.content && !note.items.length && <div className="muted">Note vide</div>}
      <LabelChips note={note} removable={!note.trashed} />
      <NoteToolbar note={note} onChange={onChange} compact />
    </article>
  );
}
