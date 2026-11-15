import { BringToFront, Copy, Maximize, Minus, Palette, Plus, StickyNote, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context';
import { createNote, NOTE_H, NOTE_W, noteMatches, uid } from '../store';
import type { Note, NoteColor } from '../types';
import { LabelChips, NotePreview } from './NoteCard';
import { ColorPicker, Popover } from './Pickers';

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const CAM_KEY = 'notes-board:camera';
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

type Interaction =
  | { kind: 'pan'; sx: number; sy: number; cx: number; cy: number; moved: boolean }
  | {
      kind: 'move';
      id: string;
      sx: number;
      sy: number;
      origins: Map<string, { x: number; y: number }>;
      moved: boolean;
      shift: boolean;
    }
  | { kind: 'resize'; id: string; sx: number; sy: number; w: number; h: number; moved: boolean }
  | { kind: 'select'; wx: number; wy: number; base: Set<string> }
  | { kind: 'connect'; from: string }
  | { kind: 'pinch'; dist: number; mx: number; my: number; cam: Camera };

/** Point d'intersection entre le segment centre→cible et le bord du rectangle de la note. */
function edgePoint(n: Note, tx: number, ty: number) {
  const cx = n.x + n.w / 2;
  const cy = n.y + n.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min(dx ? n.w / 2 / Math.abs(dx) : Infinity, dy ? n.h / 2 / Math.abs(dy) : Infinity);
  return { x: cx + dx * s, y: cy + dy * s };
}

function loadCamera(): Camera | null {
  try {
    const c = JSON.parse(localStorage.getItem(CAM_KEY) || 'null');
    if (c && [c.x, c.y, c.zoom].every((v) => typeof v === 'number' && isFinite(v))) return c;
  } catch {
    /* ignore */
  }
  return null;
}

export function BoardView({ notes, labelId, addSignal }: { notes: Note[]; labelId?: string; addSignal: number }) {
  const { data, dispatch, openEditor, query, setTrashed } = useApp();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Camera>(() => loadCamera() ?? { x: 80, y: 80, zoom: 1 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [selConnector, setSelConnector] = useState<string | null>(null);
  const [selectRect, setSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draftLine, setDraftLine] = useState<{ from: string; x: number; y: number } | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [lastColor, setLastColor] = useState<NoteColor>('sand');
  const interaction = useRef<Interaction | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastTap = useRef<{ id: string; t: number } | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const visibleIds = useMemo(() => new Set(notes.map((n) => n.id)), [notes]);
  const byId = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);
  const connectors = data.connectors.filter((c) => visibleIds.has(c.from) && visibleIds.has(c.to));

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CAM_KEY, JSON.stringify(cam));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [cam]);

  // Nettoie la sélection quand des notes disparaissent de la vue.
  useEffect(() => {
    setSelected((s) => {
      const next = new Set([...s].filter((id) => visibleIds.has(id)));
      return next.size === s.size ? s : next;
    });
  }, [visibleIds]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const r = viewportRef.current!.getBoundingClientRect();
    const c = camRef.current;
    return { x: (clientX - r.left - c.x) / c.zoom, y: (clientY - r.top - c.y) / c.zoom };
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number, zoom: number) => {
    const r = viewportRef.current!.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    setCam((c) => {
      const z = clampZoom(zoom);
      const wx = (sx - c.x) / c.zoom;
      const wy = (sy - c.y) / c.zoom;
      return { zoom: z, x: sx - wx * z, y: sy - wy * z };
    });
  }, []);

  const zoomCenter = (factor: number) => {
    const r = viewportRef.current!.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, camRef.current.zoom * factor);
  };

  const fit = useCallback(() => {
    const el = viewportRef.current;
    const list = notesRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!list.length) {
      setCam({ x: r.width / 2 - NOTE_W / 2, y: r.height / 2 - NOTE_H / 2, zoom: 1 });
      return;
    }
    const minX = Math.min(...list.map((n) => n.x));
    const minY = Math.min(...list.map((n) => n.y));
    const maxX = Math.max(...list.map((n) => n.x + n.w));
    const maxY = Math.max(...list.map((n) => n.y + n.h));
    const pad = 64;
    const zoom = clampZoom(Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY), 1.25));
    setCam({
      zoom,
      x: r.width / 2 - ((minX + maxX) / 2) * zoom,
      y: r.height / 2 - ((minY + maxY) / 2) * zoom,
    });
  }, []);

  useLayoutEffect(() => {
    if (!loadCamera()) fit();
  }, [fit]);

  /** Crée une note centrée sur un point monde et ouvre l'éditeur. */
  const createAt = useCallback(
    (wx: number, wy: number, connectFrom?: string) => {
      const note = createNote({
        x: Math.round(wx - NOTE_W / 2),
        y: Math.round(wy - NOTE_H / 2),
        color: lastColor,
        labels: labelId ? [labelId] : [],
      });
      if (connectFrom) {
        // Une note reliée doit exister immédiatement pour porter le lien.
        dispatch({ type: 'addNote', note: { ...note, title: 'Nouvelle idée' } });
        dispatch({ type: 'addConnector', connector: { id: uid(), from: connectFrom, to: note.id } });
        setSelected(new Set([note.id]));
        openEditor(note.id);
      } else {
        openEditor(null, note);
      }
    },
    [dispatch, labelId, lastColor, openEditor],
  );

  const createCenter = useCallback(() => {
    const r = viewportRef.current!.getBoundingClientRect();
    const p = toWorld(r.left + r.width / 2, r.top + r.height / 2);
    const jitter = () => (Math.random() - 0.5) * 60;
    createAt(p.x + jitter(), p.y + jitter());
  }, [createAt, toWorld]);

  // Déclenché par le raccourci « N » / le bouton global.
  const firstSignal = useRef(addSignal);
  useEffect(() => {
    if (addSignal !== firstSignal.current) createCenter();
  }, [addSignal, createCenter]);

  /* ---------- Molette : zoom (souris / pincement trackpad) ou déplacement (trackpad) ---------- */
  useEffect(() => {
    const el = viewportRef.current!;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.board-note-content.scrollable, .popover')) return;
      e.preventDefault();
      const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || e.metaKey || mouseWheel) {
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015) * (e.deltaMode ? 30 : 1));
        zoomAt(e.clientX, e.clientY, camRef.current.zoom * factor);
      } else {
        setCam((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  /* ---------- Gestion globale des déplacements ---------- */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const it = interaction.current;
      if (!it) return;
      if (it.kind === 'pinch') {
        const pts = [...pointers.current.values()];
        if (pts.length < 2) return;
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const r = viewportRef.current!.getBoundingClientRect();
        const z = clampZoom(it.cam.zoom * (dist / it.dist));
        const wx = (it.mx - r.left - it.cam.x) / it.cam.zoom;
        const wy = (it.my - r.top - it.cam.y) / it.cam.zoom;
        setCam({ zoom: z, x: mx - r.left - wx * z, y: my - r.top - wy * z });
        return;
      }
      if (it.kind === 'pan') {
        const dx = e.clientX - it.sx;
        const dy = e.clientY - it.sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) it.moved = true;
        setCam((c) => ({ ...c, x: it.cx + dx, y: it.cy + dy }));
        return;
      }
      const z = camRef.current.zoom;
      if (it.kind === 'move') {
        const dx = (e.clientX - it.sx) / z;
        const dy = (e.clientY - it.sy) / z;
        if (!it.moved) {
          if (Math.abs(dx) * z + Math.abs(dy) * z < 4) return;
          it.moved = true;
          dispatch({ type: 'checkpoint' });
          dispatch({ type: 'bringToFront', ids: [...it.origins.keys()], history: false });
        }
        dispatch({
          type: 'updateNotes',
          history: false,
          patches: [...it.origins].map(([id, o]) => ({ id, patch: { x: Math.round(o.x + dx), y: Math.round(o.y + dy) } })),
        });
      } else if (it.kind === 'resize') {
        const dx = (e.clientX - it.sx) / z;
        const dy = (e.clientY - it.sy) / z;
        if (!it.moved) {
          it.moved = true;
          dispatch({ type: 'checkpoint' });
        }
        dispatch({
          type: 'updateNote',
          id: it.id,
          history: false,
          patch: { w: Math.round(Math.max(140, it.w + dx)), h: Math.round(Math.max(100, it.h + dy)) },
        });
      } else if (it.kind === 'select') {
        const p = toWorld(e.clientX, e.clientY);
        const rect = {
          x: Math.min(p.x, it.wx),
          y: Math.min(p.y, it.wy),
          w: Math.abs(p.x - it.wx),
          h: Math.abs(p.y - it.wy),
        };
        setSelectRect(rect);
        const hit = notesRef.current.filter(
          (n) => n.x < rect.x + rect.w && n.x + n.w > rect.x && n.y < rect.y + rect.h && n.y + n.h > rect.y,
        );
        setSelected(new Set([...it.base, ...hit.map((n) => n.id)]));
      } else if (it.kind === 'connect') {
        const p = toWorld(e.clientX, e.clientY);
        setDraftLine({ from: it.from, x: p.x, y: p.y });
      }
    };

    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      const it = interaction.current;
      if (!it) return;
      if (it.kind === 'pinch') {
        if (pointers.current.size < 2) interaction.current = null;
        return;
      }
      interaction.current = null;
      if (it.kind === 'pan' && !it.moved) {
        setSelected(new Set());
        setSelConnector(null);
      } else if (it.kind === 'move' && !it.moved) {
        // Clic simple : sélection seule ; double clic / double tape : édition.
        if (!it.shift) setSelected(new Set([it.id]));
        const now = Date.now();
        if (lastTap.current && lastTap.current.id === it.id && now - lastTap.current.t < 400) {
          lastTap.current = null;
          openEditor(it.id);
        } else {
          lastTap.current = { id: it.id, t: now };
        }
      } else if (it.kind === 'select') {
        setSelectRect(null);
      } else if (it.kind === 'connect') {
        setDraftLine(null);
        const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>(
          '[data-board-note]',
        );
        const to = target?.dataset.boardNote;
        if (to && to !== it.from) {
          dispatch({ type: 'addConnector', connector: { id: uid(), from: it.from, to } });
        } else if (!to) {
          const p = toWorld(e.clientX, e.clientY);
          const from = notesRef.current.find((n) => n.id === it.from);
          if (from && Math.hypot(p.x - (from.x + from.w / 2), p.y - (from.y + from.h / 2)) > Math.max(from.w, from.h) / 2 + 40) {
            createAt(p.x, p.y, it.from);
          }
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [createAt, dispatch, openEditor, toWorld]);

  const startPinchIfNeeded = () => {
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      interaction.current = {
        kind: 'pinch',
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        cam: camRef.current,
      };
      setSelectRect(null);
      setDraftLine(null);
      return true;
    }
    return false;
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfNeeded()) return;
    if (e.shiftKey && e.button === 0) {
      const p = toWorld(e.clientX, e.clientY);
      interaction.current = { kind: 'select', wx: p.x, wy: p.y, base: new Set(selectedRef.current) };
    } else {
      interaction.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: camRef.current.x, cy: camRef.current.y, moved: false };
    }
  };

  const onBackgroundDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('board-world')) return;
    const p = toWorld(e.clientX, e.clientY);
    createAt(p.x, p.y);
  };

  const onNoteDown = (e: React.PointerEvent, note: Note) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfNeeded()) return;
    setSelConnector(null);
    let sel = selectedRef.current;
    if (e.shiftKey) {
      sel = new Set(sel);
      if (sel.has(note.id)) sel.delete(note.id);
      else sel.add(note.id);
    } else if (!sel.has(note.id)) {
      sel = new Set([note.id]);
    }
    setSelected(sel);
    const moving = sel.has(note.id) ? [...sel] : [note.id];
    const origins = new Map(
      moving.map((id) => byId.get(id)).filter((n): n is Note => !!n).map((n) => [n.id, { x: n.x, y: n.y }]),
    );
    interaction.current = { kind: 'move', id: note.id, sx: e.clientX, sy: e.clientY, origins, moved: false, shift: e.shiftKey };
  };

  const onResizeDown = (e: React.PointerEvent, note: Note) => {
    e.stopPropagation();
    interaction.current = { kind: 'resize', id: note.id, sx: e.clientX, sy: e.clientY, w: note.w, h: note.h, moved: false };
  };

  const onHandleDown = (e: React.PointerEvent, note: Note) => {
    e.stopPropagation();
    const p = toWorld(e.clientX, e.clientY);
    interaction.current = { kind: 'connect', from: note.id };
    setDraftLine({ from: note.id, x: p.x, y: p.y });
  };

  /* ---------- Clavier ---------- */
  const trashSelection = useCallback(() => {
    if (selConnector) {
      dispatch({ type: 'deleteConnectors', ids: [selConnector] });
      setSelConnector(null);
    }
    if (selectedRef.current.size) {
      setTrashed([...selectedRef.current], true);
      setSelected(new Set());
    }
  }, [dispatch, selConnector, setTrashed]);

  const duplicateSelection = useCallback(() => {
    const src = notesRef.current.filter((n) => selectedRef.current.has(n.id));
    if (!src.length) return;
    dispatch({ type: 'checkpoint' });
    const ids: string[] = [];
    for (const n of src) {
      const { id: _old, ...rest } = n;
      void _old;
      const copy = createNote({ ...rest, x: n.x + 32, y: n.y + 32, pinned: false, createdAt: Date.now() });
      ids.push(copy.id);
      dispatch({ type: 'addNote', note: copy });
    }
    setSelected(new Set(ids));
  }, [dispatch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [contenteditable], .modal')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedRef.current.size || selConnector) {
          e.preventDefault();
          trashSelection();
        }
      } else if (e.key === 'Escape') {
        setSelected(new Set());
        setSelConnector(null);
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelected(new Set(notesRef.current.map((n) => n.id)));
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelection();
      } else if (e.key === 'Enter' && selectedRef.current.size === 1) {
        e.preventDefault();
        openEditor([...selectedRef.current][0]);
      } else if (!mod && (e.key === '+' || e.key === '=')) {
        zoomCenter(1.2);
      } else if (!mod && e.key === '-') {
        zoomCenter(1 / 1.2);
      } else if (!mod && e.key.toLowerCase() === 'f') {
        fit();
      } else if (e.key.startsWith('Arrow') && selectedRef.current.size) {
        e.preventDefault();
        const step = e.shiftKey ? 40 : 8;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        dispatch({
          type: 'updateNotes',
          patches: notesRef.current.filter((n) => selectedRef.current.has(n.id)).map((n) => ({ id: n.id, patch: { x: n.x + dx, y: n.y + dy } })),
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const selectedNotes = notes.filter((n) => selected.has(n.id));
  const showLabelsOnNotes = cam.zoom > 0.45;
  const draftFrom = draftLine ? byId.get(draftLine.from) : undefined;
  const gridSize = 24 * cam.zoom;

  return (
    <div className="board">
      <div
        ref={viewportRef}
        className={`board-viewport ${interaction.current?.kind === 'pan' ? 'panning' : ''}`}
        style={{
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${cam.x}px ${cam.y}px`,
        }}
        onPointerDown={onBackgroundDown}
        onDoubleClick={onBackgroundDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label="Tableau blanc"
      >
        <div
          className="board-world"
          style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})` }}
        >
          <svg className="board-links" width="1" height="1">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="arrow-head" />
              </marker>
            </defs>
            {connectors.map((c) => {
              const a = byId.get(c.from)!;
              const b = byId.get(c.to)!;
              const p1 = edgePoint(a, b.x + b.w / 2, b.y + b.h / 2);
              const p2 = edgePoint(b, a.x + a.w / 2, a.y + a.h / 2);
              const d = `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
              return (
                <g
                  key={c.id}
                  className={`link ${selConnector === c.id ? 'selected' : ''}`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelConnector(c.id);
                    setSelected(new Set());
                  }}
                >
                  <path d={d} className="link-hit" />
                  <path d={d} className="link-line" markerEnd="url(#arrow)" />
                </g>
              );
            })}
            {draftLine && draftFrom && (
              <path
                className="link-line draft"
                markerEnd="url(#arrow)"
                d={(() => {
                  const p1 = edgePoint(draftFrom, draftLine.x, draftLine.y);
                  return `M${p1.x},${p1.y} L${draftLine.x},${draftLine.y}`;
                })()}
              />
            )}
          </svg>

          {[...notes]
            .sort((a, b) => a.z - b.z)
            .map((n) => {
              const dim = query && !noteMatches(n, query, data.labels);
              return (
                <div
                  key={n.id}
                  data-board-note={n.id}
                  className={`board-note note-color-${n.color} ${selected.has(n.id) ? 'selected' : ''} ${dim ? 'dim' : ''}`}
                  style={{ left: n.x, top: n.y, width: n.w, height: n.h, zIndex: n.z }}
                  onPointerDown={(e) => onNoteDown(e, n)}
                >
                  <div className="board-note-content">
                    {n.title && <div className="board-note-title">{n.title}</div>}
                    <NotePreview note={n} maxItems={20} />
                    {!n.title && !n.content && !n.items.length && <div className="muted">Double-clic pour écrire…</div>}
                  </div>
                  {showLabelsOnNotes && <LabelChips note={n} />}
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                    <div
                      key={side}
                      className={`link-handle ${side}`}
                      title="Glisser pour relier"
                      onPointerDown={(e) => onHandleDown(e, n)}
                    />
                  ))}
                  <div className="resize-handle" onPointerDown={(e) => onResizeDown(e, n)} aria-hidden />
                </div>
              );
            })}

          {selectRect && (
            <div
              className="select-rect"
              style={{ left: selectRect.x, top: selectRect.y, width: selectRect.w, height: selectRect.h }}
            />
          )}
        </div>

        {!notes.length && (
          <div className="board-empty">
            <StickyNote size={56} strokeWidth={1.2} />
            <p>Double-cliquez n'importe où pour ajouter une note</p>
          </div>
        )}
      </div>

      {(selectedNotes.length > 0 || selConnector) && (
        <div className="board-selection-bar" onPointerDown={(e) => e.stopPropagation()}>
          {selectedNotes.length > 0 && (
            <>
              <span className="sel-count">
                {selectedNotes.length} sélectionnée{selectedNotes.length > 1 ? 's' : ''}
              </span>
              <div className="popover-anchor">
                <button type="button" className="icon-btn" title="Couleur" aria-label="Couleur" onClick={() => setColorOpen((o) => !o)}>
                  <Palette size={18} />
                </button>
                <Popover open={colorOpen} onClose={() => setColorOpen(false)} placement="bottom" align="center">
                  <ColorPicker
                    value={selectedNotes[0].color}
                    onChange={(color) => {
                      setLastColor(color);
                      dispatch({ type: 'updateNotes', patches: selectedNotes.map((n) => ({ id: n.id, patch: { color } })) });
                    }}
                  />
                </Popover>
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Premier plan"
                aria-label="Premier plan"
                onClick={() => dispatch({ type: 'bringToFront', ids: selectedNotes.map((n) => n.id) })}
              >
                <BringToFront size={18} />
              </button>
              <button type="button" className="icon-btn" title="Dupliquer (Ctrl+D)" aria-label="Dupliquer" onClick={duplicateSelection}>
                <Copy size={18} />
              </button>
              {selectedNotes.length === 1 && (
                <button type="button" className="text-btn" onClick={() => openEditor(selectedNotes[0].id)}>
                  Modifier
                </button>
              )}
            </>
          )}
          {selConnector && !selectedNotes.length && <span className="sel-count">Lien sélectionné</span>}
          <button type="button" className="icon-btn danger" title="Supprimer (Suppr)" aria-label="Supprimer la sélection" onClick={trashSelection}>
            <Trash2 size={18} />
          </button>
        </div>
      )}

      <div className="board-toolbar" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="board-add" onClick={createCenter} title="Nouvelle note (N)">
          <span className={`board-add-swatch note-color-${lastColor}`} />
          <Plus size={18} /> Note
        </button>
      </div>

      <div className="board-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn" aria-label="Dézoomer" title="Dézoomer (-)" onClick={() => zoomCenter(1 / 1.2)}>
          <Minus size={18} />
        </button>
        <button type="button" className="zoom-value" title="Zoom 100 %" onClick={() => zoomCenter(1 / camRef.current.zoom)}>
          {Math.round(cam.zoom * 100)} %
        </button>
        <button type="button" className="icon-btn" aria-label="Zoomer" title="Zoomer (+)" onClick={() => zoomCenter(1.2)}>
          <Plus size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label="Tout afficher" title="Tout afficher (F)" onClick={fit}>
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}
