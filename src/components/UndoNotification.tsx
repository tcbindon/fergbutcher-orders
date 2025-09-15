import React from 'react';
import { Undo, X } from 'lucide-react';

interface UndoNotificationProps {
  show: boolean;
  actionDescription: string;
  onUndo: () => void;
  onDismiss: () => void;
}

const UndoNotification: React.FC<UndoNotificationProps> = ({
  show,
  actionDescription,
  onUndo,
  onDismiss
}) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-fergbutcher-black-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-4 min-w-80">
        <span className="flex-1 text-sm">{actionDescription}</span>
        <button
          onClick={onUndo}
          className="bg-fergbutcher-green-600 text-white px-3 py-1 rounded text-sm hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-1"
        >
          <Undo className="h-3 w-3" />
          <span>Undo</span>
        </button>
        <button
          onClick={onDismiss}
          className="text-fergbutcher-brown-300 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default UndoNotification;