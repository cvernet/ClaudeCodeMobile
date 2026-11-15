import { Check, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../context';
import { uid } from '../store';
import { COLOR_NAMES, NOTE_COLORS, type NoteColor } from '../types';

/** Petit panneau flottant qui se ferme au clic extérieur ou sur Échap. */
export function Popover({
  open,
  onClose,
  children,
  align = 'left',
  placement = 'bottom',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right' | 'center';
  placement?: 'bottom' | 'top';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={`popover popover-${align} popover-${placement}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: NoteColor; onChange: (c: NoteColor) => void }) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Couleur de la note">
      {NOTE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          className={`swatch note-color-${c} ${value === c ? 'active' : ''}`}
          title={COLOR_NAMES[c]}
          aria-label={COLOR_NAMES[c]}
          onClick={() => onChange(c)}
        >
          {value === c && <Check size={16} />}
        </button>
      ))}
    </div>
  );
}

export function LabelPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const { data, dispatch } = useApp();
  const [filter, setFilter] = useState('');
  const f = filter.trim().toLowerCase();
  const shown = data.labels.filter((l) => l.name.toLowerCase().includes(f));
  const exact = data.labels.some((l) => l.name.toLowerCase() === f);

  const create = () => {
    const name = filter.trim();
    if (!name || exact) return;
    const label = { id: uid(), name };
    dispatch({ type: 'addLabel', label });
    onChange([...selected, label.id]);
    setFilter('');
  };

  return (
    <div className="label-picker">
      <div className="label-picker-title">Libellés</div>
      <label className="label-picker-search">
        <input
          autoFocus
          value={filter}
          placeholder="Saisir un libellé"
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <Search size={14} />
      </label>
      <div className="label-picker-list">
        {shown.map((l) => {
          const on = selected.includes(l.id);
          return (
            <label key={l.id} className="label-picker-item">
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? selected.filter((s) => s !== l.id) : [...selected, l.id])}
              />
              <span>{l.name}</span>
            </label>
          );
        })}
        {!shown.length && !f && <div className="muted small">Aucun libellé pour l'instant.</div>}
      </div>
      {f && !exact && (
        <button type="button" className="label-picker-create" onClick={create}>
          <Plus size={16} /> Créer « {filter.trim()} »
        </button>
      )}
    </div>
  );
}
