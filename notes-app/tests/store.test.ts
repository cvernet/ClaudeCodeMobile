import { describe, expect, it } from 'vitest';
import { createNote, findFreeSpot, isNoteEmpty, noteMatches, reduceData, storeReducer, type StoreState } from '../src/store';
import type { AppData } from '../src/types';

const empty = (): AppData => ({ version: 1, notes: [], labels: [], connectors: [] });
const state = (data = empty()): StoreState => ({ data, past: [], future: [] });

describe('store', () => {
  it('ajoute une note au premier plan', () => {
    const a = createNote({ z: 5 });
    const b = createNote();
    let d = reduceData(empty(), { type: 'addNote', note: a });
    d = reduceData(d, { type: 'addNote', note: b });
    expect(d.notes[1].z).toBeGreaterThan(d.notes[0].z);
  });

  it('annule et rétablit', () => {
    let s = state();
    const n = createNote({ title: 'A' });
    s = storeReducer(s, { type: 'addNote', note: n });
    s = storeReducer(s, { type: 'updateNote', id: n.id, patch: { title: 'B' } });
    expect(s.data.notes[0].title).toBe('B');
    s = storeReducer(s, { type: 'undo' });
    expect(s.data.notes[0].title).toBe('A');
    s = storeReducer(s, { type: 'redo' });
    expect(s.data.notes[0].title).toBe('B');
  });

  it("regroupe les modifications sans historique derrière un point d'annulation", () => {
    let s = state();
    const n = createNote({ x: 0 });
    s = storeReducer(s, { type: 'addNote', note: n });
    s = storeReducer(s, { type: 'checkpoint' });
    for (let x = 1; x <= 10; x++) s = storeReducer(s, { type: 'updateNote', id: n.id, patch: { x }, history: false });
    expect(s.data.notes[0].x).toBe(10);
    s = storeReducer(s, { type: 'undo' });
    expect(s.data.notes[0].x).toBe(0);
  });

  it('ignore un checkpoint suivi d’aucune modification', () => {
    let s = state();
    const n = createNote({ title: 'A' });
    s = storeReducer(s, { type: 'addNote', note: n });
    s = storeReducer(s, { type: 'checkpoint' });
    s = storeReducer(s, { type: 'undo' });
    expect(s.data.notes).toHaveLength(0);
  });

  it('supprime les liens d’une note supprimée définitivement', () => {
    const a = createNote();
    const b = createNote();
    let d: AppData = { ...empty(), notes: [a, b] };
    d = reduceData(d, { type: 'addConnector', connector: { id: 'c', from: a.id, to: b.id } });
    d = reduceData(d, { type: 'addConnector', connector: { id: 'd', from: b.id, to: a.id } }); // doublon inversé
    expect(d.connectors).toHaveLength(1);
    d = reduceData(d, { type: 'deleteForever', ids: [a.id] });
    expect(d.connectors).toHaveLength(0);
  });

  it('retire un libellé supprimé des notes', () => {
    const n = createNote({ labels: ['l1'] });
    const d = reduceData({ ...empty(), notes: [n], labels: [{ id: 'l1', name: 'X' }] }, { type: 'deleteLabel', id: 'l1' });
    expect(d.notes[0].labels).toEqual([]);
  });

  it('trouve un emplacement libre', () => {
    const n = createNote({ x: 0, y: 0 });
    const spot = findFreeSpot([n]);
    expect(spot).not.toEqual({ x: 0, y: 0 });
  });

  it('détecte les notes vides et filtre la recherche', () => {
    expect(isNoteEmpty(createNote())).toBe(true);
    expect(isNoteEmpty(createNote({ type: 'checklist', items: [{ id: '1', text: ' ', done: false }] }))).toBe(true);
    const n = createNote({ title: 'Courses', labels: ['l'] });
    expect(noteMatches(n, 'cour', [])).toBe(true);
    expect(noteMatches(n, 'maison', [{ id: 'l', name: 'Maison' }])).toBe(true);
    expect(noteMatches(n, 'zzz', [])).toBe(false);
  });
});

describe('squash', () => {
  it("fusionne une session d'édition en une seule étape", () => {
    let s = state();
    const n = createNote({ title: 'A' });
    s = storeReducer(s, { type: 'addNote', note: n });
    const base = s.data;
    s = storeReducer(s, { type: 'checkpoint' });
    s = storeReducer(s, { type: 'updateNote', id: n.id, patch: { title: 'B' }, history: false });
    s = storeReducer(s, { type: 'addLabel', label: { id: 'l', name: 'L' } });
    s = storeReducer(s, { type: 'updateNote', id: n.id, patch: { labels: ['l'] }, history: false });
    s = storeReducer(s, { type: 'squash', base });
    s = storeReducer(s, { type: 'undo' });
    expect(s.data.notes[0].title).toBe('A');
    expect(s.data.labels).toHaveLength(0);
  });
});
