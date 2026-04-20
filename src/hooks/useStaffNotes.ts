// src/hooks/useStaffNotes.ts
// ============================================================
// DROP-IN REPLACEMENT for the original useStaffNotes.ts
// Identical public API — components need zero changes.
// Data now lives in MySQL via the SiteGround PHP API.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { StaffNote } from '../types';
import errorLogger from '../services/errorLogger';
import { staffNotesApi } from './useApi';

export const useStaffNotes = () => {
  const [staffNotes, setStaffNotes] = useState<StaffNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load all notes from DB on mount ──────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    staffNotesApi.getAll()
      .then(data => { if (!cancelled) { setStaffNotes(data); setError(null); } })
      .catch(err => {
        if (!cancelled) {
          console.error('Error loading staff notes:', err);
          setError('Failed to load staff notes.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  return {
    staffNotes,
    loading,
    error,
    addStaffNote,
    deleteStaffNote,
    getNotesForOrder,
  };
};
