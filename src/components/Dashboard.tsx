import React from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import { 
  Users, 
  ShoppingCart, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Package
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { customers } = useCustomers();
  const { orders, getOrderStats } = useOrders();
  const orderStats = getOrderStats();

  // Mock data for demonstration
  const stats = [
    {
      title: 'Total Customers',
      value: customers.length.toLocaleString('en-NZ'),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'fergbutcher-green'
    },
    {
      title: 'Active Orders',
      value: (orderStats.pending + orderStats.confirmed).toLocaleString('en-NZ'),
      change: `${orderStats.pending} pending`,
      changeType: 'positive' as const,
      icon: ShoppingCart,
      color: 'fergbutcher-brown'
    },
    {
      title: 'Today\'s Collections',
      value: orderStats.todaysTotal.toLocaleString('en-NZ'),
      change: `${orderStats.todaysPending} pending`,
      changeType: 'neutral' as const,
      icon: Calendar,
      color: 'fergbutcher-yellow'
    },
    {
      title: 'This Week\'s Revenue',
      value: '$2,340',
      change: '+18%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'fergbutcher-black'
    }
  ];

  // Get this week's orders, sorted by collection date then status
  const getThisWeeksOrders = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
    
    const startDateString = startOfWeek.toISOString().split('T')[0];
    const endDateString = endOfWeek.toISOString().split('T')[0];
    
    const statusPriority = { 'confirmed': 1, 'pending': 2, 'collected': 3, 'cancelled': 4 };
    
    return orders
      .filter(order => order.collectionDate >= startDateString && order.collectionDate <= endDateString)
      .sort((a, b) => {
        // First sort by collection date (earliest first)
        const dateComparison = new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        // Then sort by status priority
        return statusPriority[a.status] - statusPriority[b.status];
      })
      .slice(0, 5) // Show only first 5
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
  const [viewingOrder, setViewingOrder] = React.useState<any>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-fergbutcher-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-fergbutcher-yellow-500" />;
      case 'collected':
        return <Package className="h-4 w-4 text-fergbutcher-brown-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-fergbutcher-black-500" />;
      default:
        return <Clock className="h-4 w-4 text-fergbutcher-brown-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-fergbutcher-green-100 text-fergbutcher-green-800';
      case 'pending':
        return 'bg-fergbutcher-yellow-100 text-fergbutcher-yellow-800';
      case 'collected':
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800';
      case 'cancelled':
        return 'bg-fergbutcher-black-100 text-fergbutcher-black-800';
      default:
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fergbutcher-black-900">Dashboard</h1>
        <p className="text-fergbutcher-brown-600">Welcome back! Here's what's happening with your orders today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-fergbutcher-brown-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-fergbutcher-black-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-fergbutcher-green-600' : 
                  stat.changeType === 'negative' ? 'text-fergbutcher-black-600' : 'text-fergbutcher-brown-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-fergbutcher-brown-500 ml-2">from last week</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* This Week's Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
          <h2 className="text-lg font-semibold text-fergbutcher-black-900">This Week's Orders</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {thisWeeksOrders.length > 0 ? thisWeeksOrders.map((order) => (
              <div 
                key={order.id} 
                className="flex items-center justify-between p-4 bg-fergbutcher-green-50 rounded-lg cursor-pointer hover:bg-fergbutcher-green-100 transition-colors"
                onClick={() => setViewingOrder(order.fullOrder)}
              >
                <div className="flex items-center space-x-4">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="font-medium text-fergbutcher-black-900">{order.customer}</p>
                    <p className="text-sm text-fergbutcher-brown-600">{order.items}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-fergbutcher-black-900">
                      {new Date(order.collection).toLocaleDateString('en-NZ')}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-fergbutcher-brown-300 mx-auto mb-4" />
                <p className="text-fergbutcher-brown-500">No orders scheduled for this week</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-fergbutcher-brown-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-fergbutcher-black-900">Order Details</h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-fergbutcher-brown-400 hover:text-fergbutcher-brown-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-fergbutcher-black-900 mb-2">Customer</h4>
                  <p className="text-fergbutcher-brown-700">
                    {(() => {
                      const customer = customers.find(c => c.id === viewingOrder.customerId);
                      return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
                    })()}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-fergbutcher-black-900 mb-2">Collection Date</h4>
                  <p className="text-fergbutcher-brown-700">
                    {new Date(viewingOrder.collectionDate).toLocaleDateString('en-NZ')}
                    {viewingOrder.collectionTime && ` at ${viewingOrder.collectionTime}`}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-fergbutcher-black-900 mb-2">Status</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingOrder.status)}`}>
                    {viewingOrder.status}
                  </span>
                </div>
                
                <div>
                  <h4 className="font-semibold text-fergbutcher-black-900 mb-2">Items</h4>
                  <div className="space-y-2">
                    {viewingOrder.items.map((item: any, index: number) => (
                      <div key={index} className="p-3 bg-fergbutcher-green-50 rounded-lg">
                        <p className="font-medium text-fergbutcher-black-900">{item.description}</p>
                        <p className="text-sm text-fergbutcher-brown-600">
                          {item.quantity.toLocaleString('en-NZ')} {item.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {viewingOrder.additionalNotes && (
                  <div>
                    <h4 className="font-semibold text-fergbutcher-black-900 mb-2">Additional Notes</h4>
                    <p className="text-fergbutcher-brown-700">{viewingOrder.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
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
              className="w-full bg-fergbutcher-brown-100 text-fergbutcher-brown-700 px-4 py-2 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors"
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

        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Today's Collections</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-brown-600">Confirmed</span>
              <span className="font-medium text-fergbutcher-green-600">{orderStats.todaysConfirmed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-brown-600">Pending</span>
              <span className="font-medium text-fergbutcher-yellow-600">{orderStats.todaysPending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-fergbutcher-brown-600">Total</span>
              <span className="font-bold text-fergbutcher-black-900">{orderStats.todaysTotal}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-fergbutcher-green-500 rounded-full"></div>
              <span className="text-sm text-fergbutcher-brown-600">Google Sheets Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-fergbutcher-green-500 rounded-full"></div>
              <span className="text-sm text-fergbutcher-brown-600">Email Service Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-fergbutcher-brown-500 rounded-full"></div>
              <span className="text-sm text-fergbutcher-brown-600">Last Backup: 2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;