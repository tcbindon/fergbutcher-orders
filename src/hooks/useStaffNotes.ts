import { useState, useEffect } from 'react';
import { StaffNote } from '../types';

// Mock initial data
const initialStaffNotes: StaffNote[] = [
  {
    id: '1',
    orderId: '1',
    staffName: 'Sarah',
    timestamp: '2025-01-12T14:30:00Z',
    content: 'Customer called to confirm they want the beef wellington cooked medium-rare. Make sure to note this for prep.'
  },
  {
    id: '2',
    orderId: '2',
    staffName: 'Mike',
    timestamp: '2025-01-11T16:45:00Z',
    content: 'Customer mentioned they have a large family gathering. Double-check portion sizes are generous.'
  }
];

export const useStaffNotes = () => {
  const [staffNotes, setStaffNotes] = useState<StaffNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load staff notes from localStorage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('fergbutcher_staff_notes');
      if (savedNotes) {
        setStaffNotes(JSON.parse(savedNotes));
      } else {
        // Use initial data if no saved data exists
        setStaffNotes(initialStaffNotes);
        localStorage.setItem('fergbutcher_staff_notes', JSON.stringify(initialStaffNotes));
      }
    } catch (err) {
      console.error('Error loading staff notes:', err);
      setError('Failed to load staff notes');
      setStaffNotes(initialStaffNotes);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save staff notes to localStorage whenever notes change
  useEffect(() => {
    if (!loading && staffNotes.length >= 0) {
      try {
        localStorage.setItem('fergbutcher_staff_notes', JSON.stringify(staffNotes));
      } catch (err) {
        console.error('Error saving staff notes:', err);
        setError('Failed to save staff notes');
      }
    }
  }, [staffNotes, loading]);

  const addStaffNote = (orderId: string, staffName: string, content: string) => {
    try {
      const newNote: StaffNote = {
        id: Date.now().toString(),
        orderId,
        staffName: staffName.trim(),
        timestamp: new Date().toISOString(),
        content: content.trim()
      };
      
      setStaffNotes(prev => [newNote, ...prev]);
      setError(null);
      return newNote;
    } catch (err) {
      console.error('Error adding staff note:', err);
      setError('Failed to add staff note');
      return null;
    }
  };

  const deleteStaffNote = (noteId: string) => {
    try {
      setStaffNotes(prev => prev.filter(note => note.id !== noteId));
      setError(null);
      return true;
    } catch (err) {
      console.error('Error deleting staff note:', err);
      setError('Failed to delete staff note');
      return false;
    }
  };

  const getNotesForOrder = (orderId: string) => {
    return staffNotes
      .filter(note => note.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  return {
    staffNotes,
    loading,
    error,
    addStaffNote,
    deleteStaffNote,
    getNotesForOrder
  };
};