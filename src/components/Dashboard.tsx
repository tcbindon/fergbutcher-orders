import React from 'react';
import { 
  Users, 
  ShoppingCart, 
  Calendar, 
  TrendingUp,
  Gift,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';

const Dashboard: React.FC = () => {
  const { customers } = useCustomers();
  const { orders, getOrderStats } = useOrders();
  const stats = getOrderStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-fergbutcher-green-100 text-fergbutcher-green-800 border-fergbutcher-green-200';
      case 'pending':
        return 'bg-fergbutcher-yellow-100 text-fergbutcher-yellow-800 border-fergbutcher-yellow-200';
      case 'collected':
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800 border-fergbutcher-brown-200';
      case 'cancelled':
        return 'bg-fergbutcher-black-100 text-fergbutcher-black-800 border-fergbutcher-black-200';
      default:
        return 'bg-fergbutcher-brown-100 text-fergbutcher-brown-800 border-fergbutcher-brown-200';
    }
  };

  const isChristmasOrder = (order: any) => {
    const christmasKeywords = [
      'turkey', 'duck', 'goose', 'ham', 'wellington', 'lamb', 'christmas', 'festive'
    ];
    return order.items.some((item: any) => 
      christmasKeywords.some(keyword => 
        item.description.toLowerCase().includes(keyword)
      )
    );
  };

  // Get this week's orders (last 7 days)
  const thisWeekOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return orderDate >= weekAgo;
  }).slice(0, 5); // Show only 5 most recent

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fergbutcher-black-900">Dashboard</h1>
        <p className="text-fergbutcher-brown-600">Welcome to your order management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Active Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-fergbutcher-brown-600 text-sm font-medium">Active Orders</p>
              <p className="text-2xl font-bold text-fergbutcher-black-900">{stats.pending + stats.confirmed}</p>
            </div>
            <div className="bg-fergbutcher-blue-100 p-3 rounded-full">
              <ShoppingCart className="h-6 w-6 text-fergbutcher-blue-600" />
            </div>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-fergbutcher-brown-600 text-sm font-medium">Today's Collections</p>
              <p className="text-2xl font-bold text-fergbutcher-black-900">{stats.todaysTotal}</p>
            </div>
            <div className="bg-fergbutcher-brown-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-fergbutcher-brown-600" />
            </div>
          </div>
        </div>
      </div>

      {/* This Week's Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-fergbutcher-brown-200">
        <div className="px-6 py-4 border-b border-fergbutcher-brown-200">
          <h2 className="text-lg font-semibold text-fergbutcher-black-900">This Week's Orders</h2>
        </div>
        <div className="p-6">
          {thisWeekOrders.length > 0 ? (
            <div className="space-y-4">
              {thisWeekOrders.map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                const customerName = customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
                const isChristmas = isChristmasOrder(order);
                
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-fergbutcher-green-50 rounded-lg border border-fergbutcher-brown-200">
                    <div className="flex items-center space-x-4">
                      <div className="bg-fergbutcher-green-100 p-2 rounded-full">
                        <Users className="h-4 w-4 text-fergbutcher-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-fergbutcher-black-900">
                            Order #{order.id} - {customerName}
                          </h3>
                          {isChristmas && (
                            <div className="flex items-center space-x-1">
                              <Gift className="h-4 w-4 text-red-600" />
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border border-red-200">
                                Christmas
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-fergbutcher-brown-600">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''} • Collection: {new Date(order.collectionDate).toLocaleDateString('en-NZ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-fergbutcher-brown-300 mx-auto mb-4" />
              <p className="text-fergbutcher-brown-500">No orders this week</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;