import React, { useState } from 'react';
import { X, Send, AlertCircle, Clock } from 'lucide-react';
import { AttendanceRecord } from '../types';

interface AttendanceRegularizationModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

type ApplicationType = 'Missing Attendance' | 'Casual Leave' | 'Sick Leave';

/**
 * AttendanceRegularizationModal: Handles the business logic for regularizing biometric logs.
 * Includes conditional fields based on the selected application type.
 */
export const AttendanceRegularizationModal: React.FC<AttendanceRegularizationModalProps> = ({ record, onClose, onSubmit }) => {
  const [appType, setAppType] = useState<ApplicationType>('Missing Attendance');
  const [checkIn, setCheckIn] = useState('08:00');
  const [checkOut, setCheckOut] = useState('16:00');
  const [reason, setReason] = useState('');

  if (!record) return null;

  /**
   * Validates and submits the regularization form.
   * Maps fields to ERPNext snake_case parameters.
   */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
      attendance_date: record.date,
      application_type: appType,
      reason: reason,
      ...(appType === 'Missing Attendance' ? { 
        check_in: checkIn, 
        check_out: checkOut 
      } : {})
    };
    onSubmit(submissionData);
    // Reset local state
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with Fade-in animation */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Card with Pop-in animation */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-pop-in">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Attendance Correction</h3>
            <p className="text-xs text-gray-500 font-medium">Record Date: {record.date}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
          {/* Application Type Selection */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Application Type</label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green transition-all cursor-pointer"
              value={appType}
              onChange={(e) => setAppType(e.target.value as ApplicationType)}
            >
              <option value="Missing Attendance">Missing Attendance (Biometric Correction)</option>
              <option value="Casual Leave">Apply for Casual Leave (For this date)</option>
              <option value="Sick Leave">Apply for Sick Leave (For this date)</option>
            </select>
          </div>

          {/* Conditional Time Fields for Missing Attendance */}
          {appType === 'Missing Attendance' && (
            <div className="grid grid-cols-2 gap-4 animate-slide-up">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-In Time</label>
                <div className="relative">
                  <input 
                    type="time" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                  <Clock className="absolute right-4 top-3 text-gray-300 pointer-events-none" size={16} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Check-Out Time</label>
                <div className="relative">
                  <input 
                    type="time" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                  <Clock className="absolute right-4 top-3 text-gray-300 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          )}

          {/* Summary Alert for Leave applications */}
          {appType !== 'Missing Attendance' && (
            <div className="bg-green-50 p-4 rounded-xl flex items-start space-x-3 border border-green-100 animate-slide-up">
              <AlertCircle className="text-primary-green shrink-0 mt-0.5" size={20} />
              <p className="text-xs text-primary-green leading-relaxed">
                You are converting your <strong>{record.status}</strong> status on <strong>{record.date}</strong> to a <strong>{appType}</strong> application.
              </p>
            </div>
          )}
          
          {/* Common Reason Field */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reason / Justification</label>
            <textarea 
              required
              className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-green transition-all"
              placeholder="Provide a detailed explanation for HR review..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex space-x-3 pt-4 border-t border-gray-50">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] bg-primary-green text-white px-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 hover:shadow-lg shadow-green-900/20 active:scale-95 transition-all"
            >
              <Send size={18} />
              <span>Submit for Approval</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};