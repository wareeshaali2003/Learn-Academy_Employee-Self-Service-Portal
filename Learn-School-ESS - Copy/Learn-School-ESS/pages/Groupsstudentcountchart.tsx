// components/GroupsStudentCountChart.tsx

import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { School } from "lucide-react";

import { useStudentGroups } from "../hooks/Usestudents";
import { Skeleton }            from "../components/Shared";

interface Props {
  /** Kitne top groups chart mein dikhane hain (default 10) */
  topN?: number;
}

const BAR_COLOR = "#16a34a"; // green-600, project ke theme se match

export const GroupsStudentCountChart: React.FC<Props> = ({ topN = 10 }) => {
  // Dashboard scope -> useStudentGroups koi instructor resolve nahi karta,
  // isliye sab groups aayenge (chahe admin khud logged-in ho ya kuch bhi).
  const { groups, loading, error } = useStudentGroups(undefined);

  const chartData = useMemo(() => {
    return [...groups]
      .sort((a, b) => (b.totalCount ?? 0) - (a.totalCount ?? 0))
      .slice(0, topN)
      .map((g) => ({
        name: g.student_group_name || g.name,
        students: g.totalCount ?? 0,
        active: g.activeCount ?? 0,
      }));
  }, [groups, topN]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
          <School size={20} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-base">Students per Group</h3>
          <p className="text-xs text-gray-400">Top {topN} groups by enrollment</p>
        </div>
      </div>

      {loading ? (
        <Skeleton rows={4} />
      ) : error ? (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {error}</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              interval={0}
              height={60}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name === "students" ? "Total Students" : "Active"]}
            />
            <Bar dataKey="students" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLOR} fillOpacity={1 - i * 0.04} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default GroupsStudentCountChart;