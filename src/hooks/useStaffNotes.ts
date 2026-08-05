// src/hooks/useStaffNotes.ts
// ============================================================
// Staff notes hook — lazy-loaded to avoid a third network
// request on initial page load. Components that display notes
// call loadStaffNotes() on mount; the rest of the app never
// fetches them.
// ============================================================
import { useState, useCallback, useRef } from 'react';
import { StaffNote } from '../types';
import errorLogger from '../services/errorLogger';
import { staffNotesApi } from './useApi';

export const useStaffNotes = () => {
  const [staffNotes, setStaffNotes] = useState<StaffNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // ── Lazy load: only called by components that actually show notes ──
  const loadStaffNotes = useCallback(async () => {
    if (loadedRef.current) return; // already loaded, don't re-fetch
    loadedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await staffNotesApi.getAll();
      setStaffNotes(data);
    } catch (err) {
      console.error('Error loading staff notes:', err);
      setError('Failed to load staff notes.');
      loadedRef.current = false; // allow retry
    } finally {
      setLoading(false);
    }
  }, []);

  // ── addStaffNote ──────────────────────────────────────────
  const addStaffNote = useCallback((orderId: string, staffName: string, content: string) => {
    try {
      const newNote: StaffNote = {
        id: Date.now().toString(),
        orderId,
        staffName: staffName.trim(),
        timestamp: new Date().toISOString(),
        content: content.trim(),
      };

      // Optimistic update
      setStaffNotes(prev => [newNote, ...prev]);

      // Persist to DB
      staffNotesApi.save(newNote).catch(err => {
        console.error('Failed to save staff note to DB:', err);
        setError('Failed to save note. Please try again.');
        setStaffNotes(prev => prev.filter(n => n.id !== newNote.id)); // rollback
      });

      return newNote;
    } catch (err) {
      console.error('Error adding staff note:', err);
      setError('Failed to add staff note');
      return null;
    }
  }, []);

  // ── deleteStaffNote ───────────────────────────────────────
  const deleteStaffNote = useCallback((noteId: string) => {
    try {
      const noteToDelete = staffNotes.find(n => n.id === noteId);
      setStaffNotes(prev => prev.filter(n => n.id !== noteId));

      staffNotesApi.delete(noteId).catch(err => {
        console.error('Failed to delete staff note from DB:', err);
        setError('Failed to delete note. Please try again.');
        if (noteToDelete) {
          setStaffNotes(prev => [noteToDelete, ...prev]); // rollback
        }
      });

      return true;
    } catch (err) {
      console.error('Error deleting staff note:', err);
      setError('Failed to delete staff note');
      return false;
    }
  }, [staffNotes]);

  // ── getNotesForOrder ──────────────────────────────────────
  const getNotesForOrder = useCallback((orderId: string) =>
    staffNotes
      .filter(n => n.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [staffNotes]);

  // setAllStaffNotes — used by Settings restore from backup
  const setAllStaffNotes = async (newNotes: StaffNote[]) => {
    try {
      setStaffNotes(newNotes);
      loadedRef.current = true;
      setError(null);
      errorLogger.info(`Restored ${newNotes.length} staff notes from backup`);
      return true;
    } catch (err) {
      console.error('Error restoring staff notes:', err);
      errorLogger.error('Failed to restore staff notes', err);
      setError('Failed to restore staff notes');
      return false;
    }
  };

  // Hydrate from a combined fetch (avoids a separate round trip)
  const hydrate = useCallback((data: StaffNote[]) => {
    setStaffNotes(data);
    loadedRef.current = true;
    setLoading(false);
    setError(null);
  }, []);

  return {
    staffNotes,
    loading,
    error,
    addStaffNote,
    deleteStaffNote,
    setAllStaffNotes,
    getNotesForOrder,
    loadStaffNotes,
    hydrate,
  };
};
