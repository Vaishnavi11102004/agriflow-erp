import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Check } from 'lucide-react';
import api from '../../services/api/axios';
import { useAuth } from '../../context/AuthContext';

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      // both /api/farmer/notifications and /api/admin/notifications exist depending on role
      const endpoint = user.role === 'farmer' ? '/farmer/notifications' : '/admin/notifications';
      const res = await api.get(endpoint);
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      const endpoint = user.role === 'farmer' ? '/farmer/notifications/read' : '/admin/notifications/read';
      await api.patch(endpoint);
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-agro-success" size={18} />;
      case 'warning': return <AlertTriangle className="text-agro-warning" size={18} />;
      case 'error': return <XCircle className="text-agro-error" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  const handleAction = async (notif, status) => {
    try {
      if (notif.reference_type === 'farmer') {
        await api.patch(`/admin/farmers/${notif.reference_id}/approve`, { status });
      } else if (notif.reference_type === 'bank_request') {
        await api.patch(`/admin/bank-requests/${notif.reference_id}`, { status });
      } else if (notif.reference_type === 'booking_slot') {
        await api.patch(`/admin/booking-slots/${notif.reference_id}`, { status });
      } else if (notif.reference_type === 'seed_purchase') {
        await api.patch(`/admin/seed-purchases/${notif.reference_id}`, { status });
      }
      
      // Mark this specific notification as read so it doesn't prompt again
      await api.patch(`/admin/notifications/read`); // Simplified, usually you'd read a specific one, but for now we can just refresh
      fetchNotifications();
      if (selectedNotif && selectedNotif.id === notif.id) {
        setSelectedNotif(null);
      }
    } catch (err) {
      console.error('Failed to process action', err);
    }
  };

  const handleNotifClick = async (notif) => {
    setSelectedNotif(notif);
    setIsOpen(false);
    if (!notif.is_read) {
      // Opt: mark this single notification as read if there was an endpoint, but we'll leave it 
      // or we can mark all read. For now, just opening the modal is fine.
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-agro-error text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-xs font-medium text-agro-primary hover:text-primary-700 flex items-center gap-1"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center">
                <Bell size={32} className="text-gray-300 mb-2" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.is_read ? 'bg-blue-50/30' : ''}`} onClick={() => handleNotifClick(notif)}>
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2">
                          {notif.created_at
                            ? new Date(notif.created_at).toLocaleString('en-IN', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })
                            : ''}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 text-center border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-400">Updates every 30 seconds</p>
          </div>
        </div>
      )}

      {selectedNotif && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedNotif(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-start justify-between">
              <div className="flex gap-3">
                <div className="mt-1">{getIcon(selectedNotif.type)}</div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedNotif.title}</h3>
                   <p className="text-xs text-gray-500 mt-1">
                    {selectedNotif.created_at
                      ? new Date(selectedNotif.created_at).toLocaleString('en-IN', {
                          month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })
                      : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedNotif(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{selectedNotif.message}</p>
            </div>
            
            {(user?.role === 'super_admin' || (user?.role === 'manager' && selectedNotif.reference_type !== 'bank_request')) && 
             selectedNotif.reference_type && selectedNotif.reference_id && !selectedNotif.is_read && (
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => handleAction(selectedNotif, selectedNotif.reference_type === 'farmer' ? 'active' : selectedNotif.reference_type === 'booking_slot' ? 'confirmed' : 'approved')}
                  className="btn-primary flex-1"
                >
                  Approve / Confirm
                </button>
                <button 
                  onClick={() => handleAction(selectedNotif, selectedNotif.reference_type === 'booking_slot' ? 'cancelled' : 'rejected')}
                  className="btn-danger flex-1"
                >
                  Reject / Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
