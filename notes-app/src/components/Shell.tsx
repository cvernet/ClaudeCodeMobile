import {
  Archive,
  Check,
  Download,
  LayoutGrid,
  Lightbulb,
  Menu,
  Moon,
  MoreVertical,
  Pencil,
  Plus,
  Redo2,
  Search,
  Sun,
  Tag,
  Trash2,
  Undo2,
  Upload,
  Waypoints,
  X,
} from 'lucide-react';
import { forwardRef, useRef, useState } from 'react';
import { useApp, type Toast } from '../context';
import { isAppData, normalizeData, uid } from '../store';
import type { Layout, View } from '../types';
import { Popover } from './Pickers';

export function Sidebar({
  view,
  setView,
  open,
  collapsed,
  onClose,
  onEditLabels,
  counts,
}: {
  view: View;
  setView: (v: View) => void;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onEditLabels: () => void;
  counts: { notes: number; archive: number; trash: number };
}) {
  const { data } = useApp();
  const item = (v: View, icon: React.ReactNode, label: string, count?: number) => {
    const active = v.kind === view.kind && (v.kind !== 'label' || (view.kind === 'label' && view.id === v.id));
    return (
      <button
        type="button"
        key={v.kind === 'label' ? v.id : v.kind}
        className={`nav-item ${active ? 'active' : ''}`}
        onClick={() => {
          setView(v);
          onClose();
        }}
        title={label}
      >
        {icon}
        <span className="nav-label">{label}</span>
        {count !== undefined && count > 0 && <span className="nav-count">{count}</span>}
      </button>
    );
  };
  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
      <nav className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`} aria-label="Navigation">
        {item({ kind: 'notes' }, <Lightbulb size={20} />, 'Notes', counts.notes)}
        {data.labels.length > 0 && <div className="nav-heading">Libellés</div>}
        {[...data.labels]
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          .map((l) => item({ kind: 'label', id: l.id }, <Tag size={20} />, l.name))}
        <button type="button" className="nav-item" onClick={onEditLabels} title="Modifier les libellés">
          <Pencil size={20} />
          <span className="nav-label">Modifier les libellés</span>
        </button>
        <div className="nav-sep" />
        {item({ kind: 'archive' }, <Archive size={20} />, 'Archives', counts.archive)}
        {item({ kind: 'trash' }, <Trash2 size={20} />, 'Corbeille', counts.trash)}
      </nav>
    </>
  );
}

export const TopBar = forwardRef<
  HTMLInputElement,
  {
    onMenu: () => void;
    query: string;
    setQuery: (q: string) => void;
    layout: Layout;
    setLayout: (l: Layout) => void;
    boardAvailable: boolean;
    canUndo: boolean;
    canRedo: boolean;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    title: string;
  }
>(function TopBar(props, searchRef) {
  const { data, dispatch, showToast } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `notes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMenuOpen(false);
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!isAppData(parsed)) throw new Error('format');
      dispatch({ type: 'replaceData', data: normalizeData(parsed) });
      showToast({ message: `${parsed.notes.length} notes importées`, actionLabel: 'Annuler', onAction: () => dispatch({ type: 'undo' }) });
    } catch {
      showToast({ message: "Fichier invalide : impossible d'importer" });
    }
  };

  return (
    <header className={`topbar ${searchOpen ? 'search-open' : ''}`}>
      <button type="button" className="icon-btn" aria-label="Menu principal" onClick={props.onMenu}>
        <Menu size={22} />
      </button>
      <div className="brand">
        <img src="./icon.svg" alt="" width={32} height={32} />
        <span>{props.title}</span>
      </div>
      <label className="search">
        <Search size={20} />
        <input
          ref={searchRef}
          type="search"
          placeholder="Rechercher"
          value={props.query}
          onChange={(e) => props.setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              props.setQuery('');
              (e.target as HTMLInputElement).blur();
              setSearchOpen(false);
            }
          }}
          aria-label="Rechercher dans les notes"
        />
        {(props.query || searchOpen) && (
          <button
            type="button"
            className="icon-btn tiny"
            aria-label="Effacer la recherche"
            onClick={() => {
              props.setQuery('');
              setSearchOpen(false);
            }}
          >
            <X size={18} />
          </button>
        )}
      </label>
      <div className="topbar-actions">
        <button
          type="button"
          className="icon-btn search-toggle"
          aria-label="Rechercher"
          onClick={() => {
            setSearchOpen(true);
            setTimeout(() => (searchRef as React.RefObject<HTMLInputElement>).current?.focus(), 0);
          }}
        >
          <Search size={20} />
        </button>
        <div className="segmented" role="tablist" aria-label="Affichage">
          <button
            type="button"
            role="tab"
            aria-selected={props.layout === 'grid'}
            className={props.layout === 'grid' ? 'active' : ''}
            onClick={() => props.setLayout('grid')}
            title="Vue grille"
          >
            <LayoutGrid size={18} />
            <span>Grille</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.layout === 'board'}
            className={props.layout === 'board' ? 'active' : ''}
            onClick={() => props.setLayout('board')}
            disabled={!props.boardAvailable}
            title={props.boardAvailable ? 'Vue tableau blanc' : 'Tableau indisponible pour cette vue'}
          >
            <Waypoints size={18} />
            <span>Tableau</span>
          </button>
        </div>
        <button
          type="button"
          className="icon-btn hide-sm"
          aria-label="Annuler"
          title="Annuler (Ctrl+Z)"
          disabled={!props.canUndo}
          onClick={() => dispatch({ type: 'undo' })}
        >
          <Undo2 size={20} />
        </button>
        <button
          type="button"
          className="icon-btn hide-sm"
          aria-label="Rétablir"
          title="Rétablir (Ctrl+Maj+Z)"
          disabled={!props.canRedo}
          onClick={() => dispatch({ type: 'redo' })}
        >
          <Redo2 size={20} />
        </button>
        <button
          type="button"
          className="icon-btn hide-sm"
          aria-label={props.theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          title={props.theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          onClick={props.toggleTheme}
        >
          {props.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="popover-anchor">
          <button type="button" className="icon-btn" aria-label="Plus d'options" onClick={() => setMenuOpen((o) => !o)}>
            <MoreVertical size={20} />
          </button>
          <Popover open={menuOpen} onClose={() => setMenuOpen(false)} align="right">
            <div className="menu">
              <button type="button" className="menu-item show-sm" disabled={!props.canUndo} onClick={() => dispatch({ type: 'undo' })}>
                <Undo2 size={18} /> Annuler
              </button>
              <button type="button" className="menu-item show-sm" disabled={!props.canRedo} onClick={() => dispatch({ type: 'redo' })}>
                <Redo2 size={18} /> Rétablir
              </button>
              <button
                type="button"
                className="menu-item show-sm"
                onClick={() => {
                  props.toggleTheme();
                  setMenuOpen(false);
                }}
              >
                {props.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                {props.theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
              </button>
              <button type="button" className="menu-item" onClick={exportData}>
                <Download size={18} /> Exporter (JSON)
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  fileRef.current?.click();
                  setMenuOpen(false);
                }}
              >
                <Upload size={18} /> Importer…
              </button>
            </div>
          </Popover>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
});

export function LabelsDialog({ onClose }: { onClose: () => void }) {
  const { data, dispatch } = useApp();
  const [name, setName] = useState('');
  const create = () => {
    const n = name.trim();
    if (!n || data.labels.some((l) => l.name.toLowerCase() === n.toLowerCase())) return;
    dispatch({ type: 'addLabel', label: { id: uid(), name: n } });
    setName('');
  };
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="modal labels-dialog" role="dialog" aria-modal="true" aria-label="Modifier les libellés">
        <h2>Modifier les libellés</h2>
        <div className="label-row">
          <Plus size={18} />
          <input
            autoFocus
            placeholder="Créer un libellé"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button type="button" className="icon-btn tiny" aria-label="Créer" onClick={create} disabled={!name.trim()}>
            <Check size={18} />
          </button>
        </div>
        {data.labels.map((l) => (
          <div className="label-row" key={l.id}>
            <button
              type="button"
              className="icon-btn tiny"
              aria-label={`Supprimer le libellé ${l.name}`}
              title="Supprimer le libellé"
              onClick={() => dispatch({ type: 'deleteLabel', id: l.id })}
            >
              <Trash2 size={16} />
            </button>
            <input
              defaultValue={l.name}
              aria-label="Nom du libellé"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== l.name) dispatch({ type: 'renameLabel', id: l.id, name: v });
                else e.target.value = l.name;
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <Pencil size={16} className="muted" />
          </div>
        ))}
        <div className="dialog-actions">
          <button type="button" className="text-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastView({ toast, onClose }: { toast: Toast | null; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <span>{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            toast.onAction?.();
            onClose();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button type="button" className="icon-btn tiny" aria-label="Fermer" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
