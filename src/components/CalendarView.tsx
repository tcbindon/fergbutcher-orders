import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Printer, Gift, RefreshCw } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { toast } from './Toast';
import OrderForm from './OrderForm';
import ChristmasOrderForm from './ChristmasOrderForm';
import { CalendarViewMode, Order } from '../types';
import DayOrdersModal from './DayOrdersModal';
import PrintSchedule from './PrintSchedule';
import { getStatusDot, STATUS_DOT } from '../utils/statusColors';

const CalendarView: React.FC = () => {
  const {
    orders,
    updateOrder,
    updateOrderAndSeries,
    deleteOrder,
    deleteRecurringSeries,
    getDuplicateOrderData,
    addOrder
  } = useOrders();
  const { customers, addCustomer } = useCustomers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() =>
    window.innerWidth < 768 ? 'day' : 'month'
  );
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [duplicatingOrder, setDuplicatingOrder] = useState<Omit<Order, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printDate, setPrintDate] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'month') {
        setViewMode('day');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);
  const handleUpdateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingOrder) return;

    setIsSubmitting(true);
    try {
      const success = updateOrderAndSeries(editingOrder, orderData, customers);
      if (success) {
        setEditingOrder(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    const success = deleteOrder(orderId, customers);
    if (success) {
      setDeletingOrder(null);
    }
    return success;
  };

  const handleDuplicateOrder = (orderId: string) => {
    const duplicateData = getDuplicateOrderData(orderId);
    if (duplicateData) {
      setDuplicatingOrder(duplicateData);
    } else {
      toast.error('Failed to prepare duplicate order. Please try again.');
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    // Monday-based: Mon=0, Tue=1, ..., Sun=6
    const jsDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return (jsDay + 6) % 7;
  };

  const getOrdersForDate = (date: string) => {
    return orders.filter(order => order.collectionDate === date && order.status !== 'cancelled');
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        if (direction === 'prev') {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
      } else if (viewMode === 'week') {
        if (direction === 'prev') {
          newDate.setDate(prev.getDate() - 7);
        } else {
          newDate.setDate(prev.getDate() + 7);
        }
      } else if (viewMode === 'day') {
        if (direction === 'prev') {
          newDate.setDate(prev.getDate() - 1);
        } else {
          newDate.setDate(prev.getDate() + 1);
        }
      }
      return newDate;
    });
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDayClick = (date: Date) => {
    setSelectedDayForModal(date);
    setShowDayDetailModal(true);
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const offset = (startOfWeek.getDay() + 6) % 7; // Monday = 0
    startOfWeek.setDate(date.getDate() - offset);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 sm:h-32"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOrders = getOrdersForDate(dateString);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

      days.push(
        <div
          key={day}
          className={`h-20 sm:h-32 border border-fergbutcher-gold-200 p-1 sm:p-2 cursor-pointer hover:bg-fergbutcher-gold-50 transition-colors ${
            isToday ? 'bg-fergbutcher-gold-50 border-fergbutcher-gold-400' : ''
          }`}
          onClick={() => handleDayClick(dayDate)}
        >
          <div className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${isToday ? 'text-fergbutcher-green-600 font-bold' : 'text-fergbutcher-black-900'}`}>
            {day}
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            {dayOrders.slice(0, 3).map((order) => {
              const customer = customers.find(c => c.id === order.customerId);
              return (
                <div
                  key={order.id}
                  className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded text-white truncate flex items-center space-x-0.5 ${getStatusDot(order.status)}`}
                >
                  {order.orderType === 'christmas' && <Gift className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />}
                  {order.isRecurring && <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />}
                  <span className="truncate">{customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'}</span>
                </div>
              );
            })}
            {dayOrders.length > 3 && (
              <div className="text-[10px] sm:text-xs text-fergbutcher-gold-600 px-1 sm:px-2">
                +{dayOrders.length - 3}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {days}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    return (
      <div className="grid grid-cols-7 gap-0">
        {weekDays.map((day, index) => {
          const dateString = formatDateString(day.getFullYear(), day.getMonth(), day.getDate());
          const dayOrders = getOrdersForDate(dateString);
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div
              key={index}
              className={`min-h-96 border border-fergbutcher-gold-200 p-3 cursor-pointer hover:bg-fergbutcher-gold-50 transition-colors ${
                isToday ? 'bg-fergbutcher-gold-50 border-fergbutcher-gold-400' : ''
              }`}
              onClick={() => handleDayClick(day)}
            >
              <div className={`text-lg font-semibold mb-3 ${isToday ? 'text-fergbutcher-green-600' : 'text-fergbutcher-black-900'}`}>
                {day.getDate()}
                <div className="text-xs font-normal text-fergbutcher-green-400">
                  {day.toLocaleDateString('en-NZ', { weekday: 'short' })}
                </div>
              </div>
              <div className="space-y-2">
                {dayOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div
                      key={order.id}
                      className={`text-xs px-2 py-2 rounded text-white ${getStatusDot(order.status)}`}
                    >
                      <div className="font-medium truncate flex items-center space-x-1">
                        {order.orderType === 'christmas' && <Gift className="h-3 w-3 flex-shrink-0" />}
                        {order.isRecurring && <RefreshCw className="h-3 w-3 flex-shrink-0" />}
                        {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'}
                      </div>
                      {order.collectionTime && (
                        <div className="opacity-90">{order.collectionTime}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dateString = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayOrders = getOrdersForDate(dateString);
    const isToday = new Date().toDateString() === currentDate.toDateString();

    return (
      <div className="space-y-4">
        <div className={`text-center p-6 rounded-lg ${isToday ? 'bg-fergbutcher-gold-50 border border-fergbutcher-gold-400' : 'bg-fergbutcher-gold-50 border border-fergbutcher-gold-200'}`}>
          <h2 className={`text-2xl font-bold ${isToday ? 'text-fergbutcher-green-600' : 'text-fergbutcher-black-900'}`}>
            {currentDate.toLocaleDateString('en-NZ', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {isToday && <span className="ml-2 text-sm bg-fergbutcher-green-600 text-white px-2 py-1 rounded-full">Today</span>}
          </h2>
          <p className="text-fergbutcher-green-400 mt-2">
            {dayOrders.length} order{dayOrders.length !== 1 ? 's' : ''} scheduled for collection
          </p>
        </div>

        {dayOrders.length > 0 ? (
          <div className="space-y-3">
            {dayOrders
              .sort((a, b) => {
                if (a.collectionTime && b.collectionTime) {
                  return a.collectionTime.localeCompare(b.collectionTime);
                }
                if (a.collectionTime && !b.collectionTime) return -1;
                if (!a.collectionTime && b.collectionTime) return 1;
                return 0;
              })
              .map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <div
                    key={order.id}
                    className="bg-white border border-fergbutcher-gold-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleDayClick(currentDate)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${getStatusDot(order.status)}`}></div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-fergbutcher-black-900">
                              {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                            </h3>
                            {order.orderType === 'christmas' && (
                              <Gift className="h-4 w-4 text-fergbutcher-green-600" />
                            )}
                            {order.isRecurring && (
                              <RefreshCw className="h-4 w-4 text-fergbutcher-gold-500" />
                            )}
                          </div>
                          <p className="text-sm text-fergbutcher-green-400 flex items-center space-x-1">
                            <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                            {order.orderType === 'christmas' && (
                              <span className="text-fergbutcher-green-600">• Christmas</span>
                            )}
                            {order.isRecurring && (
                              <span className="text-fergbutcher-gold-600">• Recurring</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {order.collectionTime && (
                        <div className="text-sm font-medium text-fergbutcher-black-900">
                          {order.collectionTime}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarIcon className="h-16 w-16 text-fergbutcher-gold-300 mx-auto mb-4" />
            <p className="text-fergbutcher-green-400">No orders scheduled for this day</p>
          </div>
        )}
      </div>
    );
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-NZ', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'week':
        const weekDays = getWeekDays(currentDate);
        const startDate = weekDays[0];
        const endDate = weekDays[6];
        if (startDate.getMonth() === endDate.getMonth()) {
          return `${startDate.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })} ${startDate.getDate()}-${endDate.getDate()}`;
        } else {
          return `${startDate.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      case 'month':
      default:
        return currentDate.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fergbutcher-black-900">Calendar</h1>
          <p className="text-fergbutcher-green-400">View orders by collection date</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-fergbutcher-gold-100 rounded-lg p-1 self-start sm:self-auto">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[36px] ${
                  viewMode === mode
                    ? 'bg-fergbutcher-green-600 text-white'
                    : 'text-fergbutcher-gold-700 hover:text-fergbutcher-black-900'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded ${STATUS_DOT.pending}`}></div>
              <span className="text-xs text-fergbutcher-green-400">Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded ${STATUS_DOT.confirmed}`}></div>
              <span className="text-xs text-fergbutcher-green-400">Confirmed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded ${STATUS_DOT.prepared}`}></div>
              <span className="text-xs text-fergbutcher-green-400">Prepared</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded ${STATUS_DOT.collected}`}></div>
              <span className="text-xs text-fergbutcher-green-400">Collected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300">
        {/* Calendar Header */}
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-fergbutcher-black-900">
            {getViewTitle()}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-fergbutcher-green-100 text-fergbutcher-green-600 rounded-lg hover:bg-fergbutcher-green-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-fergbutcher-green-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="p-6">
          {viewMode === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-0 mb-4">
                {[
                  ['Mon', 'M'], ['Tue', 'T'], ['Wed', 'W'], ['Thu', 'T'], ['Fri', 'F'], ['Sat', 'S'], ['Sun', 'S']
                ].map(([full, short]) => (
                  <div key={full} className="text-center text-sm font-medium text-fergbutcher-green-400 py-2">
                    <span className="hidden sm:inline">{full}</span>
                    <span className="sm:hidden">{short}</span>
                  </div>
                ))}
              </div>
              {renderMonthView()}
            </>
          )}

          {viewMode === 'week' && (
            <>
              <div className="grid grid-cols-7 gap-0 mb-4">
                {[
                  ['Monday', 'Mon'], ['Tuesday', 'Tue'], ['Wednesday', 'Wed'],
                  ['Thursday', 'Thu'], ['Friday', 'Fri'], ['Saturday', 'Sat'], ['Sunday', 'Sun']
                ].map(([full, short]) => (
                  <div key={full} className="text-center text-sm font-medium text-fergbutcher-green-400 py-2">
                    <span className="hidden md:inline">{full}</span>
                    <span className="md:hidden">{short}</span>
                  </div>
                ))}
              </div>
              {renderWeekView()}
            </>
          )}

          {viewMode === 'day' && renderDayView()}
        </div>

        {/* Print Button */}
        <div className="px-6 py-4 border-t border-fergbutcher-gold-300 bg-fergbutcher-gold-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-fergbutcher-green-400">
              Print collection schedules for easy reference
            </span>
            <button
              onClick={() => {
                const dateString = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                setPrintDate(dateString);
                setShowPrintModal(true);
              }}
              className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Day Orders Modal */}
      {showDayDetailModal && selectedDayForModal && (
        <DayOrdersModal
          date={selectedDayForModal}
          orders={getOrdersForDate(formatDateString(
            selectedDayForModal.getFullYear(),
            selectedDayForModal.getMonth(),
            selectedDayForModal.getDate()
          ))}
          customers={customers}
          onUpdateOrder={(id, updates) => updateOrder(id, updates, customers)}
          onDeleteOrder={(id) => deleteOrder(id, customers)}
          onDeleteRecurringSeries={(id) => deleteRecurringSeries(id, customers)}
          onEdit={(order) => {
            setEditingOrder(order);
            setShowDayDetailModal(false);
            setSelectedDayForModal(null);
          }}
          onDuplicate={(orderId) => {
            handleDuplicateOrder(orderId);
            setShowDayDetailModal(false);
            setSelectedDayForModal(null);
          }}
          onClose={() => {
            setShowDayDetailModal(false);
            setSelectedDayForModal(null);
          }}
        />
      )}

      {/* Print Schedule Modal */}
      {showPrintModal && (
        <PrintSchedule
          date={printDate}
          orders={orders}
          customers={customers}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Edit Order</h3>
            </div>
            <div className="p-6">
              {editingOrder.orderType === 'christmas' ? (
                <ChristmasOrderForm
                  order={editingOrder}
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={handleUpdateOrder}
                  onCancel={() => setEditingOrder(null)}
                  isLoading={isSubmitting}
                  showCloseButton={true}
                />
              ) : (
                <OrderForm
                  order={editingOrder}
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={handleUpdateOrder}
                  onCancel={() => setEditingOrder(null)}
                  isLoading={isSubmitting}
                  showCloseButton={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Order Modal */}
      {duplicatingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Duplicate Order</h3>
              <p className="text-fergbutcher-green-400 text-sm">Review and modify the order details before creating</p>
            </div>
            <div className="p-6">
              {duplicatingOrder.orderType === 'christmas' ? (
                <ChristmasOrderForm
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={(orderData) => {
                    const newOrder = addOrder(orderData);
                    if (newOrder) {
                      setDuplicatingOrder(null);
                      toast.success(`Christmas order duplicated successfully! New order #${newOrder.id} created.`);
                    }
                  }}
                  onCancel={() => setDuplicatingOrder(null)}
                  isLoading={isSubmitting}
                  showCloseButton={true}
                />
              ) : (
                <OrderForm
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={(orderData) => {
                    const newOrder = addOrder(orderData);
                    if (newOrder) {
                      setDuplicatingOrder(null);
                      toast.success(`Order duplicated successfully! New order #${newOrder.id} created.`);
                    }
                  }}
                  onCancel={() => setDuplicatingOrder(null)}
                  isLoading={isSubmitting}
                  initialData={duplicatingOrder}
                  showCloseButton={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
