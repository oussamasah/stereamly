'use client';
import { useSyncExternalStore } from 'react';
import { adminFetch } from '../../lib/admin-api';
export type SavedTitle = { target: string; name: string; poster?: string | null; position?: number; updatedAt: number };
type Change = { id: string; target: string; saved: boolean; positionSeconds: number };
type RemoteItem = { target: string; saved: boolean; positionSeconds: number; updatedAt: string };
const guestKey = 'streamly.library.v1';
const listeners = new Set<() => void>();
const empty: SavedTitle[] = [];
let owner: string | null = null;
let raw: string | null = null;
let cachedKey = '';
let parsed = empty;
let syncing = false;
let syncStatus = 'local';
let timer: ReturnType<typeof setInterval> | undefined;
function key() { return owner ? `${guestKey}.${owner}` : guestKey; }
function notify() { listeners.forEach(listener => listener()); }
function itemsAt(storageKey: string): SavedTitle[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item.target === 'string' && typeof item.name === 'string').slice(0, 300) : empty;
  } catch { return empty; }
}
function read() {
  try {
    const storageKey = key(), next = localStorage.getItem(storageKey);
    if (next !== raw || cachedKey !== storageKey) { raw = next; cachedKey = storageKey; parsed = itemsAt(storageKey); }
    return parsed;
  } catch { return empty; }
}
function pending(storageKey: string): Change[] {
  try { const value = JSON.parse(localStorage.getItem(`${storageKey}.pending`) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function subscribe(listener: () => void) {
  listeners.add(listener); window.addEventListener('storage', listener);
  return () => { listeners.delete(listener); window.removeEventListener('storage', listener); };
}
export function useLibrary() { return useSyncExternalStore(subscribe, read, () => empty); }
export function useLibraryStatus() { return useSyncExternalStore(subscribe, () => syncStatus, () => 'local'); }
export function setLibraryAccount(userId: string | null) {
  if (owner === userId) return;
  owner = userId;
  clearInterval(timer);
  syncStatus = owner ? 'pending' : 'local';
  notify();
  if (owner) { void syncLibrary(); timer = setInterval(() => void syncLibrary(), 15000); }
}
function queue(change: Omit<Change, 'id'>) {
  if (!owner) return;
  const storageKey = key();
  const changes = [{ ...change, id: crypto.randomUUID() }, ...pending(storageKey).filter(item => item.target !== change.target)].slice(0, 600);
  localStorage.setItem(`${storageKey}.pending`, JSON.stringify(changes));
  syncStatus = 'pending';
  queueMicrotask(() => void syncLibrary());
}
export function saveTitle(item: Omit<SavedTitle, 'updatedAt'>) {
  const items = read();
  localStorage.setItem(key(), JSON.stringify([{ ...item, updatedAt: Date.now() }, ...items.filter(value => value.target !== item.target)].slice(0, 300)));
  queue({ target: item.target, saved: true, positionSeconds: item.position || 0 });
  notify();
}
export function removeTitle(target: string) {
  localStorage.setItem(key(), JSON.stringify(read().filter(item => item.target !== target)));
  queue({ target, saved: false, positionSeconds: 0 });
  notify();
}
export function importGuestLibrary() {
  if (!owner) return;
  for (const item of itemsAt(guestKey)) saveTitle(item);
}
export async function syncLibrary() {
  if (!owner || syncing) return;
  const account = owner, storageKey = key();
  if (sessionStorage.getItem('streamly.userId') !== account) return;
  syncing = true;
  try {
    const changes = pending(storageKey);
    for (let offset = 0; offset < changes.length; offset += 100) {
      if (owner !== account) return;
      const batch = changes.slice(offset, offset + 100);
      const response = await adminFetch('/viewer/library', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: batch.map(({ target, saved, positionSeconds }) => ({ target, saved, positionSeconds })) }) });
      if (!response.ok) throw new Error('LIBRARY_SYNC_FAILED');
      const acknowledged = new Set(batch.map(change => change.id));
      localStorage.setItem(`${storageKey}.pending`, JSON.stringify(pending(storageKey).filter(change => !acknowledged.has(change.id))));
    }
    if (owner !== account) return;
    const response = await adminFetch('/viewer/library');
    if (!response.ok) throw new Error('LIBRARY_SYNC_FAILED');
    const remote = await response.json() as RemoteItem[];
    if (owner !== account) return;
    const unacknowledged = new Set(pending(storageKey).map(change => change.target));
    const combined = new Map(itemsAt(storageKey).map(item => [item.target, item]));
    for (const item of remote) {
      if (unacknowledged.has(item.target)) continue;
      if (!item.saved) { combined.delete(item.target); continue; }
      const previous = combined.get(item.target);
      combined.set(item.target, { target: item.target, name: previous?.name || '', poster: previous?.poster, position: item.positionSeconds, updatedAt: Date.parse(item.updatedAt) });
    }
    localStorage.setItem(storageKey, JSON.stringify([...combined.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 300)));
    syncStatus = unacknowledged.size ? 'pending' : 'synced';
  } catch { if (owner === account) syncStatus = 'pending'; }
  finally { syncing = false; notify(); }
}
