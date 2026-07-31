import React from 'react';
import { useAppData } from '../context/AppDataContext';
import { useGoogleSheetsContext } from '../context/GoogleSheetsContext';
import { emailSettings } from '../services/emailService';
import backupService from '../services/backupService';
import { toast } from './Toast';
import OrderDetail from './OrderDetail';
import OrderForm from './OrderForm';
import ChristmasOrderForm from './ChristmasOrderForm';
import PrintSchedule from './PrintSchedule';
import RecurringScopeModal from './RecurringScopeModal';
import { collapsePendingRecurring, countPendingInSeries } from '../utils/recurringUtils';
import { getStatusBadge, getStatusIcon } from '../utils/statusColors';
import {
  ShoppingCart,
  Calendar,
  Clock,
  Package,
  Gift,
 AlertTriangle,
  RefreshCw,
  ChevronDown,
  Printer,
  ClipboardList,
  X
} from 'lucide-react';
import { Order, ViewType } from '../types';
import { todayLocal, formatDateLocal } from '../utils/dateUtils';

interface DashboardProps {
  onNavigate?: (view: ViewType) => void;
  onNavigateToOrders?: (statusFilter?: string, collectionDate?: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onNavigateToOrders }) => {
  const { customers, addCustomer, orders, getOrderStats, updateOrder, updateOrderAndSeries, updateOrderAndFuture, deleteOrder, deleteRecurringSeries, getDuplicateOrderData, addOrder } = useAppData();
  const orderStats = getOrderStats();
  const { isConnected: sheetsConnected } = useGoogleSheetsContext();

  const [emailActive, setEmailActive] = React.useState<boolean | null>(null);
  const [lastBackup, setLastBackup] = React.useState<Date | null>(null);

  React.useEffect(() => {
    emailSettings.get().then(s => setEmailActive(!!s?.automationEnabled));
  }, []);

  React.useEffect(() => {
    const updateBackup = async () => {
      const list = await backupService.getBackupList();
      setLastBackup(list.length > 0 ? new Date(list[0].created_at) : null);
    };
    updateBackup();
    const interval = setInterval(updateBackup, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatBackupTime = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  };

  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);
  const [duplicatingOrder, setDuplicatingOrder] = React.useState<any>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPrintSchedule, setShowPrintSchedule] = React.useState(false);
  const [editScopePrompt, setEditScopePrompt] = React.useState<{
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;
    orderCount: number;
  } | null>(null);
  const [statusScopePrompt, setStatusScopePrompt] = React.useState<{
    orderId: string;
    newStatus: Order['status'];
    orderCount: number;
  } | null>(null);

  const today = todayLocal();
  const tomorrow = formatDateLocal(new Date(Date.now() + 86400000));
  const dayAfterTomorrow = formatDateLocal(new Date(Date.now() + 2 * 86400000));

  const overdueOrders = orders.filter(
    o => o.collectionDate && o.collectionDate < today && o.status !== 'collected' && o.status !== 'cancelled'
  );

  const allPendingOrders = collapsePendingRecurring(
    orders
      .filter(o => o.status === 'pending')
      .sort((a, b) => {
        if (!a.collectionDate && !b.collectionDate) return 0;
        if (!a.collectionDate) return 1;
        if (!b.collectionDate) return -1;
        return a.collectionDate.localeCompare(b.collectionDate);
      })
  );

  const tomorrowCount = orders.filter(
    o => o.collectionDate === tomorrow && o.status !== 'cancelled'
  ).length;

  const stats = [
    {
      title: "Pending Orders",
      value: orderStats.pending.toLocaleString('en-NZ'),
      change: `${orderStats.pending} awaiting confirmation`,
      icon: ShoppingCart,
      iconBg: 'bg-fergbutcher-gold-100',
      iconColor: 'text-fergbutcher-gold-700',
      onClick: () => onNavigateToOrders?.('pending'),
    },
    {
      title: "Today's Collections",
      value: orderStats.todaysTotal.toLocaleString('en-NZ'),
      change: `${orderStats.todaysPending} pending`,
      icon: Calendar,
      iconBg: 'bg-fergbutcher-green-100',
      iconColor: 'text-fergbutcher-green-600',
      onClick: () => onNavigateToOrders?.(undefined, today),
    },
    {
      title: "Tomorrow's Orders",
      value: tomorrowCount.toLocaleString('en-NZ'),
      change: 'for prep planning today',
      icon: Clock,
      iconBg: 'bg-fergbutcher-green-50',
      iconColor: 'text-fergbutcher-green-400',
      onClick: () => onNavigateToOrders?.(undefined, tomorrow),
    },
  ];

  const getThisWeeksOrders = () => {
    const todayDate = new Date();
    const todayString = formatDateLocal(todayDate);
    const startOfWeek = new Date(todayDate);
    const offset = (todayDate.getDay() + 6) % 7;
    startOfWeek.setDate(todayDate.getDate() - offset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDateString = formatDateLocal(startOfWeek);
    const endDateString = formatDateLocal(endOfWeek);
    const statusPriority: Record<string, number> = { 'confirmed': 1, 'prepared': 2, 'pending': 3, 'collected': 4, 'cancelled': 5 };

    return collapsePendingRecurring(
      orders
        .filter(order => order.collectionDate >= startDateString && order.collectionDate <= endDateString)
        .filter(order => order.collectionDate >= todayString)
        .filter(order => order.status !== 'cancelled')
    )
      .sort((a, b) => {
        const dateComparison = new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime();
        if (dateComparison !== 0) return dateComparison;
        return statusPriority[a.status] - statusPriority[b.status];
      })
      .slice(0, 5)
      .map(order => {
        const customer = customers.find(c => c.id === order.customerId);
        return {
          id: order.id,
          customer: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer',
          items: order.items.map(item => `${item.description} (${item.quantity.toLocaleString('en-NZ')} ${item.unit})`).join(', '),
          collection: order.collectionDate,
          status: order.status,
          fullOrder: order
        };
      });
  };

  const thisWeeksOrders = getThisWeeksOrders();

  const handleUpdateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingOrder) return;
    if (editingOrder.isRecurring && editingOrder.parentOrderId) {
      const seriesCount = orders.filter(
        o => o.parentOrderId === editingOrder.parentOrderId &&
             o.collectionDate >= (editingOrder.collectionDate || '')
      ).length;
      setEditScopePrompt({ orderData, orderCount: seriesCount });
      return;
    }
    applyUpdateOrder(orderData, false);
  };

  const applyUpdateOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, applyToFuture: boolean) => {
    if (!editingOrder) return;
    setIsSubmitting(true);
    try {
      const success = applyToFuture
        ? updateOrderAndFuture(editingOrder, orderData, true, customers)
        : updateOrderAndSeries(editingOrder, orderData, customers);
      if (success) {
        setEditingOrder(null);
        if (viewingOrder?.id === editingOrder.id) {
          setViewingOrder({ ...editingOrder, ...orderData, updatedAt: new Date().toISOString() });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = () => {
    if (!deletingOrder) return;
    const success = deleteOrder(deletingOrder.id, customers);
    if (success) {
      setDeletingOrder(null);
      if (viewingOrder?.id === deletingOrder.id) setViewingOrder(null);
    }
  };

  const handleDeleteRecurringSeries = () => {
    if (!deletingOrder) return;
    const result = deleteRecurringSeries(deletingOrder.id, customers);
    if (result.success) {
      setDeletingOrder(null);
      if (viewingOrder?.id === deletingOrder.id || (viewingOrder?.parentOrderId && viewingOrder.parentOrderId === deletingOrder.parentOrderId && viewingOrder.collectionDate >= deletingOrder.collectionDate)) {
        setViewingOrder(null);
      }
    }
  };

  const handleDuplicateOrder = (orderId: string) => {
    const duplicateData = getDuplicateOrderData(orderId);
    if (duplicateData) {
      setDuplicatingOrder(duplicateData);
      setViewingOrder(null);
    } else {
      toast.error('Failed to prepare duplicate order. Please try again.');
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.isRecurring && order.parentOrderId) {
      const seriesCount = orders.filter(
        o => o.parentOrderId === order.parentOrderId &&
             o.collectionDate >= (order.collectionDate || '')
      ).length;
      setStatusScopePrompt({ orderId, newStatus, orderCount: seriesCount });
      return;
    }
    applyStatusChange(orderId, newStatus);
  };

  const applyStatusChange = (orderId: string, newStatus: Order['status']) => {
    const success = updateOrder(orderId, { status: newStatus }, customers);
    if (success && viewingOrder?.id === orderId) {
      setViewingOrder(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fergbutcher-black-900">Dashboard</h1>
          <p className="text-fergbutcher-green-400">Welcome back! Here's what's happening with your orders today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintSchedule(true)}
            className="flex items-center space-x-2 bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-3 py-2 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print Today's Orders</span>
            <span className="sm:hidden">Print</span>
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('checklist')}
              className="flex items-center space-x-2 bg-fergbutcher-green-600 text-white px-3 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors text-sm font-medium"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Today's Checklist</span>
              <span className="sm:hidden">Checklist</span>
            </button>
          )}
        </div>
      </div>

      {/* Attention Required Alerts */}
      {(overdueOrders.length > 0 || allPendingOrders.length > 0) && (
        <div className="space-y-3">
          {overdueOrders.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800">
                  {overdueOrders.length} Overdue {overdueOrders.length === 1 ? 'Order' : 'Orders'} — Never Collected
                </h3>
              </div>
              <div className="space-y-2">
                {overdueOrders.slice(0, 5).map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-red-200 rounded-lg px-4 py-2 gap-2 cursor-pointer hover:bg-red-50 transition-colors"
                      onClick={() => setViewingOrder(order)}
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-fergbutcher-black-900 truncate block">
                          {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                        </span>
                        <span className="text-sm text-red-600">
                          was {new Date(order.collectionDate).toLocaleDateString('en-NZ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'collected'); }}
                          className="text-xs bg-fergbutcher-green-100 text-fergbutcher-green-600 px-3 py-1.5 rounded hover:bg-fergbutcher-green-200 transition-colors min-h-[36px]"
                        >
                          Mark Collected
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'cancelled'); }}
                          className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 transition-colors min-h-[36px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
                {overdueOrders.length > 5 && (
                  <p className="text-sm text-red-600 pl-1">+{overdueOrders.length - 5} more overdue orders</p>
                )}
              </div>
            </div>
          )}

          {allPendingOrders.length > 0 && (
            <div className="bg-fergbutcher-gold-50 border border-fergbutcher-gold-300 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-5 w-5 text-fergbutcher-gold-600" />
                <h3 className="font-semibold text-fergbutcher-gold-700">
                  {allPendingOrders.length} Pending {allPendingOrders.length === 1 ? 'Order' : 'Orders'}
                </h3>
              </div>
              <div className="space-y-2">
                {allPendingOrders.map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  const isToday = order.collectionDate === today;
                  const isTomorrow = order.collectionDate === tomorrow;
                  const isUrgent = isToday || isTomorrow;
                  const hasDate = !!order.collectionDate;
                  return (
                    <div
                      key={order.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg px-4 py-2 gap-2 cursor-pointer transition-colors ${
                        isUrgent
                          ? 'bg-amber-50 border border-amber-300 hover:bg-amber-100'
                          : 'bg-white border border-fergbutcher-gold-200 hover:bg-fergbutcher-gold-50'
                      }`}
                      onClick={() => setViewingOrder(order)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-fergbutcher-black-900 truncate">
                            {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                          </span>
                          {isUrgent && (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex-shrink-0">
                              {isToday ? 'TODAY' : 'TOMORROW'}
                            </span>
                          )}
                        </div>
                        <span className={`text-sm truncate block ${isUrgent ? 'text-amber-800' : 'text-fergbutcher-brown-500'}`}>
                          {hasDate
                            ? new Date(order.collectionDate + 'T00:00:00').toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
                            : 'No date set'}
                          {customer?.phone && isUrgent && (
                            <a href={`tel:${customer.phone}`} className="ml-2 text-fergbutcher-green-600 hover:underline" onClick={e => e.stopPropagation()}>
                              {customer.phone}
                            </a>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!hasDate && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingOrder(order); }}
                            className="text-xs bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-3 py-1.5 rounded hover:bg-fergbutcher-gold-200 transition-colors border border-fergbutcher-gold-300 min-h-[36px]"
                          >
                            Assign Date
                          </button>
                        )}
                        {hasDate && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'confirmed'); }}
                            className="text-xs bg-fergbutcher-green-50 text-fergbutcher-green-600 px-3 py-1.5 rounded hover:bg-fergbutcher-green-100 transition-colors border border-fergbutcher-green-200 min-h-[36px]"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.title}
              onClick={stat.onClick}
              className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300 p-6 text-left w-full hover:shadow-md hover:border-fergbutcher-green-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-fergbutcher-green-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-fergbutcher-black-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-fergbutcher-green-400">
                  {stat.change}
                </span>
                <span className="text-xs text-fergbutcher-green-200 group-hover:text-fergbutcher-green-500 transition-colors font-medium">
                  View orders →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* This Week's Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300">
        <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
          <h2 className="text-lg font-semibold text-fergbutcher-black-900">This Week's Orders</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {thisWeeksOrders.length > 0 ? thisWeeksOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-fergbutcher-gold-50 rounded-lg cursor-pointer hover:bg-fergbutcher-gold-100 transition-colors gap-3"
                onClick={() => setViewingOrder(order.fullOrder)}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {getStatusIcon(order.status)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-fergbutcher-black-900 truncate">{order.customer}</p>
                      {order.fullOrder.orderType === 'christmas' && (
                        <Gift className="h-4 w-4 text-fergbutcher-green-600 flex-shrink-0" />
                      )}
                      {order.fullOrder.isRecurring && (
                        <RefreshCw className="h-4 w-4 text-fergbutcher-green-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-fergbutcher-green-400 truncate">{order.items}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-2 flex-shrink-0">
                  <p className="text-sm font-medium text-fergbutcher-black-900">
                    {new Date(order.collection).toLocaleDateString('en-NZ')}
                  </p>
                  <div className="relative">
                    <select
                      value={order.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.fullOrder.id, e.target.value as Order['status']);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`appearance-none pr-8 pl-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${getStatusBadge(order.status)}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="prepared">Prepared</option>
                      <option value="collected">Collected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-fergbutcher-gold-400 mx-auto mb-4" />
                <p className="text-fergbutcher-green-400">No orders scheduled for this week</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Order Details</h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-fergbutcher-gold-500 hover:text-fergbutcher-black-900"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <OrderDetail
                order={viewingOrder}
                customer={customers.find(c => c.id === viewingOrder.customerId)}
                onEdit={() => {
                  setEditingOrder(viewingOrder);
                  setViewingOrder(null);
                }}
                onDelete={() => {
                  setDeletingOrder(viewingOrder);
                  setViewingOrder(null);
                }}
                onDuplicate={() => handleDuplicateOrder(viewingOrder.id)}
                onStatusChange={(status) => handleStatusChange(viewingOrder.id, status)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Edit Order</h3>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600 hover:bg-fergbutcher-brown-100 rounded-full transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
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
                />
              ) : (
                <OrderForm
                  order={editingOrder}
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={handleUpdateOrder}
                  onCancel={() => setEditingOrder(null)}
                  isLoading={isSubmitting}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Delete Order</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-fergbutcher-black-900 font-medium">
                    Are you sure you want to delete this order?
                  </p>
                  <p className="text-fergbutcher-green-400 text-sm mt-1">
                    This action cannot be undone.
                  </p>
                  {deletingOrder.isRecurring && deletingOrder.parentOrderId && (
                    <p className="text-fergbutcher-gold-700 text-sm mt-2 bg-fergbutcher-gold-50 border border-fergbutcher-gold-300 rounded p-2">
                      This is part of a recurring series. You can delete only this order, or this order and all future occurrences.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end flex-wrap gap-3">
                <button
                  onClick={() => setDeletingOrder(null)}
                  className="px-4 py-2 text-fergbutcher-gold-700 bg-fergbutcher-gold-100 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {deletingOrder.isRecurring && deletingOrder.parentOrderId ? 'Delete This Order Only' : 'Delete Order'}
                </button>
                {deletingOrder.isRecurring && deletingOrder.parentOrderId && (
                  <button
                    onClick={handleDeleteRecurringSeries}
                    className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
                  >
                    Delete This &amp; All Future
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Order Modal */}
      {duplicatingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-fergbutcher-black-900">Duplicate Order</h3>
                <p className="text-fergbutcher-green-400 text-sm">Review and modify the order details before creating</p>
              </div>
              <button
                type="button"
                onClick={() => setDuplicatingOrder(null)}
                className="p-2 text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600 hover:bg-fergbutcher-brown-100 rounded-full transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {duplicatingOrder.orderType === 'christmas' ? (
                <ChristmasOrderForm
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={async (orderData) => {
                    const newOrder = await addOrder(orderData);
                    if (newOrder) {
                      setDuplicatingOrder(null);
                      toast.success(`Christmas order duplicated successfully! New order #${newOrder.id} created.`);
                    }
                  }}
                  onCancel={() => setDuplicatingOrder(null)}
                  isLoading={isSubmitting}
                />
              ) : (
                <OrderForm
                  customers={customers}
                  onAddCustomer={addCustomer}
                  onSubmit={async (orderData) => {
                    const newOrder = await addOrder(orderData);
                    if (newOrder) {
                      setDuplicatingOrder(null);
                      toast.success(`Order duplicated successfully! New order #${newOrder.id} created.`);
                    }
                  }}
                  onCancel={() => setDuplicatingOrder(null)}
                  isLoading={isSubmitting}
                  initialData={duplicatingOrder}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Today's Schedule */}
      {showPrintSchedule && (
        <PrintSchedule
          date={today}
          orders={orders}
          customers={customers}
          onClose={() => setShowPrintSchedule(false)}
        />
      )}

      {/* Edit Scope Prompt (recurring) */}
      {editScopePrompt && (
        <RecurringScopeModal
          open={true}
          orderCount={editScopePrompt.orderCount}
          title="Save changes to which orders?"
          message="This is a recurring order. Choose how far your edits should apply."
          onChoose={(applyToFuture) => {
            const data = editScopePrompt.orderData;
            setEditScopePrompt(null);
            applyUpdateOrder(data, applyToFuture);
          }}
          onCancel={() => setEditScopePrompt(null)}
        />
      )}

      {/* Status Scope Prompt (recurring) */}
      {statusScopePrompt && (
        <RecurringScopeModal
          open={true}
          orderCount={statusScopePrompt.orderCount}
          title={`Mark as ${statusScopePrompt.newStatus} — which orders?`}
          message="This is a recurring order. Choose how far the status change should apply."
          onChoose={(applyToFuture) => {
            const { orderId, newStatus } = statusScopePrompt;
            const order = orders.find(o => o.id === orderId);
            setStatusScopePrompt(null);
            if (order && applyToFuture) {
              updateOrderAndFuture(order, { status: newStatus }, true, customers);
              if (viewingOrder?.id === orderId) {
                setViewingOrder(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
              }
            } else {
              applyStatusChange(orderId, newStatus);
            }
          }}
          onCancel={() => setStatusScopePrompt(null)}
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => window.location.hash = '#orders'}
              className="w-full bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors"
            >
              Create New Order
            </button>
            <button
              onClick={() => window.location.hash = '#customers'}
              className="w-full bg-fergbutcher-gold-100 text-fergbutcher-gold-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors"
            >
              Add Customer
            </button>
            <button
              onClick={() => window.location.hash = '#calendar'}
              className="w-full bg-fergbutcher-yellow-100 text-fergbutcher-yellow-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-yellow-200 transition-colors"
            >
              View Calendar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Today's Collections</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-green-400">Confirmed</span>
              <span className="font-medium text-fergbutcher-green-600">{orderStats.todaysConfirmed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-green-400">Pending</span>
              <span className="font-medium text-fergbutcher-gold-600">{orderStats.todaysPending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-green-400">Total</span>
              <span className="font-bold text-fergbutcher-black-900">{orderStats.todaysTotal}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${sheetsConnected ? 'bg-fergbutcher-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-fergbutcher-green-400">
                Google Sheets {sheetsConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${emailActive === null ? 'bg-fergbutcher-gold-400' : emailActive ? 'bg-fergbutcher-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-fergbutcher-green-400">
                Email Service {emailActive === null ? 'Checking…' : emailActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${lastBackup ? 'bg-fergbutcher-green-500' : 'bg-fergbutcher-gold-400'}`}></div>
              <span className="text-sm text-fergbutcher-green-400">
                Last Backup: {lastBackup ? formatBackupTime(lastBackup) : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
