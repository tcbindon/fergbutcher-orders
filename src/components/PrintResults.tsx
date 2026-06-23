import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Gift, Search } from 'lucide-react';
import { Order, Customer } from '../types';

interface PrintResultsProps {
  orders: Order[];
  customers: Customer[];
  filterLabel: string;
  onClose: () => void;
}

const PrintResults: React.FC<PrintResultsProps> = ({ orders, customers, filterLabel, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':   return 'text-amber-600';
      case 'confirmed': return 'text-sky-700';
      case 'prepared':  return 'text-teal-600';
      case 'collected': return 'text-green-700';
      case 'cancelled': return 'text-rose-500';
      default:          return 'text-gray-600';
    }
  };

  const renderOrderRow = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    const itemsText = order.items
      .map(item => `${item.description} — ${item.quantity.toLocaleString('en-NZ')} ${item.unit}`)
      .join('  ·  ');
    const collectionDisplay = order.collectionDate
      ? new Date(order.collectionDate + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'No date';
    return (
      <tr key={order.id} className="break-inside-avoid border-b border-gray-100 last:border-b-0">
        <td className="py-1 pr-2 align-top w-[22%]">
          <div className="font-semibold text-gray-900 text-[10px] leading-snug">
            {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'}
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">
            {customer?.phone && <span>{customer.phone}</span>}
            {order.orderType === 'christmas' && (
              <span className="flex items-center gap-0.5 text-gray-400 mt-0.5">
                <Gift className="h-2 w-2" /> Xmas
              </span>
            )}
          </div>
        </td>
        <td className="py-1 pr-2 align-top w-[16%]">
          <div className="text-[9px] text-gray-700 leading-snug">
            {collectionDisplay}
            {order.collectionTime && (
              <span className="ml-1 font-medium text-gray-800">@ {order.collectionTime}</span>
            )}
          </div>
        </td>
        <td className="py-1 pr-2 align-top">
          <div className="text-[10px] text-gray-800 leading-snug">{itemsText}</div>
          {order.additionalNotes && (
            <div className="text-[9px] text-gray-400 italic mt-0.5">{order.additionalNotes}</div>
          )}
        </td>
        <td className={`py-1 align-top text-right text-[9px] font-bold uppercase whitespace-nowrap w-[10%] ${getStatusColor(order.status)}`}>
          {order.status}
        </td>
        <td className="py-1 pl-2 align-top w-[6%]">
          <div className="border border-gray-300 rounded h-4 w-4 ml-auto" />
        </td>
      </tr>
    );
  };

  const printContent = (
    <div className="p-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-gray-900">
        <div className="flex items-center gap-2">
          <img src="/Fergbutcher_vector-01.png" alt="Fergbutcher" className="h-7 w-auto" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Fergbutcher</h1>
            <p className="text-[9px] text-gray-500 leading-tight">Order Search Results</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-gray-700">
            <Search className="h-3 w-3 flex-shrink-0" />
            <span className="max-w-[260px] truncate">{filterLabel}</span>
          </div>
          <p className="text-[9px] text-gray-500 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {orders.length > 0 ? (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[8px] text-gray-400 uppercase tracking-wide border-b border-gray-300">
              <th className="text-left font-medium pb-0.5 pr-2">Customer</th>
              <th className="text-left font-medium pb-0.5 pr-2">Collection</th>
              <th className="text-left font-medium pb-0.5 pr-2">Items</th>
              <th className="text-right font-medium pb-0.5">Status</th>
              <th className="text-right font-medium pb-0.5 pl-2">Done</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(renderOrderRow)}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">No orders match the current filters.</p>
      )}

      <div className="mt-3 pt-1.5 border-t border-gray-200 text-[8px] text-gray-400 text-center">
        Printed {new Date().toLocaleString('en-NZ')} | Fergbutcher Pre-Order Management System
      </div>
    </div>
  );

  return createPortal(
    <div className="print-portal">
      <div className="print:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Print Search Results</h3>
              <p className="text-sm text-gray-500 mt-0.5">{filterLabel} — {orders.length} order{orders.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {printContent}
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        {printContent}
      </div>
    </div>,
    document.body
  );
};

export default PrintResults;
