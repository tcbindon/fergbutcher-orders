import { useMemo, useState } from 'react';
import { Link2, Package, Calendar, Clock, Sparkles } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { toast } from './Toast';
import Modal from './Modal';
import { Order, Customer } from '../types';

interface UnlinkedOrdersModalProps {
  open: boolean;
  onClose: () => void;
  unlinkedOrders: Order[];
}

const formatDate = (value: string | null) => {
  if (!value) return 'No collection date';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatCreated = (value: string) =>
  new Date(value).toLocaleString('en-NZ', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const customerLabel = (c: Customer) =>
  `${c.firstName} ${c.lastName}${c.phone ? ` — ${c.phone}` : ''}`;

export default function UnlinkedOrdersModal({ open, onClose, unlinkedOrders }: UnlinkedOrdersModalProps) {
  const { customers, orders, updateOrder } = useAppData();
  const [selections, setSelections] = useState<Record<string, string>>({});

  const { likelyMatches, otherCustomers } = useMemo(() => {
    const customerIdsWithOrders = new Set(orders.map(o => o.customerId));
    const newestFirst = [...customers].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return {
      likelyMatches: newestFirst.filter(c => !customerIdsWithOrders.has(c.id)),
      otherCustomers: newestFirst.filter(c => customerIdsWithOrders.has(c.id)),
    };
  }, [customers, orders]);

  const handleLink = (order: Order) => {
    const customerId = selections[order.id];
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    if (updateOrder(order.id, { customerId }, customers)) {
      toast.success(`Order #${order.id} is now linked to ${customer.firstName} ${customer.lastName}.`);
    } else {
      toast.error('That order could not be updated. Please try again.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Orders missing customer details"
      subtitle="Choose the right customer for each order to restore its details."
      maxWidth="max-w-3xl"
    >
      {unlinkedOrders.length === 0 ? (
        <div className="text-center py-10">
          <Link2 className="h-10 w-10 text-fergbutcher-green-600 mx-auto mb-3" />
          <p className="font-semibold text-fergbutcher-black-900">Every order is linked to a customer.</p>
          <p className="text-sm text-fergbutcher-green-400 mt-1">There is nothing left to repair.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {likelyMatches.length > 0 && (
            <div className="flex items-start gap-2 bg-fergbutcher-gold-50 border border-fergbutcher-gold-200 rounded-lg px-4 py-3 text-sm text-fergbutcher-black-900">
              <Sparkles className="h-4 w-4 text-fergbutcher-gold-600 flex-shrink-0 mt-0.5" />
              <span>
                Customers who have no orders yet are listed first. These are most likely the ones that lost their link.
              </span>
            </div>
          )}

          {unlinkedOrders.map(order => (
            <div key={order.id} className="border border-fergbutcher-gold-200 rounded-xl p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm">
                <span className="font-semibold text-fergbutcher-black-900">Order #{order.id}</span>
                <span className="flex items-center gap-1 text-fergbutcher-green-600">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(order.collectionDate)}{order.collectionTime ? ` at ${order.collectionTime}` : ''}
                </span>
                <span className="flex items-center gap-1 text-fergbutcher-gold-700">
                  <Clock className="h-3.5 w-3.5" />
                  Created {formatCreated(order.createdAt)}
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm text-fergbutcher-black-900 mb-4">
                <Package className="h-4 w-4 text-fergbutcher-gold-700 flex-shrink-0 mt-0.5" />
                <span>
                  {order.items.map(item => `${item.description} (${item.quantity} ${item.unit})`).join(', ') || 'No items'}
                </span>
              </div>

              {order.additionalNotes && (
                <p className="text-sm text-fergbutcher-gold-800 bg-fergbutcher-gold-100 rounded-lg px-3 py-2 mb-4">
                  {order.additionalNotes}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selections[order.id] ?? ''}
                  onChange={e => setSelections(prev => ({ ...prev, [order.id]: e.target.value }))}
                  className="flex-1 border border-fergbutcher-gold-300 rounded-lg px-3 py-2 text-sm text-fergbutcher-black-900 bg-white focus:outline-none focus:ring-2 focus:ring-fergbutcher-green-600"
                >
                  <option value="">Choose a customer…</option>
                  {likelyMatches.length > 0 && (
                    <optgroup label="Customers with no orders (most likely)">
                      {likelyMatches.map(c => <option key={c.id} value={c.id}>{customerLabel(c)}</option>)}
                    </optgroup>
                  )}
                  <optgroup label="All other customers">
                    {otherCustomers.map(c => <option key={c.id} value={c.id}>{customerLabel(c)}</option>)}
                  </optgroup>
                </select>
                <button
                  type="button"
                  onClick={() => handleLink(order)}
                  disabled={!selections[order.id]}
                  className="bg-fergbutcher-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors hover:bg-fergbutcher-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Link2 className="h-4 w-4" />
                  Link customer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
