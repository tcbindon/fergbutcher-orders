import React from 'react';
import { RefreshCw, Calendar, CalendarDays } from 'lucide-react';

interface RecurringScopeModalProps {
  open: boolean;
  orderCount: number;
  onChoose: (applyToFuture: boolean) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

const RecurringScopeModal: React.FC<RecurringScopeModalProps> = ({
  open,
  orderCount,
  onChoose,
  onCancel,
  title = 'Recurring order — apply to which orders?',
  message,
}) => {
  if (!open) return null;

  const futureCount = Math.max(orderCount - 1, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-fergbutcher-green-600" />
          <h3 className="text-lg font-semibold text-fergbutcher-black-900">{title}</h3>
        </div>
        <div className="p-6 space-y-4">
          {message && (
            <p className="text-sm text-fergbutcher-brown-600">{message}</p>
          )}
          <button
            onClick={() => onChoose(false)}
            className="w-full text-left p-4 rounded-lg border-2 border-fergbutcher-gold-300 hover:border-fergbutcher-green-500 hover:bg-fergbutcher-green-50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-fergbutcher-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-fergbutcher-black-900">This order only</p>
                <p className="text-sm text-fergbutcher-brown-500 mt-0.5">
                  Only this single order will be changed. All other orders in the series stay as they are.
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={() => onChoose(true)}
            className="w-full text-left p-4 rounded-lg border-2 border-fergbutcher-gold-300 hover:border-fergbutcher-green-500 hover:bg-fergbutcher-green-50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <CalendarDays className="h-5 w-5 text-fergbutcher-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-fergbutcher-black-900">
                  This and all future orders
                </p>
                <p className="text-sm text-fergbutcher-brown-500 mt-0.5">
                  This order plus {futureCount} upcoming {futureCount === 1 ? 'order' : 'orders'} in the series will be changed.
                  Each keeps its own collection date and time.
                </p>
              </div>
            </div>
          </button>
        </div>
        <div className="px-6 py-3 border-t border-fergbutcher-gold-200 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-fergbutcher-brown-600 hover:text-fergbutcher-black-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurringScopeModal;
