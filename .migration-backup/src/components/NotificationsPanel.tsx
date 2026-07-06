import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase, Notification } from '../lib/supabase';
import { formatRelativeTime } from '../lib/utils';
import { Bell, Check, Trash2, X, Loader } from 'lucide-react';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open, user]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-4 top-16 z-50 w-96 max-h-[70vh] card flex flex-col animate-slide-in-right shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-surface-300">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell size={18} /> Notifications
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={markAllRead} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Mark all read</button>
            <button onClick={onClose} className="btn-ghost p-1"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-primary-500" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Bell size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-surface-200">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-surface-100 group ${!n.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-surface-200 rounded" title="Mark read">
                        <Check size={13} className="text-success-500" />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(n.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-surface-200 rounded" title="Delete">
                      <Trash2 size={13} className="text-error-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
