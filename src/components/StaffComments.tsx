import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, User, Clock } from 'lucide-react';
import { useStaffNotes } from '../hooks/useStaffNotes';

interface StaffCommentsProps {
  orderId: string;
}

const StaffComments: React.FC<StaffCommentsProps> = ({ orderId }) => {
  const { getNotesForOrder, addStaffNote, deleteStaffNote, loading, error } = useStaffNotes();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [staffName, setStaffName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderNotes = getNotesForOrder(orderId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !staffName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = addStaffNote(orderId, staffName, newComment);
      if (success) {
        setNewComment('');
        setStaffName('');
        setShowAddForm(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteStaffNote(noteId);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="text-fergbutcher-brown-600">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-fergbutcher-black-900 flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-fergbutcher-green-600" />
          <span>Staff Comments ({orderNotes.length})</span>
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-fergbutcher-green-600 text-white px-3 py-1 rounded-lg hover:bg-fergbutcher-green-700 transition-colors flex items-center space-x-1 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Comment</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Add Comment Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-fergbutcher-green-50 border border-fergbutcher-green-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fergbutcher-brown-700 mb-1">
              Comment
            </label>
            <textarea
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment for other staff members..."
              className="w-full px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent text-sm"
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
                setStaffName('');
              }}
              className="px-3 py-1 text-fergbutcher-brown-700 bg-fergbutcher-brown-100 rounded-lg hover:bg-fergbutcher-brown-200 transition-colors text-sm"
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

      {/* Comments List */}
      <div className="space-y-3">
        {orderNotes.length > 0 ? (
          orderNotes.map((note) => (
            <div key={note.id} className="bg-white border border-fergbutcher-brown-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="bg-fergbutcher-brown-100 p-1 rounded-full">
                    <User className="h-4 w-4 text-fergbutcher-brown-600" />
                  </div>
                  <span className="font-medium text-fergbutcher-black-900 text-sm">{note.staffName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-xs text-fergbutcher-brown-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(note.timestamp).toLocaleDateString('en-NZ', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-fergbutcher-brown-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                    title="Delete Comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-fergbutcher-brown-700 text-sm leading-relaxed">{note.content}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-fergbutcher-brown-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-fergbutcher-brown-300" />
            <p className="text-sm">No staff comments yet</p>
            <p className="text-xs">Add the first comment to help your team</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffComments;