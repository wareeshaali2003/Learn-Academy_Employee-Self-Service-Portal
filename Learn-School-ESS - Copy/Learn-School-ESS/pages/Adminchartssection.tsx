import React from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type {
  DepartmentHeadcount,
  DailyAttendancePoint,
  FeesStatusBreakdown,
} from "../hooks/Useadmin";

// ─── Shared card wrapper ────────────────────────────────────────────────────

function ChartCard({
  title, subtitle, children, className = "",
}: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-xs text-gray-300 font-medium">
      {label}
    </div>
  );
}

const AXIS_STYLE = { fontSize: 10, fill: "#9ca3af", fontWeight: 600 } as const;
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #f3f4f6",
  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  fontSize: 12,
};

// ── Fee status colors — kept visually distinct from one another (no two reds) ──
const FEE_STATUS_COLORS: Record<string, string> = {
  Paid: "#16a34a",            // green
  Unpaid: "#f59e0b",          // amber/orange
  "Partially Paid": "#eab308",// yellow
  Overdue: "#dc2626",         // red
  Unknown: "#9ca3af",         // gray
};

const PIE_FALLBACK_COLORS = ["#16a34a", "#f59e0b", "#3b82f6", "#8b5cf6", "#dc2626", "#06b6d4"];

// ── Department bar colors — cycles through a distinct palette per department ──
const DEPARTMENT_COLORS = ["#3b82f6", "#f59e0b", "#16a34a", "#8b5cf6", "#ec4899", "#06b6d4", "#dc2626"];

// ─── helper: format weekday labels once ─────────────────────────────────────

function formatWithLabel(data: DailyAttendancePoint[]) {
  return data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
  }));
}

// ─── 1a. Employees Attendance Trend ─────────────────────────────────────────

export function EmployeesAttendanceTrendChart({ data }: { data: DailyAttendancePoint[] }) {
  const formatted = formatWithLabel(data);

  return (
    <ChartCard title="Employees Attendance Trend" subtitle="Present headcount — last 7 days">
      {formatted.length === 0 ? (
        <EmptyState label="No attendance data for this period" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
            <Line
              type="monotone"
              dataKey="employeesPresent"
              name="Employees Present"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 1b. Students Attendance Trend ──────────────────────────────────────────

export function StudentsAttendanceTrendChart({ data }: { data: DailyAttendancePoint[] }) {
  const formatted = formatWithLabel(data);

  return (
    <ChartCard title="Students Attendance Trend" subtitle="Present headcount — last 7 days">
      {formatted.length === 0 ? (
        <EmptyState label="No attendance data for this period" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
            <Line
              type="monotone"
              dataKey="studentsPresent"
              name="Students Present"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 2. Employees by Department ─────────────────────────────────────────────

export function DepartmentHeadcountChart({ data }: { data: DepartmentHeadcount[] }) {
  return (
    <ChartCard title="Employees by Department" subtitle="Headcount across departments">
      {data.length === 0 ? (
        <EmptyState label="No department data available" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="department" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.map((entry, i) => (
                <Cell
                  key={entry.department}
                  fill={DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 3. Fees Status Breakdown ────────────────────────────────────────────────

export function FeesStatusChart({ data }: { data: FeesStatusBreakdown[] }) {
  const chartData = data.map(d => ({ ...d }));
  return (
    <ChartCard title="Fees / Invoices by Status" subtitle="Number of invoices per status">
      {data.length === 0 ? (
        <EmptyState label="No fee invoices found" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.status}
                  fill={FEE_STATUS_COLORS[entry.status] ?? PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | undefined, _n, entry: any) => [`${value} invoice(s)`, entry.payload.status]} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 4. Fees Collected vs Outstanding (amount) ──────────────────────────────

export function FeesCollectionChart({
  totalCollected, totalOutstanding,
}: {
  totalCollected: number; totalOutstanding: number;
}) {
  const data = [
    { name: "Collected", amount: totalCollected },
    { name: "Outstanding", amount: totalOutstanding },
  ];
  const hasData = totalCollected + totalOutstanding > 0;

  return (
    <ChartCard title="Fees Collection" subtitle="Amount collected vs outstanding">
      {!hasData ? (
        <EmptyState label="No fee amounts recorded" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={80} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number | undefined) => value !== undefined ? value.toLocaleString() : ''} />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={36}>
              <Cell fill="#16a34a" />
              <Cell fill="#f59e0b" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── Full section: drop this into the Overview tab ──────────────────────────

export function AdminChartsSection({
  weeklyAttendanceTrend,
  departmentHeadcount,
  feesStatusBreakdown,
  totalFeesCollected,
  totalFeesOutstanding,
}: {
  weeklyAttendanceTrend: DailyAttendancePoint[];
  departmentHeadcount: DepartmentHeadcount[];
  feesStatusBreakdown: FeesStatusBreakdown[];
  totalFeesCollected: number;
  totalFeesOutstanding: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Analytics</p>
      <div className="grid lg:grid-cols-2 gap-4">
        <EmployeesAttendanceTrendChart data={weeklyAttendanceTrend} />
        <StudentsAttendanceTrendChart data={weeklyAttendanceTrend} />
        <DepartmentHeadcountChart data={departmentHeadcount} />
        <div className="grid sm:grid-cols-2 gap-4">
          <FeesStatusChart data={feesStatusBreakdown} />
          <FeesCollectionChart totalCollected={totalFeesCollected} totalOutstanding={totalFeesOutstanding} />
        </div>
      </div>
    </div>
  );
}