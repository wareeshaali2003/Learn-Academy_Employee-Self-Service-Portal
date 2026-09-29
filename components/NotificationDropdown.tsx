
import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Inbox, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface Notification {
  id: string;
  text: string;
  time: string;
  unread: boolean;
  category: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Fix: Check result.ok before setting state with result.data
 const fetchNotifications = async () => {
  setLoading(true);
  const result = await api.getNotifications();
  if (result.ok) {
    const raw = Array.isArray(result.data) ? result.data : [];
    const mapped: Notification[] = raw.map((item: any) => ({
      id: item.name || item.id || "",
      text: item.subject || item.message || item.content || item.text || "Notification",
      time: item.creation || item.time || "",
      unread: item.read === 0 || item.unread === true || !item.read,
      category: item.document_type || item.category || "System",
    }));
    setNotifications(mapped);
  } else {
    setNotifications([]);
  }
  setLoading(false);
};

  const handleMarkRead = async (id: string) => {
    await api.markRead(id);
    fetchNotifications();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-pop-in origin-top-right">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <Inbox size={16} className="text-primary-green" />
            <h4 className="font-bold text-gray-800 text-sm">Notifications</h4>
          </div>
          <button 
            onClick={fetchNotifications}
            className="text-[10px] font-bold text-primary-green hover:underline flex items-center bg-green-50 px-2 py-1 rounded"
          >
            {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCheck size={12} className="mr-1" />} Refresh
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
             <div className="p-12 text-center text-gray-400">
               <Loader2 className="animate-spin mx-auto mb-2" size={24} />
               <p className="text-xs font-bold uppercase tracking-widest">Checking...</p>
             </div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => handleMarkRead(n.id)}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0 relative ${n.unread ? 'bg-green-50/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">{n.category || 'System'}</span>
                  {n.unread && <span className="w-1.5 h-1.5 bg-primary-green rounded-full"></span>}
                </div>
                <p className={`text-xs leading-relaxed ${n.unread ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                  {n.text}
                </p>
                <span className="text-[10px] text-gray-400 mt-2 block font-medium italic">{n.time}</span>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
              <Bell size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-bold opacity-40">All caught up!</p>
            </div>
          )}
        </div>
        
        <div className="p-3 text-center border-t border-gray-50 bg-gray-50/30">
          <button className="text-xs font-bold text-gray-500 hover:text-primary-green transition-colors w-full py-1">View Archive</button>
        </div>
      </div>
    </>
  );
};