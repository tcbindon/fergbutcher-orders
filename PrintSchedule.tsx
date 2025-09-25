import React from 'react';
import { Printer, X, Calendar, Gift } from 'lucide-react';
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
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'collected':
        return 'text-gray-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const sortedOrders = orders
    .filter(order => order.collectionDate === date)
    .sort((a, b) => {
      // Sort by collection time if available, then by status priority
      if (a.collectionTime && b.collectionTime) {
        return a.collectionTime.localeCompare(b.collectionTime);
      }
      if (a.collectionTime && !b.collectionTime) return -1;
      if (!a.collectionTime && b.collectionTime) return 1;
      
      const statusPriority = { 'confirmed': 1, 'pending': 2, 'collected': 3, 'cancelled': 4 };
      return statusPriority[a.status] - statusPriority[b.status];
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] print:overflow-visible print:max-h-none">
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
              {sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''} scheduled for collection
            </p>
          </div>

          {/* Orders List */}
          {sortedOrders.length > 0 ? (
            <div className="space-y-4 print:space-y-3">
              {sortedOrders.map((order, index) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <div key={order.id} className="border border-fergbutcher-brown-200 print:border-gray-300 rounded-lg p-4 print:p-3 print:break-inside-avoid">
                    <div className="flex justify-between items-start mb-3 print:mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="bg-fergbutcher-green-100 print:bg-gray-100 p-2 rounded-full">
                          {order.orderType === 'christmas' ? (
                            <Gift className="h-4 w-4 text-fergbutcher-green-600 print:text-gray-800" />
                          ) : (
                            <span className="font-bold text-fergbutcher-green-600 print:text-gray-800">#{order.id}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-fergbutcher-black-900 print:text-black">
                              {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                            </h3>
                            {order.orderType === 'christmas' && (
                              <span className="text-xs bg-fergbutcher-green-100 print:bg-gray-100 text-fergbutcher-green-700 print:text-gray-700 px-2 py-1 rounded-full">
                                Christmas
                              </span>
                            )}
                          </div>
                          {customer?.phone && (
                            <p className="text-sm text-fergbutcher-brown-600 print:text-gray-600">
                              {customer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {order.collectionTime && (
                          <div className="text-lg font-bold text-fergbutcher-black-900 print:text-black mb-1">
                            {order.collectionTime}
                          </div>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border print:border-gray-400 ${getStatusColor(order.status)} print:text-gray-800`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-3 print:mb-2">
                      <h4 className="font-medium text-fergbutcher-black-900 print:text-black mb-2 print:mb-1">Items:</h4>
                      <div className="grid grid-cols-1 gap-2 print:gap-1">
                        {order.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between items-center p-2 print:p-1 bg-fergbutcher-green-50 print:bg-gray-50 rounded">
                            <span className="text-fergbutcher-black-900 print:text-black text-sm print:text-xs">
                              {item.description}
                            </span>
                            <span className="font-semibold text-fergbutcher-black-900 print:text-black text-sm print:text-xs">
                              {item.quantity.toLocaleString('en-NZ')} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    {order.additionalNotes && (
                      <div className="bg-fergbutcher-yellow-50 print:bg-gray-100 border border-fergbutcher-yellow-200 print:border-gray-300 rounded p-3 print:p-2">
                        <p className="text-sm font-medium text-fergbutcher-yellow-800 print:text-gray-800 mb-1">
                          ⚠️ Special Instructions:
                        </p>
                        <p className="text-sm text-fergbutcher-yellow-700 print:text-gray-700">
                          {order.additionalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 1in;
            size: A4;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          
          .print\\:max-h-none {
            max-height: none !important;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          
          .print\\:mb-1 {
            margin-bottom: 0.25rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          
          .print\\:mt-6 {
            margin-top: 1.5rem !important;
          }
          
          .print\\:pt-3 {
            padding-top: 0.75rem !important;
          }
          
          .print\\:p-1 {
            padding: 0.25rem !important;
          }
          
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          
          .print\\:p-3 {
            padding: 0.75rem !important;
          }
          
          .print\\:py-8 {
            padding-top: 2rem !important;
            padding-bottom: 2rem !important;
          }
          
          .print\\:space-y-1 > * + * {
            margin-top: 0.25rem !important;
          }
          
          .print\\:space-y-3 > * + * {
            margin-top: 0.75rem !important;
          }
          
          .print\\:gap-1 {
            gap: 0.25rem !important;
          }
          
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
          
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          
          .print\\:text-gray-800 {
            color: #1f2937 !important;
          }
          
          .print\\:bg-gray-50 {
            background-color: #f9fafb !important;
          }
          
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .print\\:bg-gray-800 {
            background-color: #1f2937 !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .print\\:border-gray-400 {
            border-color: #9ca3af !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintSchedule;