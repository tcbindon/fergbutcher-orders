import React from 'react';
import { Printer, X, Calendar, Clock, Gift } from 'lucide-react';
import { Order, Customer } from '../types';

interface PrintScheduleProps {
  date: string;
  orders: Order[];
  customers: Customer[];
  onClose: () => void;
}

const PrintSchedule: React.FC<PrintScheduleProps> = ({
  date,
  orders,
  customers,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-600';
      case 'confirmed': return 'text-sky-600';
      case 'prepared': return 'text-teal-600';
      case 'collected': return 'text-green-600';
      case 'cancelled': return 'text-rose-500';
      default: return 'text-gray-600';
    }
  };

  const dayOrders = orders.filter(order => order.collectionDate === date);

  const timedOrders = dayOrders
    .filter(o => o.collectionTime)
    .sort((a, b) => (a.collectionTime ?? '').localeCompare(b.collectionTime ?? ''));

  const untimedOrders = dayOrders
    .filter(o => !o.collectionTime)
    .sort((a, b) => {
      const statusPriority: Record<string, number> = { 'confirmed': 1, 'prepared': 2, 'pending': 3, 'collected': 4, 'cancelled': 5 };
      return (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
    });

  const renderOrderCard = (order: Order) => {
    const customer = customers.find(c => c.id === order.customerId);
    return (
      <div key={order.id} className="border border-fergbutcher-brown-200 print:border-gray-300 rounded-lg print:break-inside-avoid">
        <div className="flex justify-between items-start p-4 print:p-3">
          {/* Time column */}
          <div className="w-20 flex-shrink-0 text-center mr-4">
            {order.collectionTime ? (
              <div className="bg-fergbutcher-green-100 print:bg-gray-100 rounded-lg py-2 px-1">
                <div className="flex items-center justify-center space-x-1 mb-0.5">
                  <Clock className="h-3 w-3 text-fergbutcher-green-700 print:text-gray-700" />
                </div>
                <div className="text-base font-bold text-fergbutcher-green-800 print:text-black leading-tight">
                  {order.collectionTime}
                </div>
              </div>
            ) : (
              <div className="text-xs text-fergbutcher-brown-400 print:text-gray-400 pt-1">—</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2 print:mb-1">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-fergbutcher-black-900 print:text-black">
                    {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                  </h3>
                  {order.orderType === 'christmas' && (
                    <span className="text-xs bg-fergbutcher-green-100 print:bg-gray-100 text-fergbutcher-green-700 print:text-gray-700 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <Gift className="h-3 w-3" />
                      <span>Christmas</span>
                    </span>
                  )}
                </div>
                {customer?.phone && (
                  <p className="text-sm text-fergbutcher-brown-600 print:text-gray-600">{customer.phone}</p>
                )}
              </div>
              <span className={`text-xs font-semibold uppercase ${getStatusColor(order.status)} print:text-gray-700`}>
                {order.status}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-1 print:space-y-0.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm print:text-xs py-1 print:py-0.5 bg-fergbutcher-green-50 print:bg-gray-50 rounded px-2">
                  <span className="text-fergbutcher-black-900 print:text-black">{item.description}</span>
                  <span className="font-semibold text-fergbutcher-black-900 print:text-black ml-4">
                    {item.quantity.toLocaleString('en-NZ')} {item.unit}
                  </span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {order.additionalNotes && (
              <div className="mt-2 print:mt-1 bg-fergbutcher-yellow-50 print:bg-gray-100 border border-fergbutcher-yellow-200 print:border-gray-300 rounded p-2 print:p-1">
                <p className="text-sm print:text-xs font-medium text-fergbutcher-yellow-800 print:text-gray-800">
                  Special Instructions: {order.additionalNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const totalOrders = timedOrders.length + untimedOrders.length;

  return (
    <div className="print-root fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="print-card bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header - Hidden when printing */}
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center print:hidden">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900">Print Collection Schedule</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div className="print-body p-6 overflow-y-auto max-h-[calc(90vh-120px)] print:overflow-visible print:max-h-none">
          {/* Print Header */}
          <div className="text-center mb-8 print:mb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img
                src="/Fergbutcher_vector-01.png"
                alt="Fergbutcher Logo"
                className="h-10 w-auto print:h-8"
              />
              <div>
                <h1 className="text-2xl font-bold text-fergbutcher-black-900 print:text-black">Fergbutcher</h1>
                <p className="text-fergbutcher-brown-600 print:text-gray-600">Collection Schedule</p>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-lg font-semibold text-fergbutcher-black-900 print:text-black">
              <Calendar className="h-5 w-5" />
              <span>{formatDate(date)}</span>
            </div>
            <p className="text-fergbutcher-brown-600 print:text-gray-600 mt-2">
              {totalOrders} order{totalOrders !== 1 ? 's' : ''} scheduled for collection
            </p>
          </div>

          {totalOrders > 0 ? (
            <div className="space-y-6 print:space-y-4">
              {/* Timed orders */}
              {timedOrders.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-fergbutcher-brown-600 print:text-gray-600 uppercase tracking-wide mb-3 print:mb-2 flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Scheduled Times ({timedOrders.length})</span>
                  </h2>
                  <div className="space-y-3 print:space-y-2">
                    {timedOrders.map(renderOrderCard)}
                  </div>
                </div>
              )}

              {/* Untimed orders */}
              {untimedOrders.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-fergbutcher-brown-600 print:text-gray-600 uppercase tracking-wide mb-3 print:mb-2 border-t border-fergbutcher-brown-200 print:border-gray-300 pt-4 print:pt-3">
                    No Specified Time ({untimedOrders.length})
                  </h2>
                  <div className="space-y-3 print:space-y-2">
                    {untimedOrders.map(renderOrderCard)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 print:py-8">
              <Calendar className="h-16 w-16 text-fergbutcher-brown-300 print:text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-fergbutcher-black-900 print:text-black mb-2">No Orders Scheduled</h3>
              <p className="text-fergbutcher-brown-600 print:text-gray-600">
                There are no orders scheduled for collection on {formatDate(date)}.
              </p>
            </div>
          )}

          {/* Print Footer */}
          <div className="mt-8 print:mt-6 pt-4 print:pt-3 border-t border-fergbutcher-brown-200 print:border-gray-300 text-center text-sm text-fergbutcher-brown-600 print:text-gray-600">
            <p>Printed on {new Date().toLocaleString('en-NZ')} | Fergbutcher Pre-Order Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSchedule;
