import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, Check } from 'lucide-react';
import notificationService from '../../services/notificationService';
import adminService from '../../services/adminService';
import managerService from '../../services/managerService';
import { useAuth } from '../../context/AuthContext';
import { CACHE_TIMES } from '../../lib/queryConfig';

export default function NotificationCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const dropdownRef = useRef(null);

  const notifKey = ['notifications', user?.id];
  const { data: notifications = [] } = useQuery({
    queryKey: notifKey,
    queryFn: () => notificationService.getNotifications(user.id),
    enabled: !!user?.id,
    refetchInterval: 30_000, // notifications benefit from feeling live
    ...CACHE_TIMES.REALTIME
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markOneRead = async (notifId) => {
    try {
      await notificationService.markSingleRead(user.id, notifId);
      queryClient.setQueryData(notifKey, (prev = []) => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead(user.id);
      queryClient.setQueryData(notifKey, (prev = []) => prev.map(n => ({ ...n, is_read: true })));
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

  const handleAction = async (notif, approve) => {
    try {
      const adminId = user.id;
      if (notif.reference_type === 'farmer') {
        await managerService.approveFarmer(notif.reference_id, approve ? 'active' : 'rejected', null, adminId);
      } else if (notif.reference_type === 'bank_request') {
        await managerService.reviewBankRequest(notif.reference_id, approve ? 'approved' : 'rejected', null, adminId);
      } else if (notif.reference_type === 'booking_slot') {
        await managerService.updateBookingStatus(notif.reference_id, approve ? 'confirmed' : 'cancelled', null, user.name, adminId);
      } else if (notif.reference_type === 'seed_purchase') {
        await adminService.updateSeedPurchaseStatus(notif.reference_id, approve ? 'paid' : 'failed', adminId);
      }

      // Mark this specific notification as read
      await markOneRead(notif.id);
      queryClient.invalidateQueries({ queryKey: notifKey });
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
      markOneRead(notif.id);
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
                  onClick={() => handleAction(selectedNotif, true)}
                  className="btn-primary flex-1"
                >
                  Approve / Confirm
                </button>
                <button
                  onClick={() => handleAction(selectedNotif, false)}
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
