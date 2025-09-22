import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Printer } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { CalendarViewMode } from '../types';
import DayOrdersModal from './DayOrdersModal';
import PrintSchedule from './PrintSchedule';

const CalendarView: React.FC = () => {
  const { orders } = useOrders();
  const { customers } = useCustomers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDate, setPrintDate] = useState<string>('');

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getOrdersForDate = (date: string) => {
    return orders.filter(order => order.collectionDate === date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-fergbutcher-green-500';
      case 'pending':
        return 'bg-fergbutcher-yellow-500';
      case 'collected':
        return 'bg-fergbutcher-brown-500';
      case 'cancelled':
        return 'bg-fergbutcher-black-500';
      default:
        return 'bg-fergbutcher-brown-400';
    }
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
    const day = startOfWeek.getDay();
    startOfWeek.setDate(date.getDate() - day);
    
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

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateString(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOrders = getOrdersForDate(dateString);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

      days.push(
        <div
          key={day}
          className={`h-32 border border-fergbutcher-brown-200 p-2 cursor-pointer hover:bg-fergbutcher-green-50 transition-colors ${
            isToday ? 'bg-fergbutcher-green-50 border-fergbutcher-green-200' : ''
          }`}
          onClick={() => handleDayClick(dayDate)}
        >
          <div className={`text-sm font-medium mb-2 ${isToday ? 'text-fergbutcher-green-600' : 'text-fergbutcher-black-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayOrders.slice(0, 3).map((order) => {
              const customer = customers.find(c => c.id === order.customerId);
              return (
                <div
                  key={order.id}
                  className={`text-xs px-2 py-1 rounded text-white truncate ${getStatusColor(order.status)}`}
                >
                  {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown'}
                </div>
              );
            })}
            {dayOrders.length > 3 && (
              <div className="text-xs text-fergbutcher-brown-500 px-2">
                +{dayOrders.length - 3} more
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
              className={`min-h-96 border border-fergbutcher-brown-200 p-3 cursor-pointer hover:bg-fergbutcher-green-50 transition-colors ${
                isToday ? 'bg-fergbutcher-green-50 border-fergbutcher-green-200' : ''
              }`}
              onClick={() => handleDayClick(day)}
            >
              <div className={`text-lg font-semibold mb-3 ${isToday ? 'text-fergbutcher-green-600' : 'text-fergbutcher-black-900'}`}>
                {day.getDate()}
                <div className="text-xs font-normal text-fergbutcher-brown-600">
                  {day.toLocaleDateString('en-NZ', { weekday: 'short' })}
                </div>
              </div>
              <div className="space-y-2">
                {dayOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div
                      key={order.id}
                      className={`text-xs px-2 py-2 rounded text-white ${getStatusColor(order.status)}`}
                    >
                      <div className="font-medium truncate">
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
        <div className={`text-center p-6 rounded-lg ${isToday ? 'bg-fergbutcher-green-50 border border-fergbutcher-green-200' : 'bg-fergbutcher-brown-50 border border-fergbutcher-brown-200'}`}>
          <h2 className={`text-2xl font-bold ${isToday ? 'text-fergbutcher-green-600' : 'text-fergbutcher-black-900'}`}>
            {currentDate.toLocaleDateString('en-NZ', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            {isToday && <span className="ml-2 text-sm bg-fergbutcher-green-600 text-white px-2 py-1 rounded-full">Today</span>}
          </h2>
          <p className="text-fergbutcher-brown-600 mt-2">
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
                    className="bg-white border border-fergbutcher-brown-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleDayClick(currentDate)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${getStatusColor(order.status)}`}></div>
                        <div>
                          <h3 className="font-semibold text-fergbutcher-black-900">
                            {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                          </h3>
                          <p className="text-sm text-fergbutcher-brown-600">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
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
            <CalendarIcon className="h-16 w-16 text-fergbutcher-brown-300 mx-auto mb-4" />
            <p className="text-fergbutcher-brown-500">No orders scheduled for this day</p>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-fergbutcher-black-900">Calendar</h1>
          <p className="text-fergbutcher-brown-600">View orders by collection date</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-fergbutcher-brown-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-fergbutcher-green-600 text-white'
                    : 'text-fergbutcher-brown-700 hover:text-fergbutcher-black-900'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-fergbutcher-green-500 rounded"></div>
              <span className="text-sm text-fergbutcher-brown-600">Confirmed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-fergbutcher-yellow-500 rounded"></div>
              <span className="text-sm text-fergbutcher-brown-600">Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-fergbutcher-brown-500 rounded"></div>
              <span className="text-sm text-fergbutcher-brown-600">Collected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
        {/* Calendar Header */}
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center">
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
              className="px-3 py-1 text-sm bg-fergbutcher-green-100 text-fergbutcher-green-700 rounded-lg hover:bg-fergbutcher-green-200 transition-colors"
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
              {/* Day Headers for Month View */}
              <div className="grid grid-cols-7 gap-0 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-fergbutcher-brown-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              {renderMonthView()}
            </>
          )}
          
          {viewMode === 'week' && (
            <>
              {/* Day Headers for Week View */}
              <div className="grid grid-cols-7 gap-0 mb-4">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-fergbutcher-brown-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              {renderWeekView()}
            </>
          )}
          
          {viewMode === 'day' && renderDayView()}
        </div>
        
        {/* Print Button */}
        <div className="px-6 py-4 border-t border-fergbutcher-brown-200 bg-fergbutcher-green-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-fergbutcher-brown-600">
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
          onUpdateOrder={(id, updates) => {
            // This would need to be passed down from the parent component
            // For now, we'll just return false to indicate no update capability
            console.log('Update order:', id, updates);
            return false;
          }}
          onDeleteOrder={(id) => {
            // This would need to be passed down from the parent component
            console.log('Delete order:', id);
            return false;
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
    </div>
  );
};

export default CalendarView;