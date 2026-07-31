import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  User,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useStaffNotes } from '../hooks/useStaffNotes';
import { emailLog, EmailLogEntry } from '../services/emailService';

interface OrderTimelineProps {
  order: {
    id: string;
    createdAt: string;
    updatedAt: string;
    status: string;
  };
}

interface TimelineEntry {
  id: string;
  kind: 'system' | 'comment' | 'email';
  timestamp: string;
  actor: string;
  message: string;
  emailStatus?: 'sent' | 'failed';
  deletable?: boolean;
  onDelete?: () => void;
}

const TEMPLATE_LABELS: Record<string, string> = {
  'order-received': 'Order Received',
  'order-confirmed': 'Order Confirmed',
  'collection-reminder': 'Collection Reminder',
  'test-email': 'Test Email',
};

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const OrderTimeline: React.FC<OrderTimelineProps> = ({ order }) => {
  const { getNotesForOrder, addStaffNote, deleteStaffNote } = useStaffNotes();
  const [emailEntries, setEmailEntries] = useState<EmailLogEntry[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [staffName, setStaffName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingEmails(true);
    emailLog
      .getForOrder(order.id)
      .then((entries) => {
        if (!cancelled) setEmailEntries(entries);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingEmails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  const orderNotes = getNotesForOrder(order.id);

  const entries: TimelineEntry[] = React.useMemo(() => {
    const list: TimelineEntry[] = [];

    list.push({
      id: `created-${order.id}`,
      kind: 'system',
      timestamp: order.createdAt,
      actor: 'System',
      message: 'Order created',
    });

    if (order.updatedAt && order.updatedAt !== order.createdAt) {
      list.push({
        id: `updated-${order.id}`,
        kind: 'system',
        timestamp: order.updatedAt,
        actor: 'System',
        message: 'Order last updated',
      });
    }

    orderNotes.forEach((note) => {
      list.push({
        id: note.id,
        kind: 'comment',
        timestamp: note.timestamp,
        actor: note.staffName,
        message: note.content,
        deletable: true,
        onDelete: () => deleteStaffNote(note.id),
      });
    });

    emailEntries.forEach((e) => {
      const label = TEMPLATE_LABELS[e.template_id] || e.template_id;
      const recipient = e.recipient || 'customer';
      list.push({
        id: `email-${e.id}`,
        kind: 'email',
        timestamp: e.created_at,
        actor: e.sent_by === 'scheduled-job' ? 'Auto' : e.sent_by || 'Staff',
        message: `${label} email sent to ${recipient}`,
        emailStatus: e.status,
      });
    });

    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [order, orderNotes, emailEntries, deleteStaffNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !staffName.trim()) return;
    setIsSubmitting(true);
    try {
      const note = addStaffNote(order.id, staffName, newComment);
      if (note) {
        setNewComment('');
        setShowAddForm(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-fergbutcher-black-900 flex items-center space-x-2">
          <Clock className="h-5 w-5 text-fergbutcher-green-600" />
          <span>Order Timeline ({entries.length})</span>
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-fergbutcher-green-600 text-white px-3 py-1 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-1 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Comment</span>
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-fergbutcher-gold-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent text-sm"
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fergbutcher-gold-700 mb-1">
              Comment
            </label>
            <textarea
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment for other staff members..."
              className="w-full px-3 py-2 border border-fergbutcher-gold-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-600 focus:border-transparent text-sm"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewComment('');
              }}
              className="px-3 py-1 text-fergbutcher-gold-700 bg-fergbutcher-gold-100 rounded-lg hover:bg-fergbutcher-gold-200 transition-colors text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-fergbutcher-green-600 text-white rounded-lg hover:bg-fergbutcher-green-700 transition-colors disabled:opacity-50 text-sm"
              disabled={isSubmitting || !newComment.trim() || !staffName.trim()}
            >
              {isSubmitting ? 'Adding...' : 'Add Comment'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-fergbutcher-gold-300 rounded-lg p-4 flex items-start space-x-3"
            >
              <div className="flex-shrink-0">
                {entry.kind === 'comment' ? (
                  <div className="bg-fergbutcher-gold-100 p-2 rounded-full">
                    <MessageSquare className="h-4 w-4 text-fergbutcher-gold-700" />
                  </div>
                ) : entry.kind === 'email' ? (
                  <div className="bg-fergbutcher-green-100 p-2 rounded-full">
                    <Mail className="h-4 w-4 text-fergbutcher-green-600" />
                  </div>
                ) : (
                  <div className="bg-fergbutcher-green-100 p-2 rounded-full">
                    <Package className="h-4 w-4 text-fergbutcher-green-600" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-fergbutcher-black-900 text-sm">
                      {entry.actor}
                    </span>
                    {entry.emailStatus && (
                      <span
                        className={`inline-flex items-center space-x-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          entry.emailStatus === 'sent'
                            ? 'bg-fergbutcher-green-100 text-fergbutcher-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {entry.emailStatus === 'sent' ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        <span>{entry.emailStatus === 'sent' ? 'Sent' : 'Failed'}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-xs text-fergbutcher-green-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    {entry.deletable && entry.onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this comment?')) entry.onDelete?.();
                        }}
                        className="p-1 text-fergbutcher-gold-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-fergbutcher-gold-700 text-sm leading-relaxed">
                  {entry.message}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-fergbutcher-green-400">
            <Clock className="h-8 w-8 mx-auto mb-2 text-fergbutcher-gold-300" />
            <p className="text-sm">No timeline entries yet</p>
          </div>
        )}
        {loadingEmails && (
          <div className="flex items-center justify-center py-2 text-fergbutcher-green-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading email history...
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTimeline;
