import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface FeeRecord {
  name: string;
  student: string;
  student_name: string;
  student_group?: string;
  program?: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';
  academic_term?: string;
  fee_components?: any[];
  payments?: any[];
  creation?: string;
  modified?: string;
}

export interface FeeWithStudent extends FeeRecord {
  paid_percent: number;
  days_overdue?: number;
}

export function useAcadFees(autoRefreshInterval = 30000) {
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total_outstanding: 0,
    total_overdue: 0,
    due_this_month: 0,
    avg_paid_percent: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentFiltersRef = useRef<any>({});

  const fetchFees = useCallback(async (filters: any = {}) => {
    setLoading(true);
    setError(null);
    currentFiltersRef.current = filters;

    try {
      const [listRes, summaryRes] = await Promise.all([
        api.getFeesList(filters),
        api.getFeeSummary(filters),
      ]);

      if (!listRes.ok) throw new Error(listRes.error || 'Failed to fetch fees');
      
      setFeeRecords(listRes.data || []);
      if (summaryRes.ok) {
        setSummary(summaryRes.data);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      const msg = err.message || 'Failed to load fees data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFees();
    if (autoRefreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchFees(currentFiltersRef.current);
      }, autoRefreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFees, autoRefreshInterval]);

  const getFeeDetail = useCallback(async (feeName: string): Promise<any | null> => {
    try {
      const res = await api.getFeeDetail(feeName);
      if (res.ok) return res.data;
      toast.error(res.error || 'Failed to load fee detail');
      return null;
    } catch (err) {
      toast.error('Error loading fee details');
      return null;
    }
  }, []);

  const enrichedFees = useMemo((): FeeWithStudent[] => {
    const today = new Date();
    return feeRecords.map(fee => ({
      ...fee,
      paid_percent: fee.total_amount ? Math.round((fee.paid_amount / fee.total_amount) * 100) : 0,
      days_overdue: fee.status === 'Overdue' && fee.due_date
        ? Math.max(0, Math.floor((today.getTime() - new Date(fee.due_date).getTime()) / 86400000))
        : 0,
    }));
  }, [feeRecords]);

  const exportToExcel = useCallback((records: FeeRecord[], filename?: string) => {
    const sheetData = records.map(r => ({
      'Student Name': r.student_name,
      'Student ID': r.student,
      'Group': r.student_group || '',
      'Program': r.program || '',
      'Due Date': r.due_date,
      'Total Amount': r.total_amount,
      'Paid Amount': r.paid_amount,
      'Outstanding': r.outstanding_amount,
      'Status': r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fees');
    XLSX.writeFile(wb, filename || `fees_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.xlsx`);
    toast.success('Excel exported');
  }, []);

  const exportToPDF = useCallback((records: FeeRecord[], filename?: string) => {
    const doc = new jsPDF('landscape');
    doc.text('Academic Fees Report', 14, 10);
    autoTable(doc, {
      head: [['Student', 'ID', 'Group', 'Due Date', 'Total', 'Paid', 'Outstanding', 'Status']],
      body: records.map(r => [
        r.student_name,
        r.student,
        r.student_group || '',
        r.due_date,
        r.total_amount,
        r.paid_amount,
        r.outstanding_amount,
        r.status,
      ]),
      startY: 20,
    });
    doc.save(filename || `fees_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.pdf`);
    toast.success('PDF exported');
  }, []);

  return {
    feeRecords: enrichedFees,
    rawFees: feeRecords,
    loading,
    error,
    summary,
    lastUpdated,
    fetchFees,
    getFeeDetail,
    exportToExcel,
    exportToPDF,
  };
}