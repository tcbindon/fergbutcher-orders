import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Gift, Search, MessageSquare, AlertTriangle } from 'lucide-react';
import { Order, Customer, StaffNote } from '../types';

interface PrintResultsProps {
  orders: Order[];
  customers: Customer[];
  filterLabel: string;
  onClose: () => void;
  getNotesForOrder?: (orderId: string) => StaffNote[];
}

const PrintResults: React.FC<PrintResultsProps> = ({ orders, customers, filterLabel, onClose, getNotesForOrder }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':   return 'text-amber-700';
      case 'confirmed': return 'text-sky-800';
      case 'prepared':  return 'text-teal-700';
      case 'collected': return 'text-green-800';
      case 'cancelled': return 'text-rose-600';
      default:          return 'text-gray-700';
    }
  };

  // Group orders by collection date
  const groupedOrders = orders.reduce((acc, order) => {
    const date = order.collectionDate || 'No date';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => {
    if (a === 'No date') return -1;
    if (b === 'No date') return 1;
    return a.localeCompare(b);
  });

  const formatDayHeader = (dateStr: string) => {
    if (dateStr === 'No date') return 'No Date Set';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-NZ', {
      timeZone: 'Pacific/Auckland', weekday: 'long', day: 'numeric', month: 'long'
    });
  };

  const renderOrderBlock = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    const staffNotes = getNotesForOrder ? getNotesForOrder(order.id) : [];
    const hasOrderNotes = !!order.additionalNotes;
    const hasStaffNotes = staffNotes.length > 0;
    const hasCustomerNotes = !!customer?.notes;
    const hasAnyNotes = hasOrderNotes || hasStaffNotes || hasCustomerNotes;

    return (
      <div key={order.id} className="break-inside-avoid mb-3 border border-gray-300 rounded">
        {/* Customer header row */}
        <div className="flex items-center justify-between px-2 py-1 bg-gray-100" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '20px', fontWeight: 700 }} className="text-gray-900">
              {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'}
            </span>
            {customer?.phone && (
              <span style={{ fontSize: '14px' }} className="text-gray-600">{customer.phone}</span>
            )}
            {order.orderType === 'christmas' && (
              <span className="inline-flex items-center gap-0.5 text-gray-500" style={{ fontSize: '13px' }}>
                <Gift className="h-3 w-3" /> Christmas
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {order.collectionTime && (
              <span style={{ fontSize: '16px', fontWeight: 600 }} className="text-gray-800">
                {order.collectionTime}
              </span>
            )}
            <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase' }} className={getStatusColor(order.status)}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Item rows */}
        <table className="w-full border-collapse">
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                <td className="py-1 pl-2 align-top" style={{ width: '7%' }}>
                  <div className="border-2 border-gray-500 rounded" style={{ height: '28px', width: '28px' }} />
                </td>
                <td className="py-1 px-2 align-top text-gray-900" style={{ width: '12%', fontSize: '20px', fontWeight: 600 }}>
                  {item.quantity.toLocaleString('en-NZ')}×
                </td>
                <td className="py-1 pr-2 align-top text-gray-800" style={{ fontSize: '17px' }}>
                  {item.description}{' '}
                  <span style={{ fontSize: '14px' }} className="text-gray-500">{item.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes row — order-level, highlighted */}
        {hasAnyNotes && (
          <div className="px-2 py-1.5 bg-amber-100 border-t border-amber-300" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
            {hasOrderNotes && (
              <div className="flex items-start gap-1.5 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p style={{ fontSize: '15px', fontWeight: 600 }} className="text-amber-900">
                  {order.additionalNotes}
                </p>
              </div>
            )}
            {hasStaffNotes && (
              <div className="flex items-start gap-1.5 mb-1 last:mb-0">
                <MessageSquare className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  {staffNotes.map((note, i) => (
                    <p key={i} style={{ fontSize: '15px', fontWeight: 600 }} className="text-amber-900">
                      <span className="font-bold">{note.staffName}:</span> {note.content}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {hasCustomerNotes && (
              <div className="flex items-start gap-1.5 last:mb-0">
                <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p style={{ fontSize: '15px', fontWeight: 600 }} className="text-amber-900">
                  <span className="font-bold">Customer notes:</span> {customer!.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const printContent = (
    <div className="p-4 font-sans" style={{ fontSize: '14px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-gray-900">
        <div className="flex items-center gap-3">
          <img src="/Fergbutcher_vector-01.png" alt="Fergbutcher" className="h-16 w-auto" />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700 }} className="text-gray-900 leading-tight">Fergbutcher</h1>
            <p style={{ fontSize: '13px' }} className="text-gray-500 leading-tight">Order Collection Schedule</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-gray-700" style={{ fontSize: '13px', fontWeight: 600 }}>
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="max-w-[300px] truncate">{filterLabel}</span>
          </div>
          <p style={{ fontSize: '13px' }} className="text-gray-500 mt-0.5">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {orders.length > 0 ? (
        <div>
          {sortedDates.map(date => (
            <div key={date} className="mb-4">
              {/* Day header */}
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-400">
                <h2 style={{ fontSize: '22px', fontWeight: 700 }} className="text-gray-900">
                  {formatDayHeader(date)}
                </h2>
                <span style={{ fontSize: '14px', fontWeight: 500 }} className="text-gray-500">
                  ({groupedOrders[date].length} order{groupedOrders[date].length !== 1 ? 's' : ''})
                </span>
              </div>
              {/* Column headers */}
              <div className="flex items-center px-2 mb-1" style={{ fontSize: '13px' }} >
                <span style={{ width: '7%' }} className="text-gray-400 uppercase font-medium">Done</span>
                <span style={{ width: '12%' }} className="text-gray-400 uppercase font-medium">Qty</span>
                <span className="text-gray-400 uppercase font-medium pl-4">Items</span>
              </div>
              {groupedOrders[date].map(renderOrderBlock)}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '16px' }} className="text-gray-500 text-center py-4">No orders match the current filters.</p>
      )}

      <div className="mt-3 pt-1.5 border-t border-gray-200 text-center text-gray-400" style={{ fontSize: '11px' }}>
        Printed {new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })} | Fergbutcher Pre-Order Management System
      </div>
    </div>
  );

  return createPortal(
    <div className="print-portal">
      {/* Screen preview */}
      <div className="print:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" style={{ maxWidth: '210mm' }}>
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Print Preview</h3>
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
          <div className="overflow-y-auto flex-1" style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
            {printContent}
          </div>
        </div>
      </div>

      {/* Print output */}
      <div className="hidden print:block">
        {printContent}
      </div>
    </div>,
    document.body
  );
};

export default PrintResults;
