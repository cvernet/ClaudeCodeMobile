import {
  Archive,
  ArchiveRestore,
  CheckSquare,
  Copy,
  Palette,
  Pin,
  PinOff,
  RotateCcw,
  Tag,
  Trash2,
  Type,
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context';
import { createNote, findFreeSpot } from '../store';
import type { Note } from '../types';
import { toggleType } from './NoteBody';
import { ColorPicker, LabelPicker, Popover } from './Pickers';

/**
 * Barre d'actions d'une note. `onChange` applique un patch ; `onDone` est appelé quand la note
 * quitte la vue courante (archivage, corbeille) pour par ex. fermer l'éditeur.
 */
export function NoteToolbar({
  note,
  onChange,
  onDone,
  draft,
  compact,
}: {
  note: Note;
  onChange: (patch: Partial<Note>) => void;
  onDone?: () => void;
  /** Note pas encore enregistrée : pas d'archivage / suppression. */
  draft?: boolean;
  compact?: boolean;
}) {
  const { setTrashed, setArchived, dispatch, data, showToast } = useApp();
  const [pop, setPop] = useState<'color' | 'labels' | null>(null);
  const size = compact ? 16 : 18;

  if (note.trashed) {
    return (
      <div className="note-toolbar">
        <button
          type="button"
          className="icon-btn"
          title="Restaurer"
          aria-label="Restaurer"
          onClick={() => {
            setTrashed([note.id], false);
            onDone?.();
          }}
        >
          <RotateCcw size={size} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Supprimer définitivement"
          aria-label="Supprimer définitivement"
          onClick={() => {
            dispatch({ type: 'deleteForever', ids: [note.id] });
            showToast({ message: 'Note supprimée définitivement', actionLabel: 'Annuler', onAction: () => dispatch({ type: 'undo' }) });
            onDone?.();
          }}
        >
          <Trash2 size={size} />
        </button>
      </div>
    );
  }

  return (
    <div className="note-toolbar" onClick={(e) => e.stopPropagation()}>
      <div className="popover-anchor">
        <button
          type="button"
          className={`icon-btn ${pop === 'color' ? 'active' : ''}`}
          title="Couleur"
          aria-label="Couleur"
          onClick={() => setPop(pop === 'color' ? null : 'color')}
        >
          <Palette size={size} />
        </button>
        <Popover open={pop === 'color'} onClose={() => setPop(null)}>
          <ColorPicker value={note.color} onChange={(color) => onChange({ color })} />
        </Popover>
      </div>
      <div className="popover-anchor">
        <button
          type="button"
          className={`icon-btn ${pop === 'labels' ? 'active' : ''}`}
          title="Libellés"
          aria-label="Libellés"
          onClick={() => setPop(pop === 'labels' ? null : 'labels')}
        >
          <Tag size={size} />
        </button>
        <Popover open={pop === 'labels'} onClose={() => setPop(null)}>
          <LabelPicker selected={note.labels} onChange={(labels) => onChange({ labels })} />
        </Popover>
      </div>
      <button
        type="button"
        className="icon-btn"
        title={note.type === 'text' ? 'Afficher les cases à cocher' : 'Masquer les cases à cocher'}
        aria-label={note.type === 'text' ? 'Afficher les cases à cocher' : 'Masquer les cases à cocher'}
        onClick={() => onChange(toggleType(note))}
      >
        {note.type === 'text' ? <CheckSquare size={size} /> : <Type size={size} />}
      </button>
      {!draft && (
        <>
          <button
            type="button"
            className="icon-btn"
            title={note.archived ? 'Désarchiver' : 'Archiver'}
            aria-label={note.archived ? 'Désarchiver' : 'Archiver'}
            onClick={() => {
              setArchived([note.id], !note.archived);
              onDone?.();
            }}
          >
            {note.archived ? <ArchiveRestore size={size} /> : <Archive size={size} />}
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Dupliquer"
            aria-label="Dupliquer"
            onClick={() => {
              const { id: _id, ...rest } = note;
              void _id;
              const spot = findFreeSpot(data.notes, note.w, note.h);
              dispatch({
                type: 'addNote',
                note: createNote({ ...rest, ...spot, title: note.title, pinned: false, createdAt: Date.now() }),
              });
              showToast({ message: 'Note dupliquée' });
            }}
          >
            <Copy size={size} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Supprimer"
            aria-label="Supprimer"
            onClick={() => {
              setTrashed([note.id], true);
              onDone?.();
            }}
          >
            <Trash2 size={size} />
          </button>
        </>
      )}
    </div>
  );
}

export function PinButton({ note, onChange }: { note: Note; onChange: (p: Partial<Note>) => void }) {
  if (note.trashed) return null;
  return (
    <button
      type="button"
      className={`icon-btn pin-btn ${note.pinned ? 'pinned' : ''}`}
      title={note.pinned ? 'Retirer' : 'Épingler'}
      aria-label={note.pinned ? 'Retirer' : 'Épingler la note'}
      onClick={(e) => {
        e.stopPropagation();
        onChange({ pinned: !note.pinned });
      }}
    >
      {note.pinned ? <PinOff size={18} /> : <Pin size={18} />}
    </button>
  );
}
