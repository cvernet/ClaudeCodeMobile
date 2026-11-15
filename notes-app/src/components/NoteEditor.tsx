import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { isNoteEmpty } from '../store';
import type { Note } from '../types';
import { NoteBody } from './NoteBody';
import { LabelChips } from './NoteCard';
import { NoteToolbar, PinButton } from './NoteToolbar';

function formatDate(t: number) {
  const d = new Date(t);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Éditeur modal. Une note existante est modifiée en direct (un seul point d'annulation par
 * session d'édition). Un brouillon n'est ajouté qu'au premier contenu saisi : une note laissée
 * vide n'est donc jamais créée.
 */
export function NoteEditor({ id, draft, onClose: close }: { id: string | null; draft?: Note; onClose: () => void }) {
  const { data, dispatch } = useApp();
  const [currentId, setCurrentId] = useState<string | null>(id);
  const [draftNote, setDraftNote] = useState<Note | undefined>(draft);
  const note = currentId ? data.notes.find((n) => n.id === currentId) : draftNote;

  // Toute la session d'édition = une seule étape d'annulation.
  const baseRef = useRef(data);
  useEffect(() => {
    if (id) dispatch({ type: 'checkpoint' });
  }, [id, dispatch]);
  const onClose = useCallback(() => {
    dispatch({ type: 'squash', base: baseRef.current });
    close();
  }, [dispatch, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (currentId && !note) onClose();
  }, [currentId, note, onClose]);

  if (!note) return null;

  const onChange = (patch: Partial<Note>) => {
    const stamped = { ...patch, updatedAt: Date.now() };
    if (currentId) {
      dispatch({ type: 'updateNote', id: currentId, patch: stamped, history: false });
      return;
    }
    const next = { ...note, ...stamped };
    if (isNoteEmpty(next)) {
      setDraftNote(next);
    } else {
      dispatch({ type: 'addNote', note: next });
      setCurrentId(next.id);
    }
  };

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal note-editor note-color-${note.color}`}
        role="dialog"
        aria-modal="true"
        aria-label="Modifier la note"
      >
        <PinButton note={note} onChange={onChange} />
        <div className="note-editor-scroll">
          <NoteBody
            note={note}
            onChange={onChange}
            readOnly={note.trashed}
            autoFocus={currentId ? undefined : note.type === 'text' ? 'content' : undefined}
          />
          {currentId && <LabelChips note={note} removable={!note.trashed} />}
          {currentId && (
            <div className="note-editor-meta">
              {note.trashed ? 'Note dans la corbeille · ' : ''}Modifiée {formatDate(note.updatedAt)}
            </div>
          )}
        </div>
        <div className="note-editor-footer">
          <NoteToolbar note={note} onChange={onChange} onDone={onClose} draft={!currentId} />
          <button type="button" className="text-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
