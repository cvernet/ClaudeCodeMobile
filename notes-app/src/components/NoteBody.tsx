import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { uid } from '../store';
import type { ChecklistItem, Note } from '../types';

type Editable = Pick<Note, 'title' | 'content' | 'type' | 'items'>;

function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}

/** Convertit un texte en liste de cases à cocher, et inversement. */
export function toggleType(n: Editable): Partial<Note> {
  if (n.type === 'text') {
    const items = n.content
      .split('\n')
      .map((l) => l.replace(/^\s*([-*•]|\[ ?x?\])\s*/i, '').trim())
      .filter(Boolean)
      .map((text) => ({ id: uid(), text, done: false }));
    return { type: 'checklist', items, content: '' };
  }
  return {
    type: 'text',
    content: n.items.map((i) => (i.done ? '✓ ' : '') + i.text).join('\n'),
    items: [],
  };
}

export function NoteBody({
  note,
  onChange,
  readOnly,
  autoFocus,
}: {
  note: Editable;
  onChange: (patch: Partial<Note>) => void;
  readOnly?: boolean;
  autoFocus?: 'title' | 'content';
}) {
  return (
    <div className="note-body">
      <AutoTextarea
        className="note-title-input"
        placeholder="Titre"
        value={note.title}
        readOnly={readOnly}
        autoFocus={autoFocus === 'title'}
        onChange={(e) => onChange({ title: e.target.value.replace(/\n/g, ' ') })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.currentTarget.parentElement?.querySelector('.note-content-input, .checklist-new input') as HTMLElement)?.focus();
          }
        }}
      />
      {note.type === 'text' ? (
        <AutoTextarea
          className="note-content-input"
          placeholder="Créer une note…"
          value={note.content}
          readOnly={readOnly}
          autoFocus={autoFocus === 'content'}
          onChange={(e) => onChange({ content: e.target.value })}
        />
      ) : (
        <ChecklistEditor items={note.items} readOnly={readOnly} onChange={(items) => onChange({ items })} />
      )}
    </div>
  );
}

function ChecklistEditor({
  items,
  onChange,
  readOnly,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  readOnly?: boolean;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusId) return;
    const el = listRef.current?.querySelector<HTMLInputElement>(`[data-item="${focusId}"]`);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setFocusId(null);
  }, [focusId]);

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const set = (id: string, patch: Partial<ChecklistItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const insertAfter = (id: string | null) => {
    const item = { id: uid(), text: '', done: false };
    const idx = id ? items.findIndex((i) => i.id === id) + 1 : items.length;
    onChange([...items.slice(0, idx), item, ...items.slice(idx)]);
    setFocusId(item.id);
  };

  const remove = (id: string) => {
    const visible = todo.concat(done);
    const idx = visible.findIndex((i) => i.id === id);
    onChange(items.filter((i) => i.id !== id));
    const prev = visible[idx - 1];
    if (prev) setFocusId(prev.id);
  };

  const row = (item: ChecklistItem) => (
    <div key={item.id} className={`checklist-row ${item.done ? 'done' : ''}`}>
      <input
        type="checkbox"
        checked={item.done}
        disabled={readOnly}
        aria-label={item.done ? 'Décocher' : 'Cocher'}
        onChange={() => set(item.id, { done: !item.done })}
      />
      <input
        className="checklist-text"
        data-item={item.id}
        value={item.text}
        readOnly={readOnly}
        onChange={(e) => set(item.id, { text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            insertAfter(item.id);
          } else if (e.key === 'Backspace' && !item.text) {
            e.preventDefault();
            remove(item.id);
          }
        }}
        onPaste={(e) => {
          const lines = e.clipboardData.getData('text').split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length < 2) return;
          e.preventDefault();
          const idx = items.findIndex((i) => i.id === item.id);
          const extra = lines.slice(1).map((text) => ({ id: uid(), text, done: false }));
          const merged = { ...item, text: item.text + lines[0] };
          onChange([...items.slice(0, idx), merged, ...extra, ...items.slice(idx + 1)]);
        }}
      />
      {!readOnly && (
        <button type="button" className="icon-btn tiny" aria-label="Supprimer l'élément" onClick={() => remove(item.id)}>
          <X size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="checklist" ref={listRef}>
      {todo.map(row)}
      {!readOnly && (
        <div className="checklist-row checklist-new">
          <Plus size={18} />
          <input
            placeholder="Élément de liste"
            value=""
            onChange={(e) => {
              const item = { id: uid(), text: e.target.value, done: false };
              onChange([...items, item]);
              setFocusId(item.id);
            }}
          />
        </div>
      )}
      {done.length > 0 && (
        <>
          <button type="button" className="checklist-done-toggle" onClick={() => setShowDone((s) => !s)}>
            {showDone ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {done.length} élément{done.length > 1 ? 's' : ''} coché{done.length > 1 ? 's' : ''}
          </button>
          {showDone && done.map(row)}
        </>
      )}
    </div>
  );
}
