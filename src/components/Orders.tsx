import React, { useState } from 'react';
import { Search, Plus, Filter, Pencil, Calendar, Package, User, AlertTriangle, ChevronDown, MessageSquare, Gift, RefreshCw, Phone, Loader2, X, Printer } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';
import { useStaffNotes } from '../hooks/useStaffNotes';
import { toast } from './Toast';
import OrderForm from './OrderForm';
import ChristmasOrderForm from './ChristmasOrderForm';
import CustomerForm from './CustomerForm';
import OrderDetail from './OrderDetail';
import PrintResults from './PrintResults';
import { getStatusBadge, getStatusIcon as statusIcon } from '../utils/statusColors';
import { Order, Customer } from '../types';

interface OrdersProps {
  initialStatusFilter?: string;
  initialCollectionDate?: string;
}

const Orders: React.FC<OrdersProps> = ({ initialStatusFilter, initialCollectionDate }) => {
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    clearError: clearOrdersError,
    addOrder,
    updateOrder,
    bulkUpdateStatus,
    updateOrderAndSeries,
    getDuplicateOrderData,
    searchOrders
  } = useOrders();

  const { customers, loading: customersLoading, addCustomer } = useCustomers();
  const { getNotesForOrder } = useStaffNotes();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter ?? 'all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChristmasModal, setShowChristmasModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [duplicatingOrder, setDuplicatingOrder] = useState<any>(null);
  const [showingComments, setShowingComments] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastFilter, setPastFilter] = useState<'upcoming' | 'last7' | 'all'>(initialCollectionDate ? 'all' : 'upcoming');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [pendingNewCustomerId, setPendingNewCustomerId] = useState<string | undefined>(undefined);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Order['status']>('confirmed');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPrintResults, setShowPrintResults] = useState(false);

  const getSortedOrders = (orders: Order[]) => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const statusPriority: Record<string, number> = { 'confirmed': 1, 'prepared': 2, 'pending': 3, 'collected': 4, 'cancelled': 5 };

    let filteredOrders: Order[];
    if (pastFilter === 'all') {
      filteredOrders = orders;
    } else if (pastFilter === 'last7') {
      // Include dateless pending orders alongside last-7-days orders
      filteredOrders = orders.filter(order => !order.collectionDate || order.collectionDate >= sevenDaysAgo);
    } else {
      // Upcoming: include dateless pending orders (awaiting a date) alongside future orders
      filteredOrders = orders.filter(order =>
        order.status !== 'cancelled' && (!order.collectionDate || order.collectionDate >= today)
      );
    }

    return filteredOrders.sort((a, b) => {
      // Dateless orders sort to the top
      if (!a.collectionDate && !b.collectionDate) {
        return (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
      }
      if (!a.collectionDate) return -1;
      if (!b.collectionDate) return 1;
      const dateComparison = new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime();
      if (dateComparison !== 0) return dateComparison;
      return (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
    });
  };

  const filteredOrders = getSortedOrders(
    searchOrders(searchTerm, customers).filter(order =>
      (statusFilter === 'all' || order.status === statusFilter) &&
      (!initialCollectionDate || order.collectionDate === initialCollectionDate) &&
      (!dateFrom || (order.collectionDate && order.collectionDate >= dateFrom)) &&
      (!dateTo || (order.collectionDate && order.collectionDate <= dateTo))
    )
  );

  const hasActiveFilters = !!(searchTerm || statusFilter !== 'all' || dateFrom || dateTo);

  const filterLabel = [
    searchTerm && `"${searchTerm}"`,
    statusFilter !== 'all' && `Status: ${statusFilter}`,
    dateFrom && `From: ${new Date(dateFrom + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    dateTo && `To: ${new Date(dateTo + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    pastFilter !== 'all' && (pastFilter === 'upcoming' ? 'Upcoming' : 'Last 7 days'),
  ].filter(Boolean).join('  ·  ') || 'All orders';

  const handleAddOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      const newOrder = await addOrder(orderData, customers);
      if (newOrder) setShowCreateModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddChristmasOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      const newOrder = await addOrder(orderData, customers);
      if (newOrder) setShowChristmasModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingOrder) return;
    setIsSubmitting(true);
    try {
      const success = updateOrderAndSeries(editingOrder, orderData, customers);
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
    const success = updateOrder(orderId, { status: newStatus }, customers);
    if (success && viewingOrder?.id === orderId) {
      setViewingOrder(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
    }
  };

  const handleBulkStatusApply = () => {
    bulkUpdateStatus(Array.from(selectedOrderIds), bulkStatus, customers);
    setSelectedOrderIds(new Set());
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleAddCustomerFromOrder = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    setIsSubmitting(true);
    try {
      const newCustomer = await addCustomer(customerData);
      if (newCustomer) {
        setPendingNewCustomerId(newCustomer.id);
        setShowAddCustomerModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (ordersLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-fergbutcher-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fergbutcher-black-900">Orders</h1>
          <p className="text-fergbutcher-green-400">Manage all customer orders</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={() => setShowPrintResults(true)}
              className="bg-white border border-fergbutcher-gold-300 text-fergbutcher-black-900 px-3 py-2 rounded-lg hover:bg-fergbutcher-gold-50 transition-colors flex items-center space-x-2 text-sm"
              title="Print filtered results"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print Results</span>
            </button>
          )}
          <button
            onClick={() => { clearOrdersError(); setShowChristmasModal(true); }}
            className="bg-gradient-to-r from-fergbutcher-green-600 to-fergbutcher-gold-600 text-white px-3 py-2 rounded-lg hover:from-fergbutcher-green-700 hover:to-fergbutcher-gold-700 transition-all flex items-center space-x-2 shadow-lg text-sm"
          >
            <Gift className="h-4 w-4" />
            <span>Christmas</span>
          </button>
          <button
            onClick={() => { clearOrdersError(); setShowCreateModal(true); }}
            className="bg-fergbutcher-green-600 text-white px-3 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {ordersError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{ordersError}</p>
          </div>
        </div>
      )}

      {initialCollectionDate && (
        <div className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-sm text-fergbutcher-green-700">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              Showing orders for{' '}
              <strong>
                {new Date(initialCollectionDate + 'T12:00:00').toLocaleDateString('en-NZ', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </strong>
            </span>
          </div>
          <a
            href="#orders"
            className="text-xs text-fergbutcher-green-600 hover:text-fergbutcher-green-800 font-medium flex items-center gap-1 flex-shrink-0"
          >
            ✕ Clear filter
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300 p-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fergbutcher-gold-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, or items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-fergbutcher-gold-50 border border-fergbutcher-gold-300 rounded-lg p-1">
                  {(['upcoming', 'last7', 'all'] as const).map((val) => (
                    <button
                      key={val}
                      onClick={() => setPastFilter(val)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        pastFilter === val
                          ? 'bg-white text-fergbutcher-green-600 shadow-sm border border-fergbutcher-gold-300'
                          : 'text-fergbutcher-gold-700 hover:text-fergbutcher-black-900'
                      }`}
                    >
                      {val === 'upcoming' ? 'Upcoming' : val === 'last7' ? 'Last 7d' : 'All'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                  <Filter className="h-4 w-4 text-fergbutcher-gold-500 flex-shrink-0" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 px-2 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="prepared">Prepared</option>
                    <option value="collected">Collected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Calendar className="h-4 w-4 text-fergbutcher-gold-500 flex-shrink-0" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-2 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent text-sm"
                    title="From date"
                  />
                  <span className="text-fergbutcher-gold-500 text-sm">–</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-2 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent text-sm"
                    title="To date"
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="p-1.5 text-fergbutcher-gold-500 hover:text-fergbutcher-black-900 hover:bg-fergbutcher-gold-100 rounded-lg transition-colors"
                      title="Clear date range"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-gold-300">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                  onChange={toggleSelectAll}
                  className="rounded border-fergbutcher-gold-300 text-fergbutcher-green-600 focus:ring-fergbutcher-green-600"
                />
                <h2 className="text-lg font-semibold text-fergbutcher-black-900">
                  {pastFilter === 'all' ? 'All Orders' : pastFilter === 'last7' ? 'Last 7 Days' : 'Current & Upcoming'} ({filteredOrders.length.toLocaleString('en-NZ')})
                </h2>
              </div>
              {selectedOrderIds.size > 0 && (
                <span className="text-sm text-fergbutcher-green-600 font-medium">{selectedOrderIds.size} selected</span>
              )}
            </div>
            <div className="divide-y divide-fergbutcher-gold-200 max-h-96 overflow-y-auto">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div
                      key={order.id}
                      className={`p-4 hover:bg-fergbutcher-gold-50 transition-colors cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-fergbutcher-gold-50' : ''}`}
                      onClick={() => setViewingOrder(order)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelectOrder(order.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded border-fergbutcher-gold-300 text-fergbutcher-green-600 focus:ring-fergbutcher-green-600 flex-shrink-0"
                        />
                        <div className="bg-fergbutcher-green-100 p-2.5 rounded-full flex-shrink-0">
                          {order.orderType === 'christmas' ? (
                            <Gift className="h-5 w-5 text-fergbutcher-green-600" />
                          ) : (
                            <User className="h-5 w-5 text-fergbutcher-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <h3 className="text-base font-semibold text-fergbutcher-black-900 truncate">
                                {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                              </h3>
                              {order.orderType === 'christmas' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-fergbutcher-green-100 to-fergbutcher-gold-100 text-fergbutcher-green-700 border border-fergbutcher-green-200 flex-shrink-0">
                                  <Gift className="h-3 w-3 mr-1" />
                                  Christmas
                                </span>
                              )}
                              {order.isRecurring && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-fergbutcher-gold-100 text-fergbutcher-gold-700 border border-fergbutcher-gold-300 flex-shrink-0">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Recurring
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {statusIcon(order.status)}
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingOrder(order); }}
                                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-fergbutcher-gold-500 hover:text-fergbutcher-black-900 hover:bg-fergbutcher-gold-100 rounded-lg transition-colors"
                                title="Edit Order"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <div className="relative">
                              <select
                                value={order.status}
                                onChange={(e) => { e.stopPropagation(); handleStatusChange(order.id, e.target.value as Order['status']); }}
                                onClick={(e) => e.stopPropagation()}
                                className={`appearance-none pr-7 pl-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${getStatusBadge(order.status)}`}
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

                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fergbutcher-green-400">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{order.collectionDate ? new Date(order.collectionDate).toLocaleDateString('en-NZ') : <span className="italic text-fergbutcher-gold-600">No date set</span>}</span>
                              </div>
                              {customer?.phone && (
                                <a
                                  href={`tel:${customer.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center space-x-1 text-fergbutcher-green-600 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  <span>{customer.phone}</span>
                                </a>
                              )}
                              {getNotesForOrder(order.id).length > 0 && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowingComments(showingComments === order.id ? null : order.id); }}
                                    className="p-1 text-fergbutcher-green-600 hover:text-fergbutcher-green-700 hover:bg-fergbutcher-green-100 rounded-full transition-colors"
                                    title={`${getNotesForOrder(order.id).length} staff comment${getNotesForOrder(order.id).length !== 1 ? 's' : ''}`}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="absolute -top-1 -right-1 bg-fergbutcher-green-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                      {getNotesForOrder(order.id).length}
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="text-sm text-fergbutcher-black-900 line-clamp-2">
                              <strong>Items:</strong> {order.items.map(item =>
                                `${item.description} (${item.quantity.toLocaleString('en-NZ')} ${item.unit})`
                              ).join(', ')}
                            </div>

                            {order.additionalNotes && (
                              <div className="text-sm text-fergbutcher-green-400 truncate">
                                <strong>Notes:</strong> {order.additionalNotes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {showingComments === order.id && (
                        <div className="mt-4 p-4 bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-fergbutcher-black-900 flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-fergbutcher-green-600" />
                              <span>Staff Comments ({getNotesForOrder(order.id).length})</span>
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowingComments(null);
                              }}
                              className="text-fergbutcher-gold-500 hover:text-fergbutcher-black-900"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {getNotesForOrder(order.id).slice(0, 3).map((note) => (
                              <div key={note.id} className="bg-white border border-fergbutcher-gold-300 rounded p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-fergbutcher-black-900 text-sm">{note.staffName}</span>
                                  <span className="text-xs text-fergbutcher-green-400">
                                    {new Date(note.timestamp).toLocaleDateString('en-NZ', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-fergbutcher-black-900 text-sm">{note.content}</p>
                              </div>
                            ))}
                            {getNotesForOrder(order.id).length > 3 && (
                              <div className="text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingOrder(order);
                                    setShowingComments(null);
                                  }}
                                  className="text-sm text-fergbutcher-green-600 hover:text-fergbutcher-green-700 font-medium"
                                >
                                  View all {getNotesForOrder(order.id).length} comments →
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <Package className="h-12 w-12 text-fergbutcher-gold-400 mx-auto mb-4" />
                  <p className="text-fergbutcher-green-400">
                    {searchTerm || statusFilter !== 'all' ? 'No orders found matching your criteria.' : 'No orders yet.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <button
                      onClick={() => { clearOrdersError(); setShowCreateModal(true); }}
                      className="mt-4 text-fergbutcher-green-600 hover:text-fergbutcher-green-700 font-medium"
                    >
                      Create your first order
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-1/2 lg:right-auto lg:transform lg:-translate-x-1/2 z-40 bg-white border border-fergbutcher-gold-300 rounded-xl shadow-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 lg:w-auto">
          <span className="font-medium text-fergbutcher-black-900 text-sm">{selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as Order['status'])}
              className="flex-1 sm:flex-none px-3 py-2 border border-fergbutcher-gold-300 rounded-lg text-sm focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="prepared">Prepared</option>
              <option value="collected">Collected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleBulkStatusApply}
              className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg hover:bg-fergbutcher-green-700 transition-colors text-sm font-medium min-h-[40px]"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="text-fergbutcher-gold-600 hover:text-fergbutcher-black-900 text-sm px-2 py-2 min-h-[40px]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* View Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Order Details</h3>
              <button onClick={() => setViewingOrder(null)} className="text-fergbutcher-gold-500 hover:text-fergbutcher-black-900">✕</button>
            </div>
            <div className="p-6">
              <OrderDetail
                order={viewingOrder}
                customer={customers.find(c => c.id === viewingOrder.customerId)}
                onEdit={() => { setEditingOrder(viewingOrder); setViewingOrder(null); }}
                onDelete={() => {}}
                onDuplicate={() => handleDuplicateOrder(viewingOrder.id)}
                onStatusChange={(status) => handleStatusChange(viewingOrder.id, status)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Create Standard Order</h3>
            </div>
            <div className="p-6">
              {ordersError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{ordersError}</p>
                </div>
              )}
              <OrderForm
                customers={customers}
                onNewCustomerClick={() => setShowAddCustomerModal(true)}
                initialCustomerId={pendingNewCustomerId}
                onSubmit={handleAddOrder}
                onCancel={() => { setShowCreateModal(false); setPendingNewCustomerId(undefined); }}
                isLoading={isSubmitting}
                showCloseButton={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Christmas Order Modal */}
      {showChristmasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900 flex items-center space-x-2">
                <Gift className="h-5 w-5 text-fergbutcher-green-600" />
                <span>Create Christmas Order</span>
              </h3>
            </div>
            <div className="p-6">
              {ordersError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{ordersError}</p>
                </div>
              )}
              <ChristmasOrderForm
                customers={customers}
                onNewCustomerClick={() => setShowAddCustomerModal(true)}
                initialCustomerId={pendingNewCustomerId}
                onSubmit={handleAddChristmasOrder}
                onCancel={() => { setShowChristmasModal(false); setPendingNewCustomerId(undefined); }}
                isLoading={isSubmitting}
                showCloseButton={true}
              />
            </div>
          </div>
        </div>
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
                  onNewCustomerClick={() => setShowAddCustomerModal(true)}
                  initialCustomerId={pendingNewCustomerId}
                  onSubmit={handleUpdateOrder}
                  onCancel={() => { setEditingOrder(null); setPendingNewCustomerId(undefined); }}
                  isLoading={isSubmitting}
                  showCloseButton={true}
                />
              ) : (
                <OrderForm
                  order={editingOrder}
                  customers={customers}
                  onNewCustomerClick={() => setShowAddCustomerModal(true)}
                  initialCustomerId={pendingNewCustomerId}
                  onSubmit={handleUpdateOrder}
                  onCancel={() => { setEditingOrder(null); setPendingNewCustomerId(undefined); }}
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
                  onNewCustomerClick={() => setShowAddCustomerModal(true)}
                  initialCustomerId={pendingNewCustomerId}
                  onSubmit={async (orderData) => {
                    const newOrder = await addOrder(orderData);
                    if (newOrder) { setPendingNewCustomerId(undefined); setDuplicatingOrder(null); toast.success(`Christmas order duplicated successfully! New order #${newOrder.id} created.`); }
                  }}
                  onCancel={() => { setDuplicatingOrder(null); setPendingNewCustomerId(undefined); }}
                  isLoading={isSubmitting}
                  showCloseButton={true}
                />
              ) : (
                <OrderForm
                  customers={customers}
                  onNewCustomerClick={() => setShowAddCustomerModal(true)}
                  initialCustomerId={pendingNewCustomerId}
                  onSubmit={async (orderData) => {
                    const newOrder = await addOrder(orderData);
                    if (newOrder) { setPendingNewCustomerId(undefined); setDuplicatingOrder(null); toast.success(`Order duplicated successfully! New order #${newOrder.id} created.`); }
                  }}
                  onCancel={() => { setDuplicatingOrder(null); setPendingNewCustomerId(undefined); }}
                  isLoading={isSubmitting}
                  initialData={duplicatingOrder}
                  showCloseButton={true}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-gold-300">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Add New Customer</h3>
              <p className="text-sm text-fergbutcher-green-400 mt-1">The new customer will be automatically selected in your order.</p>
            </div>
            <div className="p-6">
              <CustomerForm
                onSubmit={handleAddCustomerFromOrder}
                onCancel={() => setShowAddCustomerModal(false)}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Print Search Results */}
      {showPrintResults && (
        <PrintResults
          orders={filteredOrders}
          customers={customers}
          filterLabel={filterLabel}
          onClose={() => setShowPrintResults(false)}
        />
      )}
    </div>
  );
};

export default Orders;
