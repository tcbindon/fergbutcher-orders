import React from 'react';
import { Users, Package, Calendar, TrendingUp } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useOrders } from '../hooks/useOrders';
import { Order } from '../types';

const Dashboard: React.FC = () => {
  const { customers } = useCustomers();
  const { orders } = useOrders();

  // Calculate today's collections
  const today = new Date().toISOString().split('T')[0];
  const todaysCollections = orders.filter(order => 
    order.collectionDate === today && order.status !== 'cancelled'
  ).length;

  // Calculate this week's orders
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const thisWeeksOrders = orders.filter(order => {
    const collectionDate = new Date(order.collectionDate);
    return collectionDate >= startOfWeek && collectionDate <= endOfWeek && order.status !== 'cancelled';
  });

  const stats = [
    {
      name: 'Total Customers',
      value: customers.length.toString(),
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Orders',
      value: orders.filter(order => order.status !== 'cancelled').length.toString(),
      icon: Package,
      color: 'bg-green-500',
    },
    {
      name: "Today's Collections",
      value: todaysCollections.toString(),
      icon: Calendar,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your butcher shop operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt>
              <div className={`absolute rounded-md ${stat.color} p-3`}>
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </dd>
          </div>
        ))}
      </div>

      {/* This Week's Orders */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">This Week's Orders</h3>
          {thisWeeksOrders.length === 0 ? (
            <p className="text-gray-500">No orders scheduled for this week.</p>
          ) : (
            <div className="space-y-3">
              {thisWeeksOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    {order.isChristmasOrder ? (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 text-sm">🎁</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Order #{order.orderNumber} - {order.customerName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Collection: {new Date(order.collectionDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {order.isChristmasOrder && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Christmas
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {thisWeeksOrders.length > 5 && (
                <p className="text-sm text-gray-500 pt-2">
                  And {thisWeeksOrders.length - 5} more orders...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;