/**
 * #7 — Activity/Chatter Component (Odoo-style)
 *
 * A comment thread + activity scheduler that can be attached to any record.
 * Shows: messages/notes, log entries, scheduled activities.
 *
 * Usage:
 *   <Chatter entityType="order" entityId={orderId} />
 *   <Chatter entityType="purchase_order" entityId={poId} />
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  entityType: string; // 'order' | 'purchase_order' | 'requisition' | etc.
  entityId: number;
}

interface Comment {
  id: number;
  message: string;
  isInternal: boolean;
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
}

export default function Chatter({ entityType, entityId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(true);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['chatter', entityType, entityId],
    queryFn: () => api.get(`/audit`, { params: { entity: entityType, entityId, limit: 50 } }).then(r => r.data.data),
    enabled: !!entityId,
  });

  const postMut = useMutation({
    mutationFn: () => api.post('/audit', {
      action: isInternal ? 'NOTE' : 'COMMENT',
      entity: entityType,
      entityId: String(entityId),
      newValues: { message, isInternal },
    }),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['chatter', entityType, entityId] });
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          💬 {t('chatter.title', 'Notes & Activity')}
        </h3>
      </div>

      {/* Comment input */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isInternal ? 'Log an internal note...' : 'Send a message...'}
              rows={2}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsInternal(true)}
                  className={`px-2 py-1 rounded text-xs font-medium ${isInternal ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  📝 Internal Note
                </button>
                <button
                  onClick={() => setIsInternal(false)}
                  className={`px-2 py-1 rounded text-xs font-medium ${!isInternal ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  💬 Comment
                </button>
              </div>
              <button
                onClick={() => postMut.mutate()}
                disabled={!message.trim() || postMut.isPending}
                className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
              >
                {postMut.isPending ? '...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
        {isLoading && <div className="p-4 text-xs text-gray-400 text-center">Loading...</div>}
        {!isLoading && (!comments || comments.length === 0) && (
          <div className="p-4 text-xs text-gray-400 text-center">No notes yet</div>
        )}
        {(comments || []).map((c: any) => (
          <div key={c.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {c.user?.firstName || 'System'} {c.user?.lastName || ''}
              </span>
              <span className="text-[10px] text-gray-400">
                {new Date(c.createdAt).toLocaleString()}
              </span>
              {c.action === 'NOTE' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600">Internal</span>}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {c.newValues?.message || c.action || 'Activity logged'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
