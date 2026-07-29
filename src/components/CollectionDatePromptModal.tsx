import React, { useState } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { Order } from '../types';
import { todayLocal } from '../utils/dateUtils';

interface CollectionDatePromptModalProps {
  orderIds: string[];
  desiredStatus: Order['status'];
  onConfirm: (date: string) => void;
  onClose: () => void;
}

const DATE_REQUIRED_STATUSES: Order['status'][] = ['confirmed', 'prepared', 'collected'];

export function isDateRequiredStatus(status: Order['status']): boolean {
  return DATE_REQUIRED_STATUSES.includes(status);
}

export default function CollectionDatePromptModal({
  orderIds,
  desiredStatus,
  onConfirm,
  onClose,
}: CollectionDatePromptModalProps) {
  const [date, setDate] = useState('');
  const today = todayLocal();
  const count = orderIds.length;

  const handleConfirm = () => {
    if (!date) return;
    onConfirm(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-fergbutcher-gold-600" />
          <h3 className="text-lg font-semibold text-fergbutcher-black-900">
            Collection date required
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-fergbutcher-brown-700">
            {count === 1
              ? `This order needs a collection date before it can be marked as "${desiredStatus}".`
              : `${count} orders need a collection date before they can be marked as "${desiredStatus}".`}
          </p>
          <div>
            <label className="block text-sm font-medium text-fergbutcher-black-900 mb-1.5">
              Collection date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fergbutcher-gold-500 pointer-events-none" />
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-fergbutcher-gold-50 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-fergbutcher-brown-600 hover:text-fergbutcher-black-900 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!date}
            className="px-4 py-2 bg-fergbutcher-green-600 text-white text-sm font-medium rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set date & mark as {desiredStatus}
          </button>
        </div>
      </div>
    </div>
  );
}
