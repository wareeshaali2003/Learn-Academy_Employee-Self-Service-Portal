
import React, { useState } from 'react';
import { X, Send, Calendar, Info } from 'lucide-react';

interface LeaveApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}


export const LeaveApplicationModal: React.FC<LeaveApplicationModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ leaveType, startDate, endDate, reason });
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-pop-in">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <Calendar className="mr-2 text-primary-green" size={20} />
            Apply for Leave
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
          {/* Leave Type */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Leave Category</label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green transition-all"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <option value="Casual">Casual Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Privilege">Privilege / Earned Leave</option>
              <option value="Maternity/Paternity">Parental Leave</option>
              <option value="Loss of Pay">Loss of Pay (LWP)</option>
            </select>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Date</label>
              <input 
                type="date" 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">End Date</label>
              <input 
                type="date" 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Reason TextArea */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reason for Absence</label>
            <textarea 
              required
              className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green transition-all"
              placeholder="Briefly explain the purpose of your leave..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3 border border-blue-100">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
              Your application will be routed to your Reporting Manager for first-level approval. Ensure you have adequate balance before applying.
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] bg-primary-green text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:shadow-lg transition-all active:scale-95"
            >
              <Send size={18} />
              <span>Apply Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
