import React from 'react';
import { 
  Users, 
  ShoppingCart, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Gift
} from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';

const Dashboard: React.FC = () => {
  const { customers } = useCustomers();
  const { orders, getOrderStats } = useOrders();
  
  const stats = getOrderStats();
  
  // Helper function to check if an order contains Christmas items
  const isChristmasOrder = (order: any) => {
    const christmasKeywords = ['christmas', 'turkey', 'ham', 'pudding', 'mince', 'cranberry'];
    return order.items.some((item: any) => 
      christmasKeywords.some(keyword => 
        item.description?.toLowerCase().includes(keyword)
      )
    );
  };

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  const todaysOrders = orders.filter(order => order.collectionDate === today);
  const christmasOrders = orders.filter(order => isChristmasOrder(order));

  // Recent orders (last 5)
  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-fergbutcher-green-600 bg-fergbutcher-green-100';
      case 'pending':
        return 'text-fergbutcher-yellow-600 bg-fergbutcher-yellow-100';
      case 'collected':
        return 'text-fergbutcher-brown-600 bg-fergbutcher-brown-100';
      case 'cancelled':
        return 'text-fergbutcher-black-600 bg-fergbutcher-black-100';
      default:
        return 'text-fergbutcher-brown-600 bg-fergbutcher-brown-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'collected':
        return <Package className="h-4 w-4" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fergbutcher-black-900">Dashboard</h1>
        <p className="text-fergbutcher-brown-600">Welcome to your order management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-fergbutcher-brown-600 text-sm font-medium">Total Customers</p>
              <p className="text-2xl font-bold text-fergbutcher-black-900">{customers.length}</p>
            </div>
            <div className="bg-fergbutcher-green-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-fergbutcher-green-600" />
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-fergbutcher-brown-600 text-sm font-medium">Total Orders</p>
              <p className="text-2xl font-bold text-fergbutcher-black-900">{stats.total}</p>
            </div>
            <div className="bg-fergbutcher-brown-100 p-3 rounded-full">
              <ShoppingCart className="h-6 w-6 text-fergbutcher-brown-600" />
            </div>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-fergbutcher-brown-600 text-sm font-medium">Today's Collections</p>
              <p className="text-2xl font-bold text-fergbutcher-black-900">{todaysOrders.length}</p>
            </div>
            <div className="bg-fergbutcher-yellow-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-fergbutcher-yellow-600" />
            </div>
          </div>
        </div>

        {/* Christmas Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-fergbutcher-brown-600 text-sm font-medium">Christmas Orders</p>
              <p className="text-2xl font-bold text-fergbutcher-black-900">{christmasOrders.length}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <Gift className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Order Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-fergbutcher-yellow-100 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-fergbutcher-yellow-600" />
                </div>
                <span className="text-fergbutcher-black-900">Pending</span>
              </div>
              <span className="font-semibold text-fergbutcher-black-900">{stats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-fergbutcher-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-fergbutcher-green-600" />
                </div>
                <span className="text-fergbutcher-black-900">Confirmed</span>
              </div>
              <span className="font-semibold text-fergbutcher-black-900">{stats.confirmed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-fergbutcher-brown-100 p-2 rounded-lg">
                  <Package className="h-4 w-4 text-fergbutcher-brown-600" />
                </div>
                <span className="text-fergbutcher-black-900">Collected</span>
              </div>
              <span className="font-semibold text-fergbutcher-black-900">{stats.collected}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-fergbutcher-black-100 p-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-fergbutcher-black-600" />
                </div>
                <span className="text-fergbutcher-black-900">Cancelled</span>
              </div>
              <span className="font-semibold text-fergbutcher-black-900">{stats.cancelled}</span>
            </div>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Today's Collections</h3>
          {todaysOrders.length > 0 ? (
            <div className="space-y-3">
              {todaysOrders.slice(0, 5).map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-fergbutcher-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {isChristmasOrder(order) && (
                        <Gift className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-fergbutcher-black-900">
                          {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-fergbutcher-brown-600">
                          {order.collectionTime || 'No time specified'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    </div>
                  </div>
                );
              })}
              {todaysOrders.length > 5 && (
                <p className="text-sm text-fergbutcher-brown-600 text-center">
                  +{todaysOrders.length - 5} more collections today
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-fergbutcher-brown-300 mx-auto mb-3" />
              <p className="text-fergbutcher-brown-500">No collections scheduled for today</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 mb-4">Recent Orders</h3>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const customer = customers.find(c => c.id === order.customerId);
              return (
                <div key={order.id} className="flex items-center justify-between p-4 border border-fergbutcher-brown-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-fergbutcher-green-100 p-2 rounded-full">
                      <ShoppingCart className="h-4 w-4 text-fergbutcher-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-fergbutcher-black-900">Order #{order.id}</p>
                        {isChristmasOrder(order) && (
                          <Gift className="h-4 w-4 text-red-600" title="Christmas Order" />
                        )}
                      </div>
                      <p className="text-sm text-fergbutcher-brown-600">
                        {customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-fergbutcher-brown-600">
                        Collection: {new Date(order.collectionDate).toLocaleDateString('en-NZ')}
                        {order.collectionTime && ` at ${order.collectionTime}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    </div>
                    <p className="text-sm text-fergbutcher-brown-600 mt-1">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-fergbutcher-brown-300 mx-auto mb-3" />
            <p className="text-fergbutcher-brown-500">No orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;