// components/AllInvoicesTable.tsx

import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface InvoiceRow {
  name: string;
  title?: string;
  customer_name?: string;
  grand_total?: number;
  paid_amount?: number;
  outstanding_amount?: number;
  posting_date?: string;
  modified?: string;
  docstatus?: number;   // widened — component only displays it, doesn't branch on specific values
  displayStatus: 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
}

interface AllInvoicesTableProps {
  invoices: InvoiceRow[];
  pageSize?: number; // default 25
}

type SortKey = 'grand_total' | 'date';
type SortDir = 'asc' | 'desc';

// ---------- Helpers ----------

function formatCurrency(amount: number | undefined) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

// Row ki "effective" date — posting_date priority, warna modified fallback
function effectiveDate(inv: InvoiceRow): string | undefined {
  return inv.posting_date || inv.modified;
}

// "3 d", "1 M", "4 M" jaisa relative time
function timeAgo(dateString?: string): string {
  if (!dateString) return '—';
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'today';
  if (diffDays < 30) return `${diffDays} d`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} M`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} Y`;
}

// displayStatus -> label + badge color
const STATUS_META: Record<InvoiceRow['displayStatus'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  unpaid: { label: 'Unpaid', className: 'bg-orange-100 text-orange-600' },
  partially_paid: { label: 'Partially Paid', className: 'bg-amber-100 text-amber-600' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-600' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-200 text-gray-500 line-through' },
};

function StatusBadge({ status }: { status: InvoiceRow['displayStatus'] }) {
  const meta = STATUS_META[status] ?? STATUS_META.unpaid;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const STATUS_FILTERS: Array<'All' | InvoiceRow['displayStatus']> = [
  'All', 'draft', 'unpaid', 'partially_paid', 'paid', 'cancelled',
];

function SortHeader({
  label, active, dir, onClick,
}: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 hover:text-gray-600 ${active ? 'text-gray-700 font-medium' : ''}`}
    >
      {label}
      <ArrowUpDown size={12} className={active ? 'opacity-100' : 'opacity-30'} />
      {active && <span className="sr-only">{dir === 'asc' ? 'ascending' : 'descending'}</span>}
    </button>
  );
}

// ---------- Main Component ----------

export default function AllInvoicesTable({ invoices, pageSize = 25 }: AllInvoicesTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceRow['displayStatus']>('All');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const rows = invoices.filter((inv) => {
      const label = inv.title || inv.customer_name || inv.name || '';
      const matchesSearch =
        !search ||
        label.toLowerCase().includes(search.toLowerCase()) ||
        inv.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || inv.displayStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'grand_total') {
        cmp = (a.grand_total ?? 0) - (b.grand_total ?? 0);
      } else {
        const aDate = effectiveDate(a) ?? '';
        const bDate = effectiveDate(b) ?? '';
        cmp = aDate.localeCompare(bDate);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [invoices, search, statusFilter, sortKey, sortDir]);

  // Reset to page 1 whenever filters/sort change the result set
  useMemo(() => { setPage(1); }, [search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-sm font-medium text-gray-700">
          All Invoices <span className="text-gray-400 font-normal">({filtered.length} of {invoices.length})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or invoice ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | InvoiceRow['displayStatus'])}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All' : STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">
                <SortHeader
                  label="Grand Total"
                  active={sortKey === 'grand_total'}
                  dir={sortDir}
                  onClick={() => toggleSort('grand_total')}
                />
              </th>
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4 text-right">
                <div className="flex justify-end">
                  <SortHeader
                    label="Posted"
                    active={sortKey === 'date'}
                    dir={sortDir}
                    onClick={() => toggleSort('date')}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Koi invoice nahi mili is filter ke liye.
                </td>
              </tr>
            ) : (
              paged.map((inv) => (
                <tr key={inv.name} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-800">
                    {inv.title || inv.customer_name || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={inv.displayStatus} />
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {formatCurrency(inv.grand_total)}
                    {inv.displayStatus === 'partially_paid' && (inv.outstanding_amount ?? 0) > 0 && (
                      <span className="block text-xs text-amber-500">
                        {formatCurrency(inv.outstanding_amount)} due
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 font-mono text-xs">{inv.name}</td>
                  <td className="py-3 pr-4 text-right text-gray-400 text-xs">
                    {timeAgo(effectiveDate(inv))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}