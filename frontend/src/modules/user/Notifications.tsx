import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyNotifications, markAsRead, markAllAsRead, Notification } from '../../services/api/customerNotificationService';
import { useAuth } from '../../context/AuthContext';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await getMyNotifications();
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (err: any) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      if (link) {
        navigate(link);
      }
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  return (
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-green-200 via-green-100 to-white pb-6 pt-12 md:pt-16 px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="text-neutral-900" aria-label="Back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-neutral-900">Notifications</h1>
          <button 
            onClick={handleMarkAllRead}
            className="text-teal-600 text-sm font-semibold hover:text-teal-700"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 -mt-2">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-neutral-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-neutral-500">
            <p>{error}</p>
            <button onClick={fetchNotifications} className="mt-4 text-teal-600 font-bold">Try Again</button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">No notifications yet</h3>
            <p className="text-sm text-neutral-500 mb-8">When you get notifications, they'll appear here.</p>
            <button 
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20 uppercase tracking-wider text-xs"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification._id}
                onClick={() => handleMarkAsRead(notification._id, notification.link)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  notification.isRead 
                    ? 'bg-white border-neutral-100 opacity-75' 
                    : 'bg-green-50 border-green-100 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    notification.isRead ? 'bg-neutral-100' : 'bg-green-100'
                  }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={notification.isRead ? 'text-neutral-500' : 'text-teal-600'}>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-bold truncate ${notification.isRead ? 'text-neutral-700' : 'text-neutral-900'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className={`text-[13px] line-clamp-2 ${notification.isRead ? 'text-neutral-500' : 'text-neutral-600'}`}>
                      {notification.message}
                    </p>
                    {notification.actionLabel && (
                      <span className="inline-block mt-2 text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                        {notification.actionLabel} ›
                      </span>
                    )}
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
