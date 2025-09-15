import { useState, useCallback } from 'react';

interface UndoAction {
  id: string;
  description: string;
  undo: () => void;
  timestamp: number;
}

export const useUndo = () => {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);

  const addUndoAction = useCallback((action: Omit<UndoAction, 'timestamp'>) => {
    const undoAction: UndoAction = {
      ...action,
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      const newStack = [undoAction, ...prev];
      // Keep only the last 10 actions
      return newStack.slice(0, 10);
    });

    setLastAction(undoAction);
    setShowUndoNotification(true);

    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowUndoNotification(false);
    }, 5000);
  }, []);

  const performUndo = useCallback(() => {
    if (undoStack.length === 0) return false;

    const [actionToUndo, ...remainingActions] = undoStack;
    
    try {
      actionToUndo.undo();
      setUndoStack(remainingActions);
      setShowUndoNotification(false);
      setLastAction(null);
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      return false;
    }
  }, [undoStack]);

  const clearUndoStack = useCallback(() => {
    setUndoStack([]);
    setShowUndoNotification(false);
    setLastAction(null);
  }, []);

  const hideUndoNotification = useCallback(() => {
    setShowUndoNotification(false);
  }, []);

  return {
    undoStack,
    showUndoNotification,
    lastAction,
    addUndoAction,
    performUndo,
    clearUndoStack,
    hideUndoNotification,
    canUndo: undoStack.length > 0
  };
};