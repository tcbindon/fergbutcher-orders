import React from 'react';
import { Users, Package, Calendar, Gift } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import { useCustomers } from '../hooks/useCustomers';

export default function Dashboard() {
  const { orders } = useOrders();
  const { customers } = useCustomers();

  // Calculate stats
  const totalCustomers = customers.length;
  const activeOrders = orders.filter(order => order.status !== 'completed').length;
  
  // Get today's collections
  const today = new Date().toISOString().split('T')[0];
  const todaysCollections = orders.filter(order => 
    order.collectionDate === today && order.status !== 'completed'
  ).length;

  // Get this week's orders
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const thisWeeksOrders = orders.filter(order => {
    const orderDate = new Date(order.collectionDate);
    return orderDate >= startOfWeek && orderDate <= endOfWeek;
  }).sort((a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime());

  const stats = [
    {
      name: 'Total Customers',
      value: totalCustomers,
      icon: Users,
      color: 'bg-fergbutcher-green-100 text-fergbutcher-green-600 border-fergbutcher-green-200'
    },
    {
      name: 'Active Orders',
      value: activeOrders,
      icon: Package,
      color: 'bg-blue-100 text-blue-600 border-blue-200'
    },
    {
      name: "Today's Collections",
      value: todaysCollections,
      icon: Calendar,
      color: 'bg-fergbutcher-brown-100 text-fergbutcher-brown-600 border-fergbutcher-brown-200'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-fergbutcher-green-100 text-fergbutcher-green-800 border-fergbutcher-green-200';
      case 'ready':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`${stat.color} rounded-xl border p-6 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{stat.name}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <Icon className="h-8 w-8 opacity-75" />
              </div>
            </div>
          );
        })}
      </div>

      {/* This Week's Orders */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-fergbutcher-black-900">This Week's Orders</h2>
        </div>
        <div className="p-6">
          {thisWeeksOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders scheduled for this week</p>
          ) : (
            <div className="space-y-4">
              {thisWeeksOrders.map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                const isChristmasOrder = order.type === 'christmas';
                
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {isChristmasOrder ? (
                          <Gift className="h-5 w-5 text-red-600" />
                        ) : (
                          <span className="text-sm font-medium text-fergbutcher-brown-600">
                            #{order.orderNumber}
                          </span>
                        )}
                        {isChristmasOrder && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            Christmas
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-fergbutcher-black-900">
                          {customer?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-fergbutcher-brown-600">
                          Collection: {formatDate(order.collectionDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <Users className="h-4 w-4 text-fergbutcher-green-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}