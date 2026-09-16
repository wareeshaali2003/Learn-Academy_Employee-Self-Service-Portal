import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Banknote, TrendingUp, TrendingDown, CircleDollarSign, FileClock, Ban,
  ArrowLeft, RefreshCw,
} from 'lucide-react';
import { useRevenueStats } from '../hooks/Userevenuestats';
import AllInvoicesTable from '../components/Allinvoicestable';

// ---------- Helper: date range presets ----------

function getDefaultDateRange() {
  const today = new Date();
  const toDate = today.toISOString().split('T')[0];
  const from = new Date(today);
  from.setMonth(from.getMonth() - 12);
  const fromDate = from.toISOString().split('T')[0];
  return { fromDate, toDate };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------- KPI Card ----------

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | null;
  accent: string;
}

function KpiCard({ label, value, icon, trend, accent }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs mt-2 ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend === 'up' ? 'Improving' : 'Declining'}
          </span>
        )}
      </div>
      <div className={`p-3 rounded-xl bg-gray-50 ${accent}`}>
        {icon}
      </div>
    </div>
  );
}

// ---------- Page Header ----------

interface RevenuePageHeaderProps {
  onBack: () => void;
  onRefresh: () => void;
  loading: boolean;
  fromDate: string;
  toDate: string;
  totalRevenue?: number;
  collectionRate?: number;
}

function RevenuePageHeader({
  onBack, onRefresh, loading, fromDate, toDate, totalRevenue, collectionRate,
}: RevenuePageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:border-green-400 hover:text-green-600"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="w-11 h-11 shrink-0 rounded-xl bg-green-100 flex items-center justify-center">
          <TrendingUp size={21} className="text-green-600" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">
            Finance
          </p>
          <h1 className="text-xl font-black text-gray-900 leading-tight">Total Revenue</h1>
          <p className="text-xs font-medium text-gray-400 mt-0.5">
            {loading
              ? 'Loading revenue data…'
              : `${fromDate} — ${toDate}${totalRevenue !== undefined ? ` · ${formatCurrency(totalRevenue)} total` : ''}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!loading && collectionRate !== undefined && (
          <span
            className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex ${
              collectionRate >= 75
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : collectionRate >= 40
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {collectionRate.toFixed(1)}% collected
          </span>
        )}

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 rounded-xl text-sm font-bold transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  );
}

// ---------- Main Page ----------

interface AdminRevenuePageProps {
  onBack?: () => void;
}

export default function AdminRevenuePage({ onBack }: AdminRevenuePageProps = {}) {
  const [{ fromDate, toDate }] = useState(getDefaultDateRange());
  const { data, loading, error, refetch } = useRevenueStats({ fromDate, toDate });

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const collectionRateDisplay = useMemo(
    () => (data ? `${data.collectionRate.toFixed(1)}%` : '—'),
    [data]
  );

  return (
    <div className="space-y-6 p-6">
      <RevenuePageHeader
        onBack={handleBack}
        onRefresh={refetch}
        loading={loading}
        fromDate={fromDate}
        toDate={toDate}
        totalRevenue={data?.totalRevenue}
        collectionRate={data?.collectionRate}
      />

      {loading && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Loading revenue data...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-red-500">⚠️ {error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI Cards — row 1: core revenue numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              icon={<Banknote size={20} />}
              accent="text-blue-600"
            />
            <KpiCard
              label="Collected"
              value={formatCurrency(data.totalCollected)}
              icon={<CircleDollarSign size={20} />}
              trend="up"
              accent="text-emerald-600"
            />
            <KpiCard
              label="Outstanding"
              value={formatCurrency(data.totalOutstanding)}
              icon={<CircleDollarSign size={20} />}
              trend={data.totalOutstanding > 0 ? 'down' : null}
              accent="text-amber-600"
            />
            <KpiCard
              label="Collection Rate"
              value={collectionRateDisplay}
              icon={<TrendingUp size={20} />}
              accent="text-purple-600"
            />
          </div>

          {/* KPI Cards — row 2: draft & cancelled */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard
              label="Draft Invoices Amount"
              value={formatCurrency(data.totalDraftAmount)}
              icon={<FileClock size={20} />}
              accent="text-gray-500"
            />
            <KpiCard
              label="Cancelled Invoices Amount"
              value={formatCurrency(data.totalCancelledAmount)}
              icon={<Ban size={20} />}
              accent="text-red-500"
            />
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Revenue Trend (Monthly)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number | string | undefined) => value == null ? '—' : formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Invoiced" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="outstanding" name="Outstanding" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Program-wise Paid vs Unpaid vs Cancelled */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Paid vs Unpaid vs Cancelled by Program</h2>
            {data.programWiseBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400">
                Program-wise breakdown available nahi hai — Sales Invoice pe student_group field
                check karein, ya backend method se Student → Fee mapping join karein.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data.programWiseBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="program" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number | string | undefined) => value == null ? '—' : formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="paid" name="Paid" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unpaid" name="Unpaid" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Program-wise Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 overflow-x-auto">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Collection Summary by Program</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="py-2">Program</th>
                  <th className="py-2">Invoices</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Unpaid</th>
                  <th className="py-2">Cancelled</th>
                  <th className="py-2">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {data.programWiseBreakdown.map((p) => {
                  const total = p.paid + p.unpaid;
                  const rate = total > 0 ? (p.paid / total) * 100 : 0;
                  return (
                    <tr key={p.program} className="border-b last:border-0">
                      <td className="py-2 font-medium text-gray-800">{p.program}</td>
                      <td className="py-2 text-gray-600">{p.totalInvoices}</td>
                      <td className="py-2 text-emerald-600">{formatCurrency(p.paid)}</td>
                      <td className="py-2 text-amber-600">{formatCurrency(p.unpaid)}</td>
                      <td className="py-2 text-gray-400">{formatCurrency(p.cancelled)}</td>
                      <td className="py-2 text-gray-600">{rate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* All Invoices — displayStatus already computed by api.getRevenueStats() */}
          <AllInvoicesTable invoices={data.invoices} />
        </>
      )}
    </div>
  );
}